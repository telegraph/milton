import { ActionTypes } from "frontend/actions";
import { FunctionalComponent, h } from "preact";
import { useEffect, useRef, useReducer } from "preact/hooks";

interface PreviewProps {
  rendering: boolean;
  html: string;
  responsive: boolean;
  breakpointWidth: number;
  breakpointHeight: number;
  zoom: number;
  handleChange: (action: ActionTypes) => void;
}

interface PreviewStateInterface {
  x: number;
  y: number;
  startX: number;
  startY: number;
  translateX: number;
  translateY: number;
  offsetWidth: number;
  offsetHeight: number;
  prevOffsetWidth: number;
  prevOffsetHeight: number;
  panning: boolean;
  panningEnabled: boolean;
  resizing: boolean;
  prevMouseX: number;
  prevMouseY: number;
}

type actionType =
  | { type: "ENABLE_RESIZING"; payload: { x: number; y: number } }
  | { type: "DISABLE_RESIZING" }
  | {
      type: "UPDATE_RESIZING";
      payload: { offsetWidth: number; offsetHeight: number };
    }
  | { type: "ENABLED_PANNING" }
  | { type: "START_PANNING"; payload: { x: number; y: number; zoom: number } }
  | { type: "UPDATE_POSITION"; payload: { x: number; y: number; zoom: number } }
  | { type: "END_PANNING" }
  | { type: "DISABLE_PANNING" }
  | { type: "RESET"; payload: PreviewStateInterface }
  | { type: "RESET_SIZE" }
  | {
      type: "SET_DIMENSIONS";
      payload: { offsetWidth: number; offsetHeight: number };
    };

function reducer(
  state: PreviewStateInterface,
  action: actionType
): PreviewStateInterface {
  switch (action.type) {
    case "RESET":
      return action.payload;

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
        const { translateX, translateY, startX, startY } = state;

        const distanceX =
          translateX + (action.payload.x - startX) / action.payload.zoom;
        const distanceY =
          translateY + (action.payload.y - startY) / action.payload.zoom;

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

    case "ENABLE_RESIZING":
      return {
        ...state,
        resizing: true,
        prevMouseX: action.payload.x,
        prevMouseY: action.payload.y,
      };

    case "UPDATE_RESIZING":
      return {
        ...state,
        resizing: true,
        offsetWidth: action.payload.offsetWidth,
        offsetHeight: action.payload.offsetHeight,
      };

    case "DISABLE_RESIZING":
      return {
        ...state,
        resizing: false,
        prevMouseX: 0,
        prevMouseY: 0,
        prevOffsetWidth: state.offsetWidth,
        prevOffsetHeight: state.offsetHeight,
      };

    case "RESET_SIZE":
      return {
        ...state,
        resizing: false,
        panning: false,
        prevOffsetHeight: 0,
        prevOffsetWidth: 0,
        offsetHeight: 0,
        offsetWidth: 0,
      };

    case "SET_DIMENSIONS":
      return { ...state, ...action.payload };

    default:
      throw new Error("Unknown action") as never;
  }
}

interface PreviewIframeProps {
  html: string;
  breakpointWidth: number;
  breakpointHeight: number;
  rendering: boolean;
  zoom: number;
}

export const Preview: FunctionalComponent<PreviewProps> = ({
  html,
  breakpointWidth,
  breakpointHeight,
  rendering,
  zoom,
}: PreviewIframeProps) => {
  const initialState: PreviewStateInterface = {
    x: 0,
    y: 0,
    startX: 0,
    startY: 0,
    offsetWidth: 0,
    offsetHeight: 0,
    prevOffsetWidth: 0,
    prevOffsetHeight: 0,
    translateX: 0,
    translateY: 0,
    panning: false,
    panningEnabled: false,
    resizing: false,
    prevMouseX: 0,
    prevMouseY: 0,
  };

  const previewEl = useRef<HTMLDivElement>(null);
  const iframeEl = useRef<HTMLIFrameElement>(null);
  const [state, dispatch] = useReducer(reducer, { ...initialState });
  const {
    offsetWidth,
    offsetHeight,
    prevOffsetWidth,
    prevOffsetHeight,
    panningEnabled,
    panning,
    prevMouseX,
    prevMouseY,
    resizing,
  } = state;

  const handleMouseDown = (e: MouseEvent) => {
    if (e.button === 1) {
      dispatch({ type: "ENABLED_PANNING" });
    }

    dispatch({ type: "START_PANNING", payload: { x: e.x, y: e.y, zoom } });
  };

  const handleMouseMove = (e: MouseEvent) => {
    dispatch({ type: "UPDATE_POSITION", payload: { x: e.x, y: e.y, zoom } });
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
    if (!panning) return;
    const previewRefEl = previewEl.current;

    // Translation
    previewRefEl.addEventListener("mousedown", handleMouseDown);
    if (panning) {
      previewRefEl.addEventListener("mousemove", handleMouseMove);
      previewRefEl.addEventListener("mouseup", handleMouseUp);
      previewRefEl.addEventListener("mouseleave", handleMouseUp);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      previewRefEl.removeEventListener("mousedown", handleMouseDown);
      previewRefEl.removeEventListener("mousemove", handleMouseMove);
      previewRefEl.removeEventListener("mouseup", handleMouseUp);
      previewRefEl.removeEventListener("mouseleave", handleMouseUp);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    // const previewRect = previewEl.current.getBoundingClientRect();
    // // @TODO: Do we this?
    // const zoom = Math.min(
    //   1,
    //   previewRect.width / breakpointWidth,
    //   previewRect.height / breakpointHeight
    // );
    // console.log("in here", breakpointHeight);

    // dispatch({ type: "SET_DIMENSIONS", payload: { ...initialState } });

    dispatch({ type: "RESET_SIZE" });
  }, [breakpointWidth, breakpointHeight]);

  const startResize = (e: MouseEvent) => {
    // Only resize on left mouse button press
    if (e.button !== 0) return;
    dispatch({ type: "ENABLE_RESIZING", payload: { x: e.x, y: e.y } });
  };

  const endResize = () => dispatch({ type: "DISABLE_RESIZING" });

  const updateResize = (e: MouseEvent) => {
    if (!resizing) return;

    const newOffsetWidth = (e.x - prevMouseX) / zoom + prevOffsetWidth;
    const newOffsetHeight = (e.y - prevMouseY) / zoom + prevOffsetHeight;

    dispatch({
      type: "UPDATE_RESIZING",
      payload: {
        offsetWidth: newOffsetWidth,
        offsetHeight: newOffsetHeight,
      },
    });
  };

  const iframeWidth = breakpointWidth + offsetWidth * 2;
  const iframeHeight = breakpointWidth + offsetHeight * 2;
  console.log(iframeWidth, iframeWidth * zoom);

  const IFRAME_HEIGHT_MARGIN = 160;

  const iframeStyle = `
    width: ${iframeWidth}px;
    height: ${iframeHeight}px;
    transform: scale(${zoom});
  `;

  const iframeWrapperStyle = `
    width: ${iframeWidth * zoom}px;
    height: ${iframeHeight * zoom}px;
  `;

  return (
    <section class={`preview ${resizing ? "preview--resizing" : ""}`}>
      {rendering && <div class="preview__rendering">Rendering</div>}

      <div class="preview__settings">
        <p>
          {Math.round(iframeWidth)} x {Math.round(iframeHeight)}
        </p>
      </div>

      <div
        class={`preview__container ${
          panningEnabled ? "preview__container--drag" : ""
        }`}
        ref={previewEl}
        onMouseUp={endResize}
        onMouseMove={updateResize}
      >
        <div
          class="preview__iframe_wrapper"
          ref={iframeEl}
          style={iframeWrapperStyle}
        >
          <iframe class="preview__iframe" srcDoc={html} style={iframeStyle} />
          <button class="preview__iframe_resize" onMouseDown={startResize}>
            Resize
          </button>
        </div>
      </div>
    </section>
  );
};
