import { EMBED_PROPERTIES, MSG_EVENTS, NOTIFICATIONS_IDS } from "constants";
import { FigmaFramesType, FrameRender, IFrameData } from "types";
import { containsDuplicate, isEmpty } from "utils/common";
import { postMan } from "utils/messages";
import { StateInterface } from "./store";
import { decodeSvgToString } from "./svgUtils";

type InitialData = Pick<
  StateInterface,
  | "embedProperties"
  | "frames"
  | "selectedFrames"
  | "breakpointWidth"
  | "fileKey"
>;

function multipleFramesWithSameWidth(frames: FigmaFramesType): boolean {
  const allWidths = Object.values(frames).map(({ width }) => width);

  return containsDuplicate(allWidths);
}

export async function getRootFramesFromBackend(): Promise<InitialData> {
  try {
    const response = (await postMan.send({
      workload: MSG_EVENTS.GET_ROOT_FRAMES,
    })) as IFrameData;

    if (isEmpty(response.frames)) {
      throw NOTIFICATIONS_IDS.ERROR_MISSING_FRAMES;
    }

    if (multipleFramesWithSameWidth(response.frames)) {
      throw NOTIFICATIONS_IDS.ERROR_MULTIPLE_SAME_WIDTH;
    }

    return {
      ...response,
      selectedFrames: Object.keys(response.frames),
    };
  } catch (err) {
    if (err instanceof Error) {
      console.error("Failed to fetch initial data", err);
      throw NOTIFICATIONS_IDS.ERROR_FAILED_TO_FETCH_DATA;
    } else {
      throw err;
    }
  }
}

export async function renderSvg(frameIds: string[]): Promise<string> {
  if (frameIds.length === 0) {
    return "";
  }

  try {
    const response = (await postMan.send({
      workload: MSG_EVENTS.RENDER,
      data: frameIds,
    })) as FrameRender;

    const { svgData, imageNodeDimensions } = response;
    const svg = await decodeSvgToString(svgData, imageNodeDimensions);

    return svg;
  } catch (err) {
    console.error("Failed to render backend SVG", err);
    throw NOTIFICATIONS_IDS.ERROR_FAILED_TO_RENDER_BACKEND_SVG;
  }
}

export async function saveToFigma(propName: EMBED_PROPERTIES, value: string) {
  try {
    await postMan.send({
      workload: MSG_EVENTS.UPDATE_HEADLINES,
      data: { propName, value },
    });
  } catch (err) {
    console.error(err);
  }
}
