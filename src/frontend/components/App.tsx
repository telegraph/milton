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
import { actionGetFrameData, actionUpdateSelectedFrames } from "../actions";
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
    fileKey,
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
          fileKey,
        })
      : "";

  return (
    <div class="app">
      <ErrorNotification errors={errors} />
      <Preview
        rendering={status === STATUS.RENDERING}
        html={html}
        responsive={responsive}
        handleChange={dispatch}
        breakpoint={breakpoints}
      />

      <section class="sidebar">
        <Frames
          figmaFrames={frames}
          selectedFrames={selectedFrames}
          handleChange={dispatch}
        />

        <EmbedPropertiesInputs {...embedProperties} handleChange={dispatch} />

        <Export svg={svg} html={html} />
      </section>

      <p class="footer">Version {version}</p>
    </div>
  );
}
