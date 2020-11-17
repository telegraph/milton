import { h } from "preact";
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
  const [zoomEnabled, setZoomEnabled] = useState(true);
  const [zoomScale, setZoomScale] = useState(1);
  const [error, setError] = useState<ERRORS | null>(null);

  // Load frame data from backend
  useEffect(() => {
    postMan
      .send({ workload: MSG_EVENTS.GET_ROOT_FRAMES })
      .then(({ frames, headline, subhead, source }) => {
        if (!frames || Object.keys(frames).length === 0) {
          setError(ERRORS.MISSING_FRAMES);
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

  // Set zoom scale
  useEffect(() => {
    if (!previewEl.current) return;
    const PREVIEW_MARGIN = 200;
    const { width } = previewEl.current.getBoundingClientRect();
    const previewWidth = width - PREVIEW_MARGIN;

    const maxWidth = Object.values(frames).reduce(
      (acc, { width }) => (acc > width ? acc : width),
      1
    );

    const zoomScale = previewWidth / maxWidth;
    const zoomEnabled = zoomScale < 1;

    setZoomScale(zoomEnabled ? zoomScale : 1);
    setZoomEnabled(zoomEnabled);
  }, [selectedFrames.join()]);

  // Toggle frames between selected states
  const toggleSelected = (id: string): void => {
    let frames: string[] = selectedFrames.includes(id)
      ? selectedFrames.filter((val) => val !== id)
      : [...selectedFrames, id];

    frames = frames.sort();

    setSelectedFrames(frames);
    setNeedsRender(frames.join() !== renderedFrames.join());
  };

  // Output HTML to clipboard
  const copyToClipboard = () => {
    clipboardEl.current?.select();
    document.execCommand("copy");
    setCopied(true);
    setTimeout(() => setCopied(false), 600);
  };

  // Trigger download SVG HTML as a file
  const downloadHtml = () =>
    saveAs(
      new Blob([html], { type: "text/html" }),
      `figma2html-${Date.now()}.html`
    );

  const sizeSortedFrames = Object.values(frames).sort((a, b) =>
    a.width > b.width ? 1 : -1
  );

  const breakPoints = sizeSortedFrames
    .filter(({ id }) => renderedFrames.includes(id))
    .map(({ width, height }) => ({ width, height }));

  const { width = 320, height = 240 } = breakPoints[breakpoint] ?? {};

  console.log(status);
  return (
    <div class="app">
      <section class="preview">
        <div class="preview__settings">
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

          <label class="checkbox preview__responsive">
            <input
              type="checkbox"
              checked={responsive}
              onInput={() => setResponsive(!responsive)}
            />
            Responsive
          </label>

          <label className="checkbox preview__zoom">
            <input
              type="checkbox"
              checked={zoomEnabled}
              onInput={() => setZoomEnabled(!zoomEnabled)}
            />
            Scale preview to fit ({(zoomScale * 100).toFixed(0)}%)
          </label>
        </div>

        <div class="preview__container" ref={previewEl}>
          <iframe
            class="preview__iframe"
            srcDoc={html}
            style={`width: ${width}px; ${
              zoomEnabled ? `transform: scale(${zoomScale});` : ""
            }`}
          />
        </div>
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
        </fieldset>

        <fieldset class="headlines">
          <legend>Headlines</legend>
          <label>
            Headline
            <input
              type="text"
              value={headline}
              onBlur={({ currentTarget: { value } }) => setHeadline(value)}
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
              {Math.ceil(svgText.length / 1024)}Kb
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

      <footer class="footer">Version {version}</footer>

      {status === STATUS.ERROR && (
        <div class="error">
          <h2>Error</h2>
          <p>{UI_TEXT.ERRORS[error ?? ERRORS.UNKNOWN]}</p>
        </div>
      )}

      {(status === STATUS.LOADING || status === STATUS.RENDER) && (
        <div class="loading">Loading...</div>
      )}
    </div>
  );
};
