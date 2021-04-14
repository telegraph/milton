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
    breakpointWidth,
  } = state;

  const outputFrames = Object.values(frames).filter(({ id }) =>
    selectedFrames.includes(id)
  );

  useEffect(() => actionGetFrameData()(dispatch), []);

  useEffect(() => {
    actionUpdateSelectedFrames(selectedFrames, outputFrames)(dispatch);
  }, [selectedFrames]);

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
      <header class="action_bar">
        <Zoom zoom={zoom} handleChange={dispatch} />

        <Breakpoints
          outputFrames={outputFrames}
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
        breakpointWidth={breakpointWidth}
        zoom={zoom}
      />

      <section class="controls">
        <nav class="controls__navigation">
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
