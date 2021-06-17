import { STATUS, UI_TEXT } from "constants";
import { h, JSX } from "preact";
import { useEffect, useReducer, useRef } from "preact/hooks";
import {
  actionGetFrameData,
  actionSetBackgroundColour,
  actionUpdateSelectedFrames,
} from "../actions";
import { initialState, reducer } from "../store";
import { BackgroundInput } from "./background_input";
import { Breakpoints } from "./breakpoints";
import { Export } from "./Export";
import {
  EmbedUrlInput,
  FrameSelectionInput,
  HeadlineInput,
  ResponsiveToggle,
  SourceInput,
  SourceUrlInput,
  SubheadInput,
} from "./inputs";
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

  // Ugly. Need to cache to and prevent re-generation
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

        <Export svg={svg} html={html} dispatch={dispatch} />
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
        <div class="side_panel selection">
          <div class="side_panel__row side_panel__row--title">
            {UI_TEXT.TITLE_FRAMES}
          </div>

          {Object.values(frames).map((frame) => {
            const selected = selectedFrames.includes(frame.id);

            return (
              <div
                key={frame.id}
                data-active={selected}
                class="side_panel__row side_panel__row--input selection__item"
              >
                <FrameSelectionInput
                  id={frame.id}
                  name={frame.name}
                  disabled={selected && selectedFrames.length < 2}
                  selected={selected}
                  dispatch={dispatch}
                />
              </div>
            );
          })}
        </div>

        <div class="side_panel information">
          <div class="side_panel__row side_panel__row--title">
            {UI_TEXT.TITLE_HEADERS_FOOTER}
          </div>

          <div class="side_panel__row side_panel__row--headline">
            <HeadlineInput
              headline={embedProperties.headline}
              dispatch={dispatch}
            />
          </div>

          <div class="side_panel__row side_panel__row--headline">
            <SubheadInput
              subhead={embedProperties.subhead}
              dispatch={dispatch}
            />
          </div>

          <div class="side_panel__row side_panel__row--headline">
            <SourceInput source={embedProperties.source} dispatch={dispatch} />
          </div>

          <div class="side_panel__row side_panel__row--headline">
            <SourceUrlInput
              sourceUrl={embedProperties.sourceUrl}
              dispatch={dispatch}
            />
          </div>
        </div>

        {/* Destination URL  */}
        <div class="side_panel">
          <div class="side_panel__row side_panel__row--title">
            {UI_TEXT.TITLE_DESTINATION_URL}
          </div>

          <div class="side_panel__row ">
            <EmbedUrlInput
              embedUrl={embedProperties.embedUrl}
              dispatch={dispatch}
            />
          </div>
        </div>

        {/* Responsive toggle  */}
        <div class="side_panel">
          <div class="side_panel__row side_panel__row--input">
            <ResponsiveToggle responsive={responsive} dispatch={dispatch} />
          </div>
        </div>

        {/* Preview background colour picker  */}
        <div class="side_panel side_panel--background-color">
          <div class="side_panel__row side_panel__row--title">
            {UI_TEXT.TITLE_BACKGROUND_COLOUR}
          </div>

          <div class="side_panel__row side_panel__row--colour">
            <BackgroundInput
              colour={backgroundColour}
              handleChange={(colour: string) =>
                dispatch(actionSetBackgroundColour(colour))
              }
            />
          </div>
        </div>
      </div>

      <Resizer />
    </div>
  );
}
