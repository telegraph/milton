import { h, RefObject } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import { saveAs } from "file-saver";
import { MSG_EVENTS, ERRORS, UI_TEXT } from "constants";
import { decodeSvgToString } from "frontend/svgUtils";
import { postMan } from "utils/messages";
import { FrameCollection } from "types";
import { generateEmbedHtml } from "./outputRender";
import { version } from "../../../package.json";

const enum STATUS {
  LOADING,
  READY,
  RENDER,
  ERROR,
}

export const App = function () {
  const clipboardEl = useRef<HTMLTextAreaElement>(null);
  const previewEl = useRef<HTMLDivElement>(null);
  const iframeEl = useRef<HTMLIFrameElement>(null);

  // Setup state
  const [status, setStatus] = useState(STATUS.LOADING);
  const [selectedFrames, setSelectedFrames] = useState<string[]>([]);
  const [renderedFrames, setRenderedFrames] = useState<string[]>([]);
  const [responsive, setResponsive] = useState(true);
  const [headline, setHeadline] = useState("");
  const [subhead, setSubHead] = useState("");
  const [source, setSource] = useState("");
  const [html, setHtml] = useState("");
  const [svgText, setSvgText] = useState("Placeholder");
  const [frames, setFrames] = useState<FrameCollection>({});
  const [needsRender, setNeedsRender] = useState(false);
  const [copied, setCopied] = useState(false);
  const [breakpoint, setBreakpoint] = useState(0);
  const [zoomScale, setZoomScale] = useState(1);
  const [error, setError] = useState<ERRORS | null>(null);
  const [previewSize, setPreviewSize] = useState<[number, number]>([0, 0]);

  // Load frame data from backend
  useEffect(() => {
    postMan
      .send({ workload: MSG_EVENTS.GET_ROOT_FRAMES })
      .then(({ frames, headline, subhead, source }) => {
        // Check for missing frames
        if (!frames || Object.keys(frames).length === 0) {
          setError(ERRORS.MISSING_FRAMES);
          setStatus(STATUS.ERROR);
          return;
        }

        // Check for multiple frames with the same size
        const hasSameWidthFrames = Object.values(frames)
          .map(({ width }) => width)
          .some(
            (width, _i, arr) => arr.filter((val) => val === width).length > 1
          );
        if (hasSameWidthFrames) {
          setError(ERRORS.MULTIPLE_SAME_WIDTH);
          setStatus(STATUS.ERROR);
          return;
        }

        setFrames(frames);
        setHeadline(headline);
        setSubHead(subhead);
        setSource(source);
        setSelectedFrames(Object.keys(frames).sort());
        setStatus(STATUS.RENDER);
      })
      .catch((err) => {
        console.error(err);
        setError(ERRORS.UNKNOWN);
        setStatus(STATUS.ERROR);
      });
  }, []);

  // Listen to preview events
  const [dragEnabled, setDragEnabled] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const [dragOrigin, setDragOrigin] = useState<[number, number]>([0, 0]);
  const [translation, setTrasnlation] = useState<[number, number]>([0, 0]);
  const [prevTrans, setPrevTrans] = useState<[number, number]>([0, 0]);

  useEffect(() => {
    if (dragEnabled) {
      previewEl.current?.addEventListener("mousemove", handleMouseMove);
    }
    window.addEventListener("mousedown", handleMouseClick);
    window.addEventListener("mouseup", handleMouseClick);
    window.addEventListener("wheel", handleZoom);
    window.addEventListener("keydown", handleZoom);
    window.addEventListener("keydown", handlePanStart);
    window.addEventListener("keyup", handlePanEnd);
    return () => {
      previewEl.current?.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseClick);
      window.removeEventListener("mouseup", handleMouseClick);
      window.removeEventListener("wheel", handleZoom);
      window.removeEventListener("keydown", handleZoom);
      window.removeEventListener("keydown", handlePanStart);
      window.removeEventListener("keyup", handlePanEnd);
    };
  }, [
    zoomScale,
    dragEnabled,
    dragOrigin,
    translation,
    prevTrans,
    spacePressed,
  ]);

  const handleMouseClick = (e: MouseEvent) => {
    const { button, type, x, y } = e;

    if (button === 0 && spacePressed && type === "mousedown") {
      setDragEnabled(true);
      // Set new drag origin
      setDragOrigin([x, y]);
    }

    if (button === 0 && dragEnabled && type === "mouseup") {
      setDragEnabled(false);
      setPrevTrans([...translation]);
    }
  };

  const handleZoom = (e: WheelEvent | KeyboardEvent) => {
    const ZOOM_INCREMENT = 0.1;
    const { type, ctrlKey } = e;

    if (ctrlKey === false) return;

    let direction = 1;

    if (type === "wheel") {
      const { deltaY } = e;
      direction = deltaY > 0 ? 1 - ZOOM_INCREMENT : 1 + ZOOM_INCREMENT;
    }

    if (type === "keydown") {
      switch (e.key) {
        case "=":
          direction = 1 + ZOOM_INCREMENT;
          break;
        case "-":
          direction = 1 - ZOOM_INCREMENT;
          break;
        default:
          direction = 1;
      }
    }

    setZoomScale(zoomScale * direction);
  };

  const handlePanStart = (e: KeyboardEvent) =>
    e.code === "Space" && setSpacePressed(true);

  const handlePanEnd = (e: KeyboardEvent) => {
    if (e.code === "Space") {
      // Store translation info
      setPrevTrans([...translation]);
      // Stop panning
      setSpacePressed(false);
      setDragEnabled(false);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (dragEnabled === false) return;

    console.log(e);

    const { x, y } = e;
    const translateX = prevTrans[0] + (x - dragOrigin[0]) / zoomScale;
    const translateY = prevTrans[1] + (y - dragOrigin[1]) / zoomScale;
    setTrasnlation([translateX, translateY]);
  };

  // Store headings on Figma page when headings change
  useEffect(() => {
    postMan.send({
      workload: MSG_EVENTS.UPDATE_HEADLINES,
      data: { headline, subhead, source },
    });
  }, [headline, subhead, source]);

  // Generate HTML when headings, SVG or responsive flag changes
  useEffect(() => {
    const framesOut = Object.values(frames).filter(({ id }) =>
      renderedFrames.includes(id)
    );

    const html = generateEmbedHtml({
      frames: framesOut,
      svgText,
      headline,
      subhead,
      source,
      responsive,
    });

    setHtml(html);
    setStatus(STATUS.READY);
  }, [headline, subhead, source, svgText, responsive]);

  // Update preview iframe based on new HTML content
  useEffect(() => {
    if (!html) return;

    const { width = 320, height = 240 } = breakPoints[breakpoint] ?? {};
    const scrollHeight =
      iframeEl?.current?.contentWindow?.document?.body?.scrollHeight || 0;

    console.log(scrollHeight, height);

    if (height && width) {
      setPreviewSize([width, scrollHeight]);
    }

    iframeEl.current?.contentWindow?.addEventListener(
      "resize",
      handleIframeResize
    );

    iframeEl.current?.contentWindow?.document.addEventListener(
      "readystatechange",
      handleIframeResize
    );

    return () => {
      iframeEl.current?.contentWindow?.document.removeEventListener(
        "readystatechange",
        handleIframeResize
      );
      iframeEl.current?.contentWindow?.removeEventListener(
        "resize",
        handleIframeResize
      );
    };
  }, [html, breakpoint]);

  const handleIframeResize = (e) => {
    console.log("readystatechange / resize", e);
    const { readyState, body } =
      iframeEl?.current?.contentWindow?.document || {};

    if (readyState === "complete" && body) {
      const { scrollHeight, offsetWidth } = body;
      // const { width = 320 } = breakPoints[breakpoint] ?? {};
      setPreviewSize([offsetWidth, scrollHeight]);
    }
  };

  // Render SVG and store output when Status changes to Render
  useEffect(() => {
    if (status === STATUS.RENDER) {
      const getAndStoreSvgHtml = async () => {
        const { svgData, imageNodeDimensions } = await postMan.send({
          workload: MSG_EVENTS.RENDER,
          data: selectedFrames,
        });

        const svgText = await decodeSvgToString(svgData, imageNodeDimensions);
        setSvgText(svgText);
        setRenderedFrames(selectedFrames);
        setNeedsRender(false);
      };

      getAndStoreSvgHtml();
    }
  }, [status]);

  // Reset zoom and translation on breakpoint and rendered frame changes
  useEffect(() => {
    const { width } = previewEl.current.getBoundingClientRect();

    const maxWidth = Object.values(frames)
      .filter(({ id }) => renderedFrames.includes(id))
      .reduce((acc, { width }) => (acc > width ? acc : width), 1);

    const zoomScale = width / maxWidth;

    setZoomScale(zoomScale > 1 ? 1 : zoomScale);
    setTrasnlation([0, 0]);
    setPrevTrans([0, 0]);
  }, [breakpoint, renderedFrames]);

  // Toggle frames between selected states
  const toggleSelected = (id: string): void => {
    let frameIds: string[] = selectedFrames.includes(id)
      ? selectedFrames.filter((val) => val !== id)
      : [...selectedFrames, id];

    frameIds = frameIds.sort();
    setSelectedFrames(frameIds);

    const diffreentFrames = frameIds.join() !== renderedFrames.join();
    setNeedsRender(diffreentFrames);
  };

  // Output HTML to clipboard
  const copyToClipboard = () => {
    clipboardEl.current?.select();
    document.execCommand("copy");
    setCopied(true);
    setTimeout(() => setCopied(false), 600);
  };

  // Trigger download SVG HTML as a file
  const downloadHtml = () => {
    const fileText = `
    <!doctype html>
    <html>
      <head>
        <base target="_parent">
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>html,body{margin:0;}</style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `;

    const fileName = `figma2html-${new Date()
      .toISOString()
      .replace(/\W/g, "_")}.html`;

    saveAs(new Blob([fileText], { type: "text/html" }), fileName);
  };

  const sizeSortedFrames = Object.values(frames).sort((a, b) =>
    a.width > b.width ? 1 : -1
  );

  const breakPoints = sizeSortedFrames
    .filter(({ id }) => renderedFrames.includes(id))
    .map(({ width, height }) => ({ width, height }));

  return (
    <div class="app">
      <section class="preview">
        <div class="preview__settings">
          <label class="checkbox preview__responsive">
            <input
              type="checkbox"
              checked={responsive}
              onInput={() => setResponsive(!responsive)}
            />
            Responsive
          </label>

          <label class="preview__breakpoints">
            <select
              class="breakpoints"
              onInput={({ currentTarget: { selectedIndex } }) =>
                setBreakpoint(selectedIndex)
              }
            >
              {breakPoints.map(({ width }, i) => (
                <option
                  key={width}
                  class="breakpoints__option"
                  selected={breakpoint === i}
                >
                  {width}px
                </option>
              ))}
            </select>
            Breakpoints
          </label>

          <label class="preview__width">
            Width
            <input
              type="number"
              min="0"
              value={previewSize[0]}
              onInput={(e) => {
                const { value } = e.currentTarget;

                const width = parseInt(value);
                if (width && !isNaN(width)) {
                  setPreviewSize([width, previewSize[1]]);
                }
              }}
            />
            px
          </label>

          <label class="preview__zoom">
            Zoom
            <input
              type="number"
              min="0"
              value={(zoomScale * 100).toFixed(0)}
              onInput={(e) => {
                const { value } = e.currentTarget;

                const zoom = parseInt(value);
                if (zoom && !isNaN(zoom)) {
                  setZoomScale(zoom / 100);
                }
              }}
            />
            %
          </label>
        </div>

        <div
          class={`preview__container ${
            spacePressed ? "preview__container--drag" : ""
          }`}
          ref={previewEl}
        >
          <div
            class="preview__wrapper"
            style={`
              width: ${previewSize[0]}px;
              height: ${previewSize[1]}px;
              transform: scale(${zoomScale}) translate(${translation[0]}px,  ${translation[1]}px);
              position: absolute;
            `}
          >
            <iframe ref={iframeEl} class="preview__iframe" srcDoc={html} />
          </div>

          <div class="preview__help">
            <p>
              <span>Zoom</span> cmd / ctrl and + / -
            </p>
            <p>
              <span>Pan</span> Spacebar and drag
            </p>
          </div>
        </div>

        <p class="footer">Version {version}</p>
      </section>

      <section class="sidebar">
        <fieldset class="selection">
          <legend>Frames</legend>

          <div class="selection_inner">
            {sizeSortedFrames.map(({ name, id, width, height }) => (
              <label key={id} class="selection__item">
                <input
                  class="selection__input"
                  type="checkbox"
                  checked={selectedFrames.includes(id)}
                  onInput={() => toggleSelected(id)}
                />

                <span class="selection__name">{name}</span>

                <span class="selection__width">
                  {Math.round(width)}x{Math.round(height)}
                </span>
              </label>
            ))}
          </div>

          {selectedFrames.length === 0 && (
            <p class="selection__warning">Need to select at least one frame</p>
          )}

          {selectedFrames.length > 0 && needsRender && (
            <p class="selection__warning">Need to re-generate</p>
          )}
        </fieldset>

        <fieldset class="headlines">
          <legend>Headlines</legend>
          <label>
            Headline
            <input
              type="text"
              value={headline}
              onChange={({ currentTarget: { value } }) => setHeadline(value)}
            />
          </label>

          <label>
            Sub headline
            <input
              type="text"
              value={subhead}
              onBlur={({ currentTarget: { value } }) => setSubHead(value)}
            />
          </label>

          <label>
            Source
            <input
              type="text"
              value={source}
              onBlur={({ currentTarget: { value } }) => setSource(value)}
            />
          </label>
        </fieldset>

        <fieldset class="export">
          <legend>
            Export{" "}
            <span class="export__filesize">
              {Math.ceil(svgText.length / 1024)}k
            </span>
          </legend>

          <button
            class="btn export__generate"
            onClick={() => setStatus(STATUS.RENDER)}
            disabled={!needsRender || selectedFrames.length === 0}
          >
            Generate
          </button>

          <button
            class="btn export__copy"
            disabled={needsRender}
            onClick={copyToClipboard}
          >
            {copied ? "Copied!" : "Copy to clipboard"}
          </button>

          <button
            class="btn export__download"
            disabled={needsRender}
            onClick={downloadHtml}
          >
            Download
          </button>

          <textarea class="clipboard" ref={clipboardEl} value={html} />
        </fieldset>
      </section>

      {status === STATUS.ERROR && (
        <div class="error">
          <h2>Error</h2>
          <p>{UI_TEXT.ERRORS[error ?? ERRORS.UNKNOWN]}</p>
        </div>
      )}

      <div
        class="loading"
        data-active={status === STATUS.LOADING || status === STATUS.RENDER}
      >
        Loading...
      </div>
    </div>
  );
};
