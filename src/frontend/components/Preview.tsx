import { actionSetResponsive, ReducerProps } from "frontend/store";
import { FunctionalComponent, h, JSX } from "preact";
import { useState, useEffect, useRef, useReducer } from "preact/hooks";

interface ZoomContainerProps {
  html: string;
}

function ZoomContainer({ html }: ZoomContainerProps): JSX.Element {
  const iframeEl = useRef<HTMLIFrameElement>(null);
  const previewEl = useRef<HTMLDivElement>(null);

  const [zoomScale, setZoomScale] = useState(1);
  const [previewSize, setPreviewSize] = useState<[number, number]>([0, 0]);
  const [translation, setTranslation] = useState<[number, number]>([0, 0]);
  // Listen to preview events
  const [dragEnabled, setDragEnabled] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);

  // const handleZoom = (e: WheelEvent | KeyboardEvent) => {
  //   const ZOOM_INCREMENT = 0.1;
  //   const { type, ctrlKey, metaKey } = e;

  //   if (ctrlKey || metaKey) {
  //     let direction = 1;

  //     if (type === "wheel") {
  //       const { deltaY } = e;
  //       direction = deltaY > 0 ? 1 - ZOOM_INCREMENT : 1 + ZOOM_INCREMENT;
  //     }

  //     if (type === "keydown") {
  //       switch (e.key) {
  //         case "=":
  //           direction = 1 + ZOOM_INCREMENT;
  //           break;
  //         case "-":
  //           direction = 1 - ZOOM_INCREMENT;
  //           break;
  //         default:
  //           direction = 1;
  //       }
  //     }

  //     setZoomScale(zoomScale * direction);
  //   }
  // };

  const handleMouseMove = (e: MouseEvent) => {
    if (dragEnabled === false) return;

    const { x, y } = e;
    const translateX = prevTrans[0] + (x - dragOrigin[0]) / zoomScale;
    const translateY = prevTrans[1] + (y - dragOrigin[1]) / zoomScale;
    setTranslation([translateX, translateY]);
  };

  const [dragOrigin, setDragOrigin] = useState<[number, number]>([0, 0]);
  const [prevTrans, setPrevTrans] = useState<[number, number]>([0, 0]);

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

  // Event listeners

  useEffect(() => {
    const el = previewEl.current;
    if (dragEnabled) {
      el?.addEventListener("mousemove", handleMouseMove);
    }

    window.addEventListener("mousedown", handleMouseClick);
    window.addEventListener("mouseup", handleMouseClick);
    // window.addEventListener("wheel", handleZoom);
    // window.addEventListener("keydown", handleZoom);
    window.addEventListener("keydown", handlePanStart);
    window.addEventListener("keyup", handlePanEnd);
  }, [
    previewEl,
    dragEnabled,
    handleMouseClick,
    handlePanEnd,
    handlePanStart,
    // handleZoom,
    handleMouseMove,
  ]);

  const iframeStyle = `
    width: ${previewSize[0]}px;
    height: ${previewSize[1]}px;
    transform: scale(${zoomScale}) translate(${translation[0]}px,  ${translation[1]}px);
    position: absolute;
  `;

  return (
    <div class="preview__wrapper" ref={previewEl}>
      <iframe
        ref={iframeEl}
        class="preview__iframe"
        srcDoc={html}
        style={iframeStyle}
      />
    </div>
  );
}

interface PreviewState {
  x: number;
  y: number;
  startX: number;
  startY: number;
  translateX: number;
  translateY: number;
  width: number;
  height: number;
  zoom: number;
  breakpointIndex: number;
  panning: boolean;
  panningEnabled: boolean;
}

const initialState: PreviewState = {
  x: 0,
  y: 0,
  startX: 0,
  startY: 0,
  width: 100,
  height: 100,
  translateX: 0,
  translateY: 0,
  zoom: 1,
  breakpointIndex: 0,
  panning: false,
  panningEnabled: false,
};

interface PreviewProps {
  html: string;
  responsive: boolean;
  breakPoints: { width: number; height: number }[];
  handleChange: (action: ReducerProps) => void;
}

type actionType =
  | { type: "ENABLED_PANNING" }
  | { type: "START_PANNING"; payload: { x: number; y: number } }
  | { type: "UPDATE_POSITION"; payload: { x: number; y: number } }
  | { type: "END_PANNING" }
  | { type: "DISABLE_PANNING" }
  | { type: "RESET" }
  | { type: "SET_WIDTH"; payload: { width: number; height: number } }
  | {
      type: "UPDATE_BREAKPOINT_INDEX";
      payload: { width: number; height: number; index: number };
    };

function reducer(state: PreviewState, action: actionType): PreviewState {
  switch (action.type) {
    case "RESET":
      return initialState;

    case "UPDATE_BREAKPOINT_INDEX": {
      const { width, height, index } = action.payload;
      return {
        ...state,
        breakpointIndex: index,
        width,
        height,
      };
    }

    case "ENABLED_PANNING":
      return { ...state, panningEnabled: true };

    case "START_PANNING":
      if (state.panningEnabled) {
        return {
          ...state,
          panning: true,
          startX: action.payload.x,
          startY: action.payload.y,
        };
      } else {
        return state;
      }

    case "UPDATE_POSITION": {
      if (state.panningEnabled && state.panning) {
        const distanceX = state.translateX + (action.payload.x - state.startX);
        const distanceY = state.translateY + (action.payload.y - state.startY);

        return {
          ...state,
          x: distanceX,
          y: distanceY,
        };
      } else {
        return state;
      }
    }

    case "END_PANNING":
      return {
        ...state,
        translateX: state.x,
        translateY: state.y,
        panning: false,
        panningEnabled: false,
      };

    case "DISABLE_PANNING":
      return { ...state, panningEnabled: state.panning };

    case "SET_WIDTH":
      return { ...state, ...action.payload };

    default:
      throw new Error("Unknown action") as never;
  }
}

export const Preview: FunctionalComponent<PreviewProps> = (props) => {
  const {
    html,
    responsive,
    handleChange,
    // renderedFrames,
    // setResponsive,
    breakPoints,
  } = props;

  // const containerEl = useRef<HTMLDivElement>(null);

  // Listen to preview events
  // const [dragEnabled, setDragEnabled] = useState(false);
  // const [spacePressed, setSpacePressed] = useState(false);

  // const [breakpoint, setBreakpoint] = useState(0);

  // Update preview iframe based on new HTML content
  // useEffect(() => {
  //   if (!html) return;

  //   const { width = 320, height = 240 } = breakPoints[breakpoint] ?? {};
  //   const scrollHeight =
  //     iframeEl?.current?.contentWindow?.document?.body?.scrollHeight || 0;
  //   if (height && width) {
  //     setPreviewSize([width, scrollHeight]);
  //   }
  //   iframeEl.current?.contentWindow?.addEventListener(
  //     "resize",
  //     handleIframeResize
  //   );
  //   iframeEl.current?.contentWindow?.document.addEventListener(
  //     "readystatechange",
  //     handleIframeResize
  //   );

  //   return () => {
  //     iframeEl.current?.contentWindow?.document.removeEventListener(
  //       "readystatechange",
  //       handleIframeResize
  //     );
  //     iframeEl.current?.contentWindow?.removeEventListener(
  //       "resize",
  //       handleIframeResize
  //     );
  //   };
  // }, [html, breakpoint]);

  // // Reset zoom and translation on breakpoint and rendered frame changes
  // useEffect(() => {
  //   if (!html || !previewEl.current) return;
  //   const { width } = previewEl.current.getBoundingClientRect();

  //   const maxWidth = breakPoints.reduce(
  //     (acc, { width }) => (acc > width ? acc : width),
  //     1
  //   );

  //   const zoomScale = width / maxWidth;

  //   setZoomScale(zoomScale > 1 ? 1 : zoomScale);
  //   setTranslation([0, 0]);
  //   setPrevTrans([0, 0]);
  // }, [breakpoint, breakPoints, renderedFrames, html]);

  // const handleIframeResize = (e) => {
  //   // console.log("readystatechange / resize", e);
  //   const { readyState, body } =
  //     iframeEl?.current?.contentWindow?.document || {};

  //   if (readyState === "complete" && body) {
  //     const { scrollHeight, offsetWidth } = body;
  //     // const { width = 320 } = breakPoints[breakpoint] ?? {};
  //     setPreviewSize([offsetWidth, scrollHeight]);
  //   }
  // };

  const previewEl = useRef<HTMLDivElement>(null);
  const iframeEl = useRef<HTMLIFrameElement>(null);

  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    width: breakPoints[0].width,
    height: breakPoints[0].height,
  });

  // const [zoomScale, setZoomScale] = useState(1);
  // const [dragEnabled, setDragEnabled] = useState(false);
  // const [spacePressed, setSpacePressed] = useState(false);
  // const [translation, setTranslation] = useState<[number, number]>([0, 0]);
  // const [size, setSize] = useState<{ width: number; height: number } | null>(
  //   null
  // );

  // const [breakpointIndex, setBreakpointIndex] = useState(0);
  // const updateBreakpointIndex = (index: number) => {
  //   setBreakpointIndex(index);
  //   setSize(null);
  // };

  // const handleMouseMove = (e: MouseEvent) => {
  //   if (dragEnabled === false) return;

  //   const { x, y } = e;
  //   const translateX = prevTrans[0] + (x - dragOrigin[0]) / zoomScale;
  //   const translateY = prevTrans[1] + (y - dragOrigin[1]) / zoomScale;
  //   setTranslation([translateX, translateY]);
  // };

  // const [dragOrigin, setDragOrigin] = useState<[number, number]>([0, 0]);
  // const [prevTrans, setPrevTrans] = useState<[number, number]>([0, 0]);

  // const handlePanStart = (e: KeyboardEvent) =>
  //   e.code === "Space" &&
  //   e.target?.nodeName !== "INPUT" &&
  //   setSpacePressed(true);

  // const handlePanEnd = (e: KeyboardEvent) => {
  //   if (e.code === "Space" && e.target?.nodeName !== "INPUT") {
  //     // Store translation info
  //     setPrevTrans([...translation]);
  //     // Stop panning
  //     setSpacePressed(false);
  //     setDragEnabled(false);
  //   }
  // };

  // useEffect(() => {
  //   console.log(previewEl.current);
  //   const handleMouseClick = (e: MouseEvent) => {
  //     const { button, type, x, y } = e;

  //     // Only allow main and middle mouse buttons to control panning
  //     if (button > 1) return;

  //     if (spacePressed && type === "mousedown") {
  //       setDragEnabled(true);
  //       // Set new drag origin
  //       setDragOrigin([x, y]);
  //     }

  //     if (dragEnabled && type === "mouseup") {
  //       setDragEnabled(false);
  //       setPrevTrans([...translation]);
  //     }
  //   };

  //   previewEl.current.addEventListener("click", handleMouseClick);
  // }, []);

  const handleMouseDown = (e: MouseEvent) => {
    if (e.button === 1) {
      dispatch({ type: "ENABLED_PANNING" });
    }

    dispatch({ type: "START_PANNING", payload: { x: e.x, y: e.y } });
  };

  const handleMouseMove = (e: MouseEvent) => {
    dispatch({ type: "UPDATE_POSITION", payload: { x: e.x, y: e.y } });
  };

  const handleMouseUp = () => {
    dispatch({ type: "END_PANNING" });
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === "Space") {
      dispatch({ type: "ENABLED_PANNING" });
    }
  };

  const handleKeyUp = () => {
    dispatch({ type: "DISABLE_PANNING" });
  };

  const resizeObserver = new ResizeObserver((entries) => {
    const { width, height } = entries[0].contentRect;
    dispatch({ type: "SET_WIDTH", payload: { width, height } });
  });

  useEffect(() => {
    const previewRefEl = previewEl.current;
    const iframeElRef = iframeEl.current;

    // Translation
    previewRefEl.addEventListener("mousedown", handleMouseDown);
    previewRefEl.addEventListener("mousemove", handleMouseMove);
    previewRefEl.addEventListener("mouseup", handleMouseUp);
    previewRefEl.addEventListener("mouseleave", handleMouseUp);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    // Zoom
    resizeObserver.observe(iframeElRef);

    return () => {
      previewRefEl.removeEventListener("mousedown", handleMouseDown);
      previewRefEl.removeEventListener("mousemove", handleMouseMove);
      previewRefEl.removeEventListener("mouseup", handleMouseUp);
      previewRefEl.removeEventListener("mouseleave", handleMouseUp);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      resizeObserver.unobserve(iframeElRef);
    };
  }, []);

  const { x, y, zoom, width, height, breakpointIndex, panningEnabled } = state;

  const iframeStyle = `
    width: ${width}px;
    height: ${height}px;
    transform: scale(${zoom}) translate(${x}px,  ${y}px);
  `;

  return (
    <section class="preview">
      <div class="preview__settings">
        <label class="checkbox preview__responsive">
          <input
            type="checkbox"
            checked={responsive}
            onInput={() => handleChange(actionSetResponsive(!responsive))}
          />
          Responsive
        </label>

        <label class="preview__breakpoints">
          Breakpoints
          <select
            class="breakpoints"
            onInput={(e) =>
              dispatch({
                type: "UPDATE_BREAKPOINT_INDEX",
                payload: {
                  width: breakPoints[e.currentTarget.selectedIndex].width,
                  height: breakPoints[e.currentTarget.selectedIndex].height,
                  index: e.currentTarget.selectedIndex,
                },
              })
            }
          >
            {breakPoints.map(({ width }, i) => (
              <option
                key={width}
                class="breakpoints__option"
                selected={breakpointIndex === i}
              >
                {width}px
              </option>
            ))}
          </select>
        </label>

        <p class="preview__info">
          {width} x {height}
        </p>

        <button onClick={() => dispatch({ type: "RESET" })}>Reset</button>
      </div>

      <div
        class={`preview__container ${
          panningEnabled ? "preview__container--drag" : ""
        }`}
        ref={previewEl}
      >
        <iframe
          ref={iframeEl}
          class="preview__iframe"
          srcDoc={html}
          style={iframeStyle}
        />

        <div class="preview__help">
          <p>
            <span>Zoom</span> cmd / ctrl and + / -
          </p>
          <p>
            <span>Pan</span> Space-bar and drag
          </p>
        </div>
      </div>
    </section>
  );
};
