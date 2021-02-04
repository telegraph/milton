import { ERRORS, STATUS } from "constants";
import { FigmaFramesType, IFrameData } from "types";

export enum ACTIONS {
  SET_TEXT,
  SET_HEADLINE,
  SET_SUBHEAD,
  SET_SOURCE,
  SET_SOURCE_URL,
  SET_EMBED_URL,
  SET_STATUS,
  SET_ERROR,
  SET_FRAMES,
  SET_RESPONSIVE,
  SET_SELECTED_FRAMES,
  SET_SVG,
  SET_INITIAL_DATA,
  TOGGLE_SELECTED_FRAME,
}

export function actionSetHeadlineText(
  headlineText: string
): { type: ACTIONS.SET_HEADLINE; payload: string } {
  return {
    type: ACTIONS.SET_HEADLINE,
    payload: headlineText,
  };
}

export function actionSetSubheadText(
  subheadText: string
): { type: ACTIONS.SET_SUBHEAD; payload: string } {
  return {
    type: ACTIONS.SET_SUBHEAD,
    payload: subheadText,
  };
}

export function actionSetSourceText(
  sourceText: string
): { type: ACTIONS.SET_SOURCE; payload: string } {
  return {
    type: ACTIONS.SET_SOURCE,
    payload: sourceText,
  };
}

export function actionSetSourceUrl(
  url: string
): { type: ACTIONS.SET_SOURCE_URL; payload: string } {
  return {
    type: ACTIONS.SET_SOURCE_URL,
    payload: url,
  };
}

export function actionSetEmbedUrl(
  url: string
): { type: ACTIONS.SET_EMBED_URL; payload: string } {
  return {
    type: ACTIONS.SET_EMBED_URL,
    payload: url,
  };
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

export function actionSetSvg(
  svg: string
): { type: ACTIONS.SET_SVG; payload: string } {
  return { type: ACTIONS.SET_SVG, payload: svg };
}

export function actionSetError(
  error: ERRORS
): { type: ACTIONS.SET_ERROR; payload: ERRORS } {
  return { type: ACTIONS.SET_ERROR, payload: error };
}

export function actionToggleSelectedFrame(
  id: string
): { type: ACTIONS.TOGGLE_SELECTED_FRAME; payload: string } {
  return { type: ACTIONS.TOGGLE_SELECTED_FRAME, payload: id };
}

export const actionStoreData = (
  figmaData: IFrameData
): { type: ACTIONS.SET_INITIAL_DATA; payload: IFrameData } => {
  return { type: ACTIONS.SET_INITIAL_DATA, payload: figmaData };
};

export type ActionTypes =
  | ReturnType<typeof actionSetHeadlineText>
  | ReturnType<typeof actionSetSubheadText>
  | ReturnType<typeof actionSetSourceText>
  | ReturnType<typeof actionSetSourceUrl>
  | ReturnType<typeof actionSetEmbedUrl>
  | ReturnType<typeof actionSetFrames>
  | ReturnType<typeof actionSetSelectedFrames>
  | ReturnType<typeof actionSetResponsive>
  | ReturnType<typeof actionSetSvg>
  | ReturnType<typeof actionSetStatus>
  | ReturnType<typeof actionToggleSelectedFrame>
  | ReturnType<typeof actionStoreData>
  | ReturnType<typeof actionSetError>;

export type dispatchType = (action: ActionTypes) => void;
