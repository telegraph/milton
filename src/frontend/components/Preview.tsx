import { h } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";

type PreviewProps = {
  html: string;
  responsive: boolean;
  setResponsive: (v: boolean) => void;
  renderedFrames: string[];
  breakPoints: { width: number; height: number }[];
};

export function Preview(props: PreviewProps) {
  const {
    html,
    renderedFrames,
    responsive,
    setResponsive,
    breakPoints,
  } = props;

  const containerEl = useRef<HTMLDivElement>(null);
  const previewEl = useRef<HTMLDivElement>(null);
  const iframeEl = useRef<HTMLIFrameElement>(null);

  // Listen to preview events
  const [dragEnabled, setDragEnabled] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const [dragOrigin, setDragOrigin] = useState<[number, number]>([0, 0]);
  const [translation, setTrasnlation] = useState<[number, number]>([0, 0]);
  const [prevTrans, setPrevTrans] = useState<[number, number]>([0, 0]);
  const [breakpoint, setBreakpoint] = useState(0);
  const [zoomScale, setZoomScale] = useState(1);
  const [previewSize, setPreviewSize] = useState<[number, number]>([0, 0]);

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

    // Only allow main and middle mouse buttons to control panning
    if (button > 1) return;

    if (spacePressed && type === "mousedown") {
      setDragEnabled(true);
      // Set new drag origin
      setDragOrigin([x, y]);
    }

    if (dragEnabled && type === "mouseup") {
      setDragEnabled(false);
      setPrevTrans([...translation]);
    }
  };

  const handleZoom = (e: WheelEvent | KeyboardEvent) => {
    const ZOOM_INCREMENT = 0.1;
    const { type, ctrlKey, metaKey } = e;

    if (ctrlKey || metaKey) {
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
    }
  };

  // Update preview iframe based on new HTML content
  useEffect(() => {
    if (!html) return;

    const { width = 320, height = 240 } = breakPoints[breakpoint] ?? {};
    const scrollHeight =
      iframeEl?.current?.contentWindow?.document?.body?.scrollHeight || 0;
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

  // Reset zoom and translation on breakpoint and rendered frame changes
  useEffect(() => {
    if (!html || !previewEl.current) return;
    const { width } = previewEl.current.getBoundingClientRect();

    const maxWidth = breakPoints.reduce(
      (acc, { width }) => (acc > width ? acc : width),
      1
    );

    const zoomScale = width / maxWidth;

    setZoomScale(zoomScale > 1 ? 1 : zoomScale);
    setTrasnlation([0, 0]);
    setPrevTrans([0, 0]);
  }, [breakpoint, breakPoints, renderedFrames, html]);

  const handleIframeResize = (e) => {
    // console.log("readystatechange / resize", e);
    const { readyState, body } =
      iframeEl?.current?.contentWindow?.document || {};

    if (readyState === "complete" && body) {
      const { scrollHeight, offsetWidth } = body;
      // const { width = 320 } = breakPoints[breakpoint] ?? {};
      setPreviewSize([offsetWidth, scrollHeight]);
    }
  };

  const handlePanStart = (e: KeyboardEvent) =>
    e.code === "Space" &&
    e.target?.nodeName !== "INPUT" &&
    setSpacePressed(true);

  const handlePanEnd = (e: KeyboardEvent) => {
    if (e.code === "Space" && e.target?.nodeName !== "INPUT") {
      // Store translation info
      setPrevTrans([...translation]);
      // Stop panning
      setSpacePressed(false);
      setDragEnabled(false);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (dragEnabled === false) return;

    const { x, y } = e;
    const translateX = prevTrans[0] + (x - dragOrigin[0]) / zoomScale;
    const translateY = prevTrans[1] + (y - dragOrigin[1]) / zoomScale;
    setTrasnlation([translateX, translateY]);
  };

  return (
    <section class="preview" ref={containerEl}>
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
    </section>
  );
}
