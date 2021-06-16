import { STATUS, UI_TEXT } from "constants";
import { h, JSX } from "preact";
import { useEffect, useReducer, useRef } from "preact/hooks";
import {
  actionGetFrameData,
  actionSetBackgroundColour,
  actionSetResponsive,
  actionUpdateSelectedFrames,
} from "../actions";
import { initialState, reducer } from "../store";
import { BackgroundInput } from "./background_input";
import { Breakpoints } from "./breakpoints";
import { EmbedPropertiesInputs } from "./EmbedPropertiesInputs";
import { Export } from "./Export";
import { Frames } from "./Frames";
import { LinksInput } from "./links_input";
import { NotificationBar } from "./NotificationBar";
import { generateEmbedHtml } from "./outputRender";
import { Preview } from "./Preview";
import { Resizer } from "./resizer/resizer";
import { Zoom } from "./Zoom";

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
    breakpointWidth,
    backgroundColour,
    fileKey,
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

  console.log("RENDER", state);
  return (
    <div class="app">
      <header class="action_bar">
        <Zoom zoom={zoom} handleChange={dispatch} />

        <Breakpoints
          outputFrames={outputFrames}
          breakpointWidth={breakpointWidth}
          handleChange={dispatch}
        />

        <Export svg={svg} html={html} zoom={zoom} dispatch={dispatch} />
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
        embedUrl={embedProperties.embedUrl}
      />

      <div class="sidebar">
        <Frames
          figmaFrames={frames}
          selectedFrames={selectedFrames}
          handleChange={dispatch}
        />

        <EmbedPropertiesInputs handleChange={dispatch} {...embedProperties} />

        <LinksInput
          handleChange={dispatch}
          embedUrl={embedProperties.embedUrl}
          sourceUrl={embedProperties.sourceUrl}
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
              {UI_TEXT.RESPONSIVE_LABEL}
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

      <Resizer />
    </div>
  );
}
