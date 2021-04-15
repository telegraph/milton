import { findMissingFonts } from "backend/fonts";
import {
  FigmaFramesType,
  FrameDataInterface,
  FrameRender,
  IFrameData,
} from "types";
import { ERRORS, MSG_EVENTS, STATUS } from "constants";
import { containsDuplicate, isEmpty } from "utils/common";
import { postMan } from "utils/messages";
import { EmbedProperties, StateInterface } from "./store";
import { decodeSvgToString } from "./svgUtils";

export enum ACTIONS {
  SET_EMBED_PROPERTY = "SET_EMBED_PROPERTY",
  SET_STATUS = "SET_STATUS",
  SET_ERROR = "SET_ERROR",
  SET_FRAMES = "SET_FRAMES",
  SET_RESPONSIVE = "SET_RESPONSIVE",
  SET_ZOOM = "SET_ZOOM",
  SET_BREAKPOINT = "SET_BREAKPOINT",
  SET_SELECTED_FRAMES = "SET_SELECTED_FRAMES",
  SET_SVG = "SET_SVG",
  SET_INITIAL_DATA = "SET_INITIAL_DATA",
  CLEAR_ERROR = "CLEAR_ERROR",
  TOGGLE_SELECTED_FRAME = "TOGGLE_SELECTED_FRAME",
}

export function actionSetFrames(
  frames: FigmaFramesType
): { type: ACTIONS.SET_FRAMES; payload: FigmaFramesType } {
  return { type: ACTIONS.SET_FRAMES, payload: frames };
}

export function actionSetSelectedFrames(
  frameIds: string[]
): { type: ACTIONS.SET_SELECTED_FRAMES; payload: string[] } {
  return { type: ACTIONS.SET_SELECTED_FRAMES, payload: frameIds };
}

export function actionSetStatus(
  status: STATUS
): { type: ACTIONS.SET_STATUS; payload: STATUS } {
  return { type: ACTIONS.SET_STATUS, payload: status };
}

export function actionSetResponsive(
  responsive: boolean
): { type: ACTIONS.SET_RESPONSIVE; payload: boolean } {
  return { type: ACTIONS.SET_RESPONSIVE, payload: responsive };
}

export function actionSetZoom(
  zoom: number
): { type: ACTIONS.SET_ZOOM; payload: number } {
  return { type: ACTIONS.SET_ZOOM, payload: zoom };
}

export function actionSetBreakpoint(
  index: number,
  width: number
): {
  type: ACTIONS.SET_BREAKPOINT;
  payload: { index: number; width: number };
} {
  return { type: ACTIONS.SET_BREAKPOINT, payload: { index, width } };
}

export function actionSetSvg(
  svg: string
): { type: ACTIONS.SET_SVG; payload: string } {
  return { type: ACTIONS.SET_SVG, payload: svg };
}

export function actionSetError(
  error: ERRORS,
  message = ""
): {
  type: ACTIONS.SET_ERROR;
  payload: { error: ERRORS; message: string };
} {
  return { type: ACTIONS.SET_ERROR, payload: { error, message } };
}

export function actionClearError(
  error: ERRORS
): { type: ACTIONS.CLEAR_ERROR; payload: ERRORS } {
  return { type: ACTIONS.CLEAR_ERROR, payload: error };
}

export function actionToggleSelectedFrame(
  id: string
): { type: ACTIONS.TOGGLE_SELECTED_FRAME; payload: string } {
  return { type: ACTIONS.TOGGLE_SELECTED_FRAME, payload: id };
}

type InitialData = Pick<
  StateInterface,
  "embedProperties" | "frames" | "selectedFrames" | "breakpointWidth"
>;
export const actionStoreInitialData = (
  figmaData: InitialData
): { type: ACTIONS.SET_INITIAL_DATA; payload: InitialData } => {
  return { type: ACTIONS.SET_INITIAL_DATA, payload: figmaData };
};

export const actionGetFrameData = () => {
  return (dispatch: DispatchType) => {
    dispatch(actionSetStatus(STATUS.LOADING));

    postMan
      .send({ workload: MSG_EVENTS.GET_ROOT_FRAMES })
      .then((response: IFrameData) => {
        if (isEmpty(response.frames)) {
          dispatch(actionSetError(ERRORS.MISSING_FRAMES));
          return;
        }

        const widths = Object.values(response.frames).map(({ width }) => width);
        if (containsDuplicate(widths)) {
          dispatch(actionSetError(ERRORS.MULTIPLE_SAME_WIDTH));
          return;
        }

        const selectedFrames = Object.keys(response.frames);
        const embedProperties: EmbedProperties = {
          headline: response.headline,
          subhead: response.subhead,
          source: response.source,
          sourceUrl: response.sourceUrl,
          embedUrl: response.embedUrl,
        };

        dispatch(
          actionStoreInitialData({
            frames: response.frames,
            embedProperties,
            selectedFrames,
            breakpointWidth: widths[0],
          })
        );
      })
      .catch(() => dispatch(actionSetError(ERRORS.FAILED_TO_FETCH_DATA)));
  };
};

export const actionFetchFrameRender = (frameIds: string[]) => {
  return async (dispatch: DispatchType) => {
    dispatch(actionSetStatus(STATUS.RENDERING));

    const response = (await postMan
      .send({ workload: MSG_EVENTS.RENDER, data: frameIds })
      .catch(console.error)) as FrameRender;

    const { svgData, imageNodeDimensions } = response;
    const svg = await decodeSvgToString(svgData, imageNodeDimensions);
    dispatch(actionSetSvg(svg));
    dispatch(actionSetStatus(STATUS.IDLE));
  };
};

export const actionUpdateSelectedFrames = (
  selectedFrames: string[],
  frames: FrameDataInterface[]
) => {
  return (dispatch: DispatchType) => {
    if (selectedFrames.length < 1) {
      return dispatch(actionSetError(ERRORS.NO_FRAMES_SELECTED));
    }

    actionCheckFonts(frames, dispatch);
    actionFetchFrameRender(selectedFrames)(dispatch);
    dispatch(actionClearError(ERRORS.NO_FRAMES_SELECTED));
  };
};

export const actionCheckFonts = (
  outputFrames: FrameDataInterface[],
  dispatch: DispatchType
) => {
  const missingFonts = findMissingFonts(outputFrames);

  if (missingFonts.length > 0) {
    const missingFontInfo = missingFonts.map(
      (missingInfo) =>
        `family=["${missingInfo.family}"] text=["${missingInfo.text}…"] frame=["${missingInfo.frame}"] layer["${missingInfo.layerName}"]`
    );
    dispatch(actionSetError(ERRORS.MISSING_FONT, missingFontInfo.join("\n")));
  }
  // && errors?.includes(ERRORS.MISSING_FONT)
  if (missingFonts.length === 0) {
    dispatch(actionClearError(ERRORS.MISSING_FONT));
  }
};

export const actionStoreEmbedProperty = (
  propName: keyof EmbedProperties,
  value: string
): {
  type: ACTIONS.SET_EMBED_PROPERTY;
  payload: { [ID in keyof EmbedProperties]?: string };
} => {
  return {
    type: ACTIONS.SET_EMBED_PROPERTY,
    payload: { [propName]: value },
  };
};

export const actionUpdateEmbedProps = (
  propName: keyof EmbedProperties,
  value: string
) => {
  return (dispatch: DispatchType) => {
    dispatch(actionStoreEmbedProperty(propName, value));
    postMan
      .send({
        workload: MSG_EVENTS.UPDATE_HEADLINES,
        data: {
          propName,
          value,
        },
      })
      .catch(() =>
        dispatch(actionSetError(ERRORS.FAILED_TO_SET_EMBED_SETTINGS))
      );
  };
};

export type ActionTypes =
  | ReturnType<typeof actionStoreEmbedProperty>
  | ReturnType<typeof actionSetFrames>
  | ReturnType<typeof actionSetSelectedFrames>
  | ReturnType<typeof actionSetResponsive>
  | ReturnType<typeof actionSetZoom>
  | ReturnType<typeof actionSetBreakpoint>
  | ReturnType<typeof actionSetSvg>
  | ReturnType<typeof actionSetStatus>
  | ReturnType<typeof actionToggleSelectedFrame>
  | ReturnType<typeof actionStoreInitialData>
  | ReturnType<typeof actionSetError>
  | ReturnType<typeof actionClearError>;

export type DispatchType = (action: ActionTypes) => void;
