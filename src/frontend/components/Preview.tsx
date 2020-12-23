import { actionSetResponsive, ReducerProps } from "frontend/store";
import { FunctionalComponent, h } from "preact";
import { useEffect, useRef, useReducer, useState } from "preact/hooks";

interface PreviewProps {
  html: string;
  responsive: boolean;
  breakPoints: { width: number; height: number }[];
  handleChange: (action: ReducerProps) => void;
}

export const Preview: FunctionalComponent<PreviewProps> = (props) => {
  const { html, responsive, handleChange, breakPoints } = props;
  const [breakpointIndex, setBreakpointIndex] = useState(0);

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
            onInput={(e) => setBreakpointIndex(e.currentTarget.selectedIndex)}
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
      </div>

      <PreviewIframe
        html={html}
        breakpointWidth={breakPoints[breakpointIndex].width}
      />
    </section>
  );
};

interface PreviewIframeState {
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

const initialState: PreviewIframeState = {
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

type actionType =
  | { type: "ENABLED_PANNING" }
  | { type: "START_PANNING"; payload: { x: number; y: number } }
  | { type: "UPDATE_POSITION"; payload: { x: number; y: number } }
  | { type: "END_PANNING" }
  | { type: "DISABLE_PANNING" }
  | { type: "RESET" }
  | { type: "SET_WIDTH"; payload: { width: number; height?: number } };

function reducer(
  state: PreviewIframeState,
  action: actionType
): PreviewIframeState {
  switch (action.type) {
    case "RESET":
      return initialState;

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

interface PreviewIframeProps {
  html: string;
  breakpointWidth: number;
}

function PreviewIframe({ html, breakpointWidth }: PreviewIframeProps) {
  const previewEl = useRef<HTMLDivElement>(null);
  const iframeEl = useRef<HTMLIFrameElement>(null);
  const [state, dispatch] = useReducer(reducer, { ...initialState });

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

  useEffect(() => {
    const previewRefEl = previewEl.current;
    const iframeElRef = iframeEl.current;

    const resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      dispatch({ type: "SET_WIDTH", payload: { width, height } });
    });

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

  useEffect(() => {
    dispatch({ type: "SET_WIDTH", payload: { width: breakpointWidth } });
  }, [breakpointWidth]);

  const { x, y, zoom, width, height, panningEnabled } = state;
  const iframeWidth = Math.max(breakpointWidth, width);

  const iframeStyle = `
  width: ${iframeWidth}px;
  height: ${height}px;
  transform: scale(${zoom}) translate(${x}px,  ${y}px);
  min-width: ${breakpointWidth}px;
`;

  return (
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
        <button onClick={() => dispatch({ type: "RESET" })}>Reset</button>
        <p>
          <span>Zoom</span> cmd / ctrl and + / -
        </p>
        <p>
          <span>Pan</span> Space-bar and drag
        </p>
      </div>
    </div>
  );
}