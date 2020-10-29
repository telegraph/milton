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
  ERROR,
}

export const App = function () {
  const clipboardEl = useRef<HTMLTextAreaElement>(null);

  // Setup state
  const [status, setStatus] = useState(STATUS.LOADING);
  const [selectedFrames, setSelectedFrames] = useState<string[]>([]);
  const [responsive, setResponsive] = useState(true);
  const [headline, setHeadline] = useState("");
  const [subhead, setSubHead] = useState("");
  const [source, setSource] = useState("");
  const [html, setHtml] = useState("");
  const [frames, setFrames] = useState<FrameCollection>({});
  const [needsRender, setNeedsRender] = useState(false);
  const [copied, setCopied] = useState(false);
  const [breakpoint, setBreakpoint] = useState(320);

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

  // Flag need for a re-render when values change
  useEffect(() => setNeedsRender(true), [
    headline,
    subhead,
    source,
    responsive,
    selectedFrames.join(),
  ]);

  // Update Figma page data with new headings
  useEffect(() => {
    postMan.send({
      workload: MSG_EVENTS.UPDATE_HEADLINES,
      data: { headline, subhead, source },
    });
  }, [headline, subhead, source]);

  const copyToClipboard = () => {
    clipboardEl.current?.select();
    document.execCommand("copy");
    setCopied(true);
    setTimeout(() => setCopied(false), 600);
  };

  const downloadHtml = () =>
    saveAs(
      new Blob([html], { type: "text/html" }),
      `figma2html-${Date.now()}.html`
    );
  const generateSvgHtml = async () => {
    const { svgData, imageNodeDimensions } = await postMan.send({
      workload: MSG_EVENTS.RENDER,
      data: selectedFrames,
    });

    const svgText = await decodeSvgToString(svgData, imageNodeDimensions);
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
    setNeedsRender(false);
  };

  if (status === STATUS.LOADING) {
    return <p>Loading...</p>;
  }

  const sizeSortedFrames = Object.values(frames).sort((a, b) =>
    a.width > b.width ? 1 : -1
  );
  const breakPoints = sizeSortedFrames
    .filter(({ id }) => selectedFrames.includes(id))
    .map(({ width }) => width);

  return (
    <div class="app">
      <header class="header">
        <p class="filesize">File-size: {Math.round(html.length / 1024)}kB</p>

        <label className="responsive__label" for="responsive">
          Responsive
          <input
            className="responsive__input"
            type="checkbox"
            checked={responsive}
            onInput={() => setResponsive(!responsive)}
            id="responsive"
          />
        </label>

        <button
          class="btn btn__preview"
          onClick={generateSvgHtml}
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
      </header>

      <div class="headings">
        <label>
          Headline
          <input
            type="text"
            value={headline}
            onInput={({ currentTarget: { value } }) => setHeadline(value)}
          />
        </label>

        <label>
          Sub headline
          <input
            type="text"
            value={subhead}
            onInput={({ currentTarget: { value } }) => setSubHead(value)}
          />
        </label>

        <label>
          Source
          <input
            type="text"
            value={source}
            onInput={({ currentTarget: { value } }) => setSource(value)}
          />
        </label>
      </div>

      <section class="selection">
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
      </section>

      <section class="ouput">
        <select
          class="breakpoints"
          onInput={({ currentTarget: { selectedIndex } }) =>
            setBreakpoint(selectedIndex)
          }
        >
          {breakPoints.map((width, i) => (
            <option
              key={width}
              class="breakpoints__option"
              selected={breakpoint === i}
            >
              {width}px
            </option>
          ))}
        </select>

        <iframe
          class="ouput__iframe"
          srcDoc={html}
          style={`width: ${breakPoints[breakpoint]}px`}
        />

        <textarea class="output__clipboard" ref={clipboardEl} value={html} />
      </section>

      <footer class="footer">Version {version}</footer>
    </div>
  );
};
