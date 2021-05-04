import { Fragment, h, JSX } from "preact";
import { STATUS } from "constants";
import { useEffect, useReducer, useRef } from "preact/hooks";
import { initialState, reducer } from "../store";
import { generateEmbedHtml } from "./outputRender";
import { Preview } from "./Preview";
import { Frames } from "./Frames";
import { Export } from "./Export";
import { NotificationBar } from "./NotificationBar";
import { EmbedPropertiesInputs } from "./EmbedPropertiesInputs";
import { BackgroundInput } from "./background_input";
import {
  actionGetFrameData,
  actionUpdateSelectedFrames,
  actionSetResponsive,
  actionSetBackgroundColour,
} from "../actions";
import { Zoom } from "./Zoom";
import { Breakpoints } from "./breakpoints";
import { Sidebar } from "./Sidebar";
import { LinksInput } from "./links_input";

export function App(): JSX.Element {
  const [state, dispatch] = useReducer(reducer, initialState);

  const {
    embedProperties,
    svg,
    selectedFrames,
    status,
    notificationId,
    notificationMessage,
    frames,
    responsive,
    zoom,
    breakpointIndex,
    breakpointWidth,
    backgroundColour,
  } = state;

  const outputFrames = Object.values(frames).filter(({ id }) =>
    selectedFrames.includes(id)
  );

  useEffect(() => actionGetFrameData()(dispatch), []);

  // fixme: Ugly hack to check if effect is running on first mount
  const mountRef = useRef(true);

  useEffect(() => {
    if (mountRef.current) {
      mountRef.current = false;
      return;
    }

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

  console.log(state);
  return (
    <div class="app">
      <header class="action_bar">
        <Zoom zoom={zoom} handleChange={dispatch} />

        <Breakpoints
          outputFrames={outputFrames}
          breakpointIndex={breakpointIndex}
          handleChange={dispatch}
        />

        <Export svg={svg} html={html} zoom={zoom} dispatch={dispatch} />

        <a href="https://example.com" target="_blank" class="btn btn--clean">
          Open Particle CMS ↗
        </a>
      </header>

      <NotificationBar
        id={notificationId}
        message={notificationMessage}
        dispatch={dispatch}
      />

      <Preview
        rendering={status === STATUS.RENDERING}
        html={html}
        responsive={responsive}
        breakpointWidth={breakpointWidth}
        backgroundColour={backgroundColour}
        zoom={zoom}
      />

      <Sidebar
        sections={{
          Frames: () => (
            <Fragment>
              <Frames
                figmaFrames={frames}
                selectedFrames={selectedFrames}
                handleChange={dispatch}
              />

              <EmbedPropertiesInputs
                {...embedProperties}
                handleChange={dispatch}
              />

              <div class="side_panel">
                <div class="side_panel__row side_panel__row--input">
                  <input
                    id="responsive"
                    class="input__checkbox"
                    type="checkbox"
                    checked={responsive}
                    onInput={() => dispatch(actionSetResponsive(!responsive))}
                  />

                  <label class="input__label" for="responsive">
                    Responsive
                  </label>
                </div>
              </div>

              <BackgroundInput
                colour={backgroundColour}
                handleChange={(colour: string) =>
                  dispatch(actionSetBackgroundColour(colour))
                }
              />
            </Fragment>
          ),

          Links: () => (
            <LinksInput
              handleChange={dispatch}
              embedUrl={embedProperties.embedUrl}
              sourceUrl={embedProperties.sourceUrl}
            />
          ),
        }}
      />
    </div>
  );
}
