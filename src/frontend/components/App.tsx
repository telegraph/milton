import { h } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import { saveAs } from "file-saver";
import { MSG_EVENTS, ERRORS, UI_TEXT } from "constants";
import { decodeSvgToString } from "frontend/svgUtils";
import { postMan } from "utils/messages";
import { FrameCollection } from "types";
import { Preview } from "./Preview";
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
  const headlineEl = useRef<HTMLInputElement>(null);

  // Setup state
  const [status, setStatus] = useState(STATUS.LOADING);
  const [selectedFrames, setSelectedFrames] = useState<string[]>([]);
  const [renderedFrames, setRenderedFrames] = useState<string[]>([]);
  const [responsive, setResponsive] = useState(true);
  const [headline, setHeadline] = useState("");
  const [subhead, setSubHead] = useState("");
  const [source, setSource] = useState("");
  const [html, setHtml] = useState("");
  const [svgText, setSvgText] = useState("");
  const [figmaFrames, setFigmaFrames] = useState<FrameCollection>({});
  const [needsRender, setNeedsRender] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<ERRORS | null>(null);

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

        setFigmaFrames(frames);
        setHeadline(headline);
        setSubHead(subhead);
        setSource(source);
        setSelectedFrames(Object.keys(frames).sort());
        setStatus(STATUS.RENDER);

        headlineEl.current?.focus();
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
    if (!svgText) return;

    const framesOut = Object.values(figmaFrames).filter(({ id }) =>
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

  const sizeSortedFrames = Object.values(figmaFrames).sort((a, b) =>
    a.width > b.width ? 1 : -1
  );

  const breakPoints = sizeSortedFrames
    .filter(({ id }) => renderedFrames.includes(id))
    .map(({ width, height }) => ({ width, height }));

  return (
    <div class="app">
      <Preview
        html={html}
        responsive={responsive}
        setResponsive={setResponsive}
        breakPoints={breakPoints}
        renderedFrames={renderedFrames}
      />

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

          <button
            class="btn export__generate"
            onClick={() => setStatus(STATUS.RENDER)}
            disabled={!needsRender || selectedFrames.length === 0}
          >
            Update
          </button>
        </fieldset>

        <fieldset class="headlines">
          <legend>Headlines</legend>
          <label>
            Headline
            <input
              type="text"
              ref={headlineEl}
              value={headline}
              onChange={(e) => setHeadline(e.currentTarget.value)}
            />
          </label>

          <label>
            Sub headline
            <input
              type="text"
              value={subhead}
              onChange={(e) => setSubHead(e.currentTarget.value)}
            />
          </label>

          <label>
            Source
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.currentTarget.value)}
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

      <p class="footer">Version {version}</p>

      {selectedFrames.length > 0 && needsRender && (
        <p class="warning">Need to update</p>
      )}

      {selectedFrames.length === 0 && (
        <p class="warning">Need to select at least one frame</p>
      )}
    </div>
  );
};
