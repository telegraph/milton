import { h, JSX } from "preact";
import { useEffect, useReducer } from "preact/hooks";
import { saveAs } from "file-saver";

import { MSG_EVENTS, ERRORS, STATUS } from "constants";
import {
  convertRenderIntoSvg,
  extractImageData,
  findLargestElementSize,
  getMaxImageElementDimensions,
  MaxElementSizes,
  optimizeSvgImages,
  removeDuplicateImages,
  replaceImage,
} from "frontend/svgUtils";
import { postMan } from "utils/messages";
import { FrameRender, IFrameData } from "types";
import { generateEmbedHtml } from "./outputRender";
import { Preview } from "./Preview";
import { Frames } from "./Frames";
import { FrameText } from "./FrameText";
import { Export } from "./Export";

import { containsDuplicate, isEmpty } from "utils/common";
import {
  initialState,
  reducer,
  actionSetSvg,
  actionSetStatus,
  actionSetError,
  dispatchType,
  actionStoreData,
} from "../store";
import { version } from "../../../package.json";
import { resizeAndOptimiseImage } from "frontend/imageHelper";

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

  actionStoreData(dispatch, response).catch(console.error);
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
  const { renderedFrames, imageNodeDimensions } = response;
  console.log(renderedFrames);
  console.log(imageNodeDimensions);

  const originalImages: Record<string, string> = {};
  const outputFrames: Record<string, string> = {};
  const maxImageSizes: MaxElementSizes = {};

  const svgs: SVGElement[] = [];

  const containerEl = document.createElement("div");

  for (const frame of renderedFrames) {
    const svgEl = await convertRenderIntoSvg(frame, []);

    removeDuplicateImages(svgEl, originalImages);
    const imageIds = Object.keys(originalImages);
    const imageSizes = getMaxImageElementDimensions(svgEl, imageIds);

    // Work out max width
    for (const imageId of imageIds) {
      if (maxImageSizes[imageId]) {
        if (maxImageSizes[imageId].width < imageSizes[imageId].width) {
          maxImageSizes[imageId].width = imageSizes[imageId].width;
        }

        if (maxImageSizes[imageId].height < imageSizes[imageId].height) {
          maxImageSizes[imageId].height = imageSizes[imageId].height;
        }
      } else {
        maxImageSizes[imageId] = imageSizes[imageId];
      }
    }

    containerEl.appendChild(svgEl);

    outputFrames[frame.id] = svgEl?.outerHTML;
  }

  const resizedImages: Record<string, string> = {};
  for (const imgId of Object.keys(maxImageSizes)) {
    resizedImages[imgId] = await resizeAndOptimiseImage(
      originalImages[imgId],
      maxImageSizes[imgId]
    );

    replaceImage(imgId, containerEl, resizedImages[imgId]);
  }

  console.log("maxImageSizes", maxImageSizes);
  console.log("original images", originalImages);
  console.log("resizedImages images", resizedImages);

  // for (const svgEl of svgs) {
  //   const childNodes = [...svgEl.querySelectorAll("*")];
  //   findLargestElementSize(childNodes, Object.keys(originalImages));
  // }

  // console.log(originalImages);

  // const html = `<html><head></head><body>
  //   ${containerEl.outerHTML}
  // </body></html>`;

  // const blob = new Blob([html]);
  // saveAs(blob, "separate_svgs.html");

  dispatch(actionSetSvg(containerEl.innerHTML));
  dispatch(actionSetStatus(STATUS.READY));
}

export function App(): JSX.Element {
  const [state, dispatch] = useReducer(reducer, initialState);

  const {
    headline,
    subhead,
    source,
    svg,
    selectedFrames,
    status,
    error,
    figmaFrames,
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
        data: { headline, subhead, source },
      })
      .catch(() => dispatch(actionSetError(ERRORS.FAILED_TO_SET_HEADINGS)));
  }, [headline, subhead, source]);

  // Render SVG and store output when Status changes to Render
  // TODO: Only fetch data once!!
  useEffect(() => {
    if (selectedFrames.length < 1) {
      return;
    }

    getAndStoreSvgHtml(dispatch, selectedFrames).catch(console.error);
  }, [selectedFrames]);

  if (status === STATUS.ERROR) return <p>Error {error}</p>;

  if (status === STATUS.LOADING) return <p>LOADING</p>;

  const outputFrames = Object.values(figmaFrames).filter(({ id }) =>
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
        })
      : "";

  return (
    <div class="app">
      <Preview
        rendering={status === STATUS.RENDERING}
        html={html}
        responsive={responsive}
        handleChange={dispatch}
        breakpoint={breakpoints}
      />

      <section class="sidebar">
        <Frames
          figmaFrames={figmaFrames}
          selectedFrames={selectedFrames}
          handleChange={dispatch}
        />

        <FrameText
          headline={headline}
          subhead={subhead}
          source={source}
          handleChange={dispatch}
        />

        <Export svg={svg} html={html} />
      </section>

      <p class="footer">Version {version}</p>

      {selectedFrames.length === 0 && (
        <p class="warning">Need to select at least one frame</p>
      )}
    </div>
  );
}
