import { h } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import { saveAs } from "file-saver";
import { MSG_EVENTS } from "constants";
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

  // Toggle frames between selected states
  const toggleSelected = (id: string): void =>
    setSelectedFrames(
      selectedFrames.includes(id)
        ? selectedFrames.filter((val) => val !== id)
        : [...selectedFrames, id]
    );

  // Load frame data from backend
  useEffect(() => {
    postMan
      .send({ workload: MSG_EVENTS.GET_ROOT_FRAMES })
      .then(({ frames, headline, subhead, source }) => {
        setFrames(frames);
        setHeadline(headline);
        setSubHead(subhead);
        setSource(source);
        setSelectedFrames(Object.keys(frames));
        setStatus(STATUS.READY);
      })
      .catch((err) => console.error("error requesting frames", err));
  }, []);

  // Flag need for a re-render when SVG or frames change
  useEffect(() => setNeedsRender(true), [responsive, selectedFrames.join()]);

  // Flag need for a re-render when SVG or frames change
  useEffect(() => {
    const framesOut = Object.values(frames).filter(({ id }) =>
      selectedFrames.includes(id)
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
  }, [headline, subhead, source, svgText]);

  // Get render
  useEffect(() => {
    if (status === STATUS.RENDER) {
      const getAndStoreSvgHtml = async () => {
        const { svgData, imageNodeDimensions } = await postMan.send({
          workload: MSG_EVENTS.RENDER,
          data: selectedFrames,
        });

        const svgText = await decodeSvgToString(svgData, imageNodeDimensions);
        setSvgText(svgText);
        setNeedsRender(false);
      };

      getAndStoreSvgHtml();
    }
  }, [status]);

  // Set zoom scale
  useEffect(() => {
    if (!previewEl.current) return;
    const PREVIEW_MARGIN = 40;
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
    .filter(({ id }) => selectedFrames.includes(id))
    .map(({ width, height }) => ({ width, height }));

  const { width = 320, height = 240 } = breakPoints[breakpoint] ?? {};

  return (
    <div class="app">
      <section class="preview">
        <div class="preview__settings">
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

          <label className="checkbox preview__responsive">
            Responsive
            <input
              type="checkbox"
              checked={responsive}
              onInput={() => setResponsive(!responsive)}
            />
          </label>

          <label className="checkbox preview__zoom">
            Scale preview to fit ({(zoomScale * 100).toFixed(0)}%)
            <input
              type="checkbox"
              checked={zoomEnabled}
              onInput={() => setZoomEnabled(!zoomEnabled)}
            />
          </label>
        </div>

        <div class="preview__container" ref={previewEl}>
          <iframe
            class="preview__iframe"
            srcDoc={html}
            style={`width: ${width}px; height: ${height}px; transform: scale(${zoomScale});`}
          />
        </div>
      </section>

      <section class="sidebar">
        <div class="selection">
          {sizeSortedFrames.map(({ name, id, width, height }) => (
            <p key={id} class="selection__item">
              <label class="selection__label">
                <input
                  class="selection__input"
                  type="checkbox"
                  checked={selectedFrames.includes(id)}
                  onInput={() => toggleSelected(id)}
                />

                {name}

                <span class="selection__width">
                  {width} x {height}
                </span>
              </label>
            </p>
          ))}
        </div>

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

        <p class="filesize">File-size: {Math.round(html.length / 1024)}kB</p>

        <button
          class="btn btn__preview"
          onClick={() => setStatus(STATUS.RENDER)}
          disabled={!needsRender || selectedFrames.length === 0}
        >
          Generate
        </button>

        <button
          class="btn btn__copy"
          disabled={needsRender}
          onClick={copyToClipboard}
        >
          {copied ? "Copied!" : "Copy to clipboard"}
        </button>

        <button
          class="btn btn__download"
          disabled={needsRender}
          onClick={downloadHtml}
        >
          Download
        </button>

        <textarea class="clipboard" ref={clipboardEl} value={html} />
      </section>

      <footer class="footer">Version {version}</footer>

      {status === STATUS.LOADING ||
        (status === STATUS.RENDER && <div class="loading">Loading...</div>)}
    </div>
  );
};
