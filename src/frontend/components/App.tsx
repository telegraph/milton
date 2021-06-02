import { h, JSX } from "preact";
import { STATUS, UI_TEXT } from "constants";
import { useEffect, useReducer, useRef } from "preact/hooks";
import { initialState, reducer } from "../store";
import { generateEmbedHtml } from "./outputRender";
import { Preview } from "./Preview";
import { Frames } from "./Frames";
import { Export } from "./Export";
import { NotificationBar } from "./NotificationBar";
import { EmbedPropertiesInputs } from "./EmbedPropertiesInputs";
import { BackgroundInput } from "./background_input";
import { Zoom } from "./Zoom";
import { Breakpoints } from "./breakpoints";
import { Sidebar } from "./Sidebar";
import { LinksInput } from "./links_input";
import { Resizer } from "./resizer/resizer";
import config from "../../config.json";
import {
  actionGetFrameData,
  actionUpdateSelectedFrames,
  actionSetResponsive,
  actionSetBackgroundColour,
  actionResizeWindow,
} from "../actions";

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
    fileKey,
    isMaximized,
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
          fileKey,
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

        {config.shareServices?.map((service) => {
          return (
            <div key={service.name} class="links">
              <a
                href={service.url}
                target="_blank"
                class="btn btn--clean"
                rel="noreferrer"
              >
                Open {service.name} ↗
              </a>
            </div>
          );
        })}

        <div class="resize-window">
          <button
            class={`btn btn--clean ${
              isMaximized ? "resize--min" : "resize--max"
            }`}
            onClick={() => dispatch(actionResizeWindow(isMaximized))}
          >
            {isMaximized ? UI_TEXT.WINDOW_MINIMIZE : UI_TEXT.WINDOW_MAXIMIZE}
          </button>
        </div>
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
        dispatch={dispatch}
        selectedFrames={selectedFrames}
      />

      <Sidebar>
        <div title="Frames" class="sidebar__tab">
          <Frames
            figmaFrames={frames}
            selectedFrames={selectedFrames}
            handleChange={dispatch}
          />

          <EmbedPropertiesInputs {...embedProperties} handleChange={dispatch} />

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
        </div>

        <div title="Links" class="sidebar__tab">
          <LinksInput
            handleChange={dispatch}
            embedUrl={embedProperties.embedUrl}
            sourceUrl={embedProperties.sourceUrl}
          />
        </div>
      </Sidebar>

      <Resizer />
    </div>
  );
}
