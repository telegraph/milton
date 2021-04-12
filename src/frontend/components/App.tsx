import { h, JSX } from "preact";
import { STATUS } from "constants";
import { useEffect, useReducer } from "preact/hooks";
import { initialState, reducer } from "../store";
import { generateEmbedHtml } from "./outputRender";
import { Preview } from "./Preview";
import { Frames } from "./Frames";
import { Export } from "./Export";
import { ErrorNotification } from "./ErrorNotification";
import { EmbedPropertiesInputs } from "./EmbedPropertiesInputs";
import {
  actionGetFrameData,
  actionUpdateSelectedFrames,
  actionSetResponsive,
} from "../actions";
import { Zoom } from "./Zoom";
import { Breakpoints } from "./breakpoints";
import { version } from "../../../package.json";

export function App(): JSX.Element {
  const [state, dispatch] = useReducer(reducer, initialState);

  const {
    embedProperties,
    svg,
    selectedFrames,
    status,
    errors,
    frames,
    responsive,
    zoom,
    breakpointIndex,
  } = state;

  const outputFrames = Object.values(frames).filter(({ id }) =>
    selectedFrames.includes(id)
  );

  useEffect(() => actionGetFrameData()(dispatch), []);

  useEffect(() => {
    actionUpdateSelectedFrames(selectedFrames, outputFrames)(dispatch);
  }, [selectedFrames]);

  const DEFAULT_BREAKPOINTS = [
    { width: 320, height: 320, default: true },
    { width: 480, height: 480, default: true },
    { width: 640, height: 480, default: true },
    { width: 720, height: 480, default: true },
    { width: 1024, height: 480, default: true },
    { width: 1200, height: 480, default: true },
  ];

  const breakpoints = [
    ...outputFrames.map(({ width, height }) => ({ width, height })),
    ...DEFAULT_BREAKPOINTS,
  ];

  const breakpointWidth = breakpoints[breakpointIndex]?.width || 100;
  const breakpointHeight = breakpoints[breakpointIndex]?.height || 100;
  console.log(breakpoints[breakpointIndex]);

  console.log(state);

  const html =
    outputFrames.length > 0
      ? generateEmbedHtml({
          ...embedProperties,
          frames: outputFrames,
          responsive,
          svg,
        })
      : "";

  return (
    <div class="app">
      <header class="top_bar">
        <Zoom zoom={zoom} handleChange={dispatch} />

        <Breakpoints
          breakpoints={breakpoints}
          breakpointIndex={breakpointIndex}
          handleChange={dispatch}
        />

        <Export svg={svg} html={html} zoom={zoom} />
      </header>

      <ErrorNotification errors={errors} />

      <Preview
        rendering={status === STATUS.RENDERING}
        html={html}
        responsive={responsive}
        handleChange={dispatch}
        breakpointWidth={breakpointWidth}
        breakpointHeight={breakpointHeight}
        zoom={zoom}
      />

      <section class="sidebar">
        <nav>
          <button>Frames</button>
          <button>Links</button>
          <button>Compression</button>
        </nav>

        <Frames
          figmaFrames={frames}
          selectedFrames={selectedFrames}
          handleChange={dispatch}
        />

        <EmbedPropertiesInputs {...embedProperties} handleChange={dispatch} />

        <fieldset>
          <label class="checkbox preview__responsive">
            <input
              type="checkbox"
              checked={responsive}
              onInput={() => dispatch(actionSetResponsive(!responsive))}
            />
            Responsive
          </label>
        </fieldset>
      </section>

      <p class="footer">Version {version}</p>
    </div>
  );
}
