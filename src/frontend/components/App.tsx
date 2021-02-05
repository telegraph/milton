import { FrameRender, IFrameData } from "types";
import { h, JSX } from "preact";
import { useEffect, useReducer } from "preact/hooks";

import { MSG_EVENTS, ERRORS, STATUS } from "constants";
import { decodeSvgToString } from "frontend/svgUtils";
import { postMan } from "utils/messages";
import { generateEmbedHtml } from "./outputRender";
import { Preview } from "./Preview";
import { Frames } from "./Frames";
import { EmbedPropertiesInputs } from "./EmbedPropertiesInputs";
import { Export } from "./Export";
import { ErrorNotification } from "./ErrorNotification";

import { containsDuplicate, isEmpty } from "utils/common";
import { initialState, reducer } from "../store";
import {
  actionSetSvg,
  actionSetStatus,
  actionSetError,
  dispatchType,
  actionStoreData,
} from "../actions";
import { version } from "../../../package.json";

function handleResponse(dispatch: dispatchType, response: IFrameData): void {
  if (isEmpty(response.frames)) {
    dispatch(actionSetError(ERRORS.MISSING_FRAMES));
    return;
  }

  const widths = Object.values(response.frames).map(({ width }) => width);
  if (containsDuplicate(widths)) {
    dispatch(actionSetError(ERRORS.MULTIPLE_SAME_WIDTH));
    return;
  }

  dispatch(actionStoreData(response));
}

async function getAndStoreSvgHtml(
  dispatch: dispatchType,
  frames: string[]
): Promise<void> {
  dispatch(actionSetStatus(STATUS.RENDERING));

  const response = (await postMan
    .send({ workload: MSG_EVENTS.RENDER, data: frames })
    .catch(console.error)) as FrameRender;

  console.log(response, frames);
  const { svgData, imageNodeDimensions } = response;

  const svg = await decodeSvgToString(svgData, imageNodeDimensions);
  dispatch(actionSetSvg(svg));
  dispatch(actionSetStatus(STATUS.IDLE));
}

export function App(): JSX.Element {
  const [state, dispatch] = useReducer(reducer, initialState);

  const {
    headline,
    subhead,
    source,
    sourceUrl,
    embedUrl,
    svg,
    selectedFrames,
    status,
    errors,
    frames,
    responsive,
  } = state;

  // Load frame data from backend
  // TODO: Only fetch data once!!
  useEffect(() => {
    postMan
      .send({ workload: MSG_EVENTS.GET_ROOT_FRAMES })
      .then((response: IFrameData) => handleResponse(dispatch, response))
      .catch(() => dispatch(actionSetError(ERRORS.FAILED_TO_FETCH_DATA)));
  }, []);

  // Store headings on Figma page when headings change
  useEffect((): void => {
    postMan
      .send({
        workload: MSG_EVENTS.UPDATE_HEADLINES,
        data: { headline, subhead, source, sourceUrl, embedUrl },
      })
      .catch(() => dispatch(actionSetError(ERRORS.FAILED_TO_SET_HEADINGS)));
  }, [headline, subhead, source, sourceUrl, embedUrl]);

  // Render SVG and store output when Status changes to Render
  // TODO: Only fetch data once!!
  useEffect(() => {
    if (selectedFrames.length < 1) return;
    getAndStoreSvgHtml(dispatch, selectedFrames).catch(console.error);
  }, [selectedFrames]);

  // if (status === STATUS.LOADING) return <p>LOADING</p>;

  const outputFrames = Object.values(frames).filter(({ id }) =>
    selectedFrames.includes(id)
  );

  const breakpoints = outputFrames.map(({ width, height }) => ({
    width,
    height,
  }));

  const html =
    outputFrames.length > 0
      ? generateEmbedHtml({
          frames: outputFrames,
          svg,
          headline,
          subhead,
          source,
          responsive,
          sourceUrl,
          embedUrl,
        })
      : "";

  return (
    <div class="app">
      {errors.length > 0 && <ErrorNotification errors={errors} />}
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

        <EmbedPropertiesInputs
          headline={headline}
          subhead={subhead}
          source={source}
          sourceUrl={sourceUrl}
          embedUrl={embedUrl}
          handleChange={dispatch}
        />

        <Export svg={svg} html={html} />
      </section>

      <p class="footer">Version {version}</p>
    </div>
  );
}
