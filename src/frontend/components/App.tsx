import { h, JSX } from "preact";
import { useEffect, useReducer } from "preact/hooks";
import { STATUS } from "constants";
import { generateEmbedHtml } from "./outputRender";
import { EmbedPropertiesInputs } from "./EmbedPropertiesInputs";
import { Preview } from "./Preview";
import { Frames } from "./Frames";
import { Export } from "./Export";
import { ErrorNotification } from "./ErrorNotification";
import { initialState, reducer } from "../store";
import {
  actionGetFrameData,
  actionUpdateSelectedFrames,
  actionSetResponsive,
} from "../actions";
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
  } = state;

  const outputFrames = Object.values(frames).filter(({ id }) =>
    selectedFrames.includes(id)
  );

  useEffect(() => actionGetFrameData()(dispatch), []);

  useEffect(() => {
    actionUpdateSelectedFrames(selectedFrames, outputFrames)(dispatch);
  }, [selectedFrames]);

  const breakpoints = outputFrames.map(({ width, height }) => ({
    width,
    height,
  }));

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
      <Export svg={svg} html={html} />

      <ErrorNotification errors={errors} />

      <Preview
        rendering={status === STATUS.RENDERING}
        html={html}
        responsive={responsive}
        handleChange={dispatch}
        breakpoint={breakpoints}
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
