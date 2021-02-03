import { ERRORS, STATUS } from "constants";
import { FigmaFramesType, IFrameData } from "types";

interface StateInterface {
  status: STATUS;
  selectedFrames: string[];
  figmaFrames: FigmaFramesType;
  renderedFrames: Record<string, Uint8Array>;
  outputFrames: Record<string, string>;
  headline: string;
  subhead: string;
  source: string;
  responsive: boolean;
  svg: string;
  error?: ERRORS;
}

export const initialState: StateInterface = {
  status: STATUS.LOADING,
  figmaFrames: {},
  renderedFrames: {},
  outputFrames: {},
  selectedFrames: [],
  headline: "",
  subhead: "",
  source: "",
  responsive: true,
  svg: "",
};

enum ActionTypes {
  SET_TEXT,
  SET_STATUS,
  SET_ERROR,
  SET_FRAMES,
  SET_RESPONSIVE,
  SET_SELECTED_FRAMES,
  SET_SVG,
  TOGGLE_SELECTED_FRAME,
}

export function actionSetText(props: {
  headline?: string;
  subhead?: string;
  source?: string;
}): {
  type: ActionTypes.SET_TEXT;
  payload: { headline?: string; subhead?: string; source?: string };
} {
  return {
    type: ActionTypes.SET_TEXT,
    payload: props,
  };
}

export function actionSetFrames(
  frames: FigmaFramesType
): { type: ActionTypes.SET_FRAMES; payload: FigmaFramesType } {
  return { type: ActionTypes.SET_FRAMES, payload: frames };
}

export function actionSetSelectedFrames(
  frameIds: string[]
): { type: ActionTypes.SET_SELECTED_FRAMES; payload: string[] } {
  return { type: ActionTypes.SET_SELECTED_FRAMES, payload: frameIds };
}

export function actionSetStatus(
  status: STATUS
): { type: ActionTypes.SET_STATUS; payload: STATUS } {
  return { type: ActionTypes.SET_STATUS, payload: status };
}

export function actionSetResponsive(
  responsive: boolean
): { type: ActionTypes.SET_RESPONSIVE; payload: boolean } {
  return { type: ActionTypes.SET_RESPONSIVE, payload: responsive };
}

export function actionSetSvg(
  svg: string
): { type: ActionTypes.SET_SVG; payload: string } {
  return { type: ActionTypes.SET_SVG, payload: svg };
}

export function actionSetError(
  error: ERRORS
): { type: ActionTypes.SET_ERROR; payload: ERRORS } {
  return { type: ActionTypes.SET_ERROR, payload: error };
}

export function actionToggleSelectedFrame(
  id: string
): { type: ActionTypes.TOGGLE_SELECTED_FRAME; payload: string } {
  return { type: ActionTypes.TOGGLE_SELECTED_FRAME, payload: id };
}

export type dispatchType = (action: ReducerProps) => void;
export const actionStoreData = (
  dispatch: dispatchType,
  figmaData: IFrameData
): Promise<void> => {
  const { headline, subhead, source, frames } = figmaData;

  console.log("actionStoreData", "actionSetFrames");
  dispatch(actionSetFrames(frames));
  console.log("actionStoreData", "actionSetSelectedFrames");
  dispatch(actionSetSelectedFrames(Object.keys(frames)));
  console.log("actionStoreData", "actionSetText");
  dispatch(actionSetText({ headline, subhead, source }));
  console.log("actionStoreData", "actionSetStatus");
  dispatch(actionSetStatus(STATUS.READY));
  return Promise.resolve();
};

export type ReducerProps =
  | ReturnType<typeof actionSetText>
  | ReturnType<typeof actionSetFrames>
  | ReturnType<typeof actionSetSelectedFrames>
  | ReturnType<typeof actionSetResponsive>
  | ReturnType<typeof actionSetSvg>
  | ReturnType<typeof actionSetStatus>
  | ReturnType<typeof actionToggleSelectedFrame>
  | ReturnType<typeof actionSetError>;

export function reducer(
  state: StateInterface,
  action: ReducerProps
): StateInterface {
  switch (action.type) {
    case ActionTypes.SET_TEXT:
      return {
        ...state,
        ...action.payload,
      };

    case ActionTypes.SET_STATUS:
      return {
        ...state,
        status: action.payload,
      };

    case ActionTypes.SET_FRAMES:
      return {
        ...state,
        figmaFrames: action.payload,
      };

    case ActionTypes.SET_SELECTED_FRAMES:
      return {
        ...state,
        selectedFrames: action.payload,
      };

    case ActionTypes.SET_RESPONSIVE:
      return {
        ...state,
        responsive: action.payload,
      };

    case ActionTypes.SET_SVG:
      return {
        ...state,
        svg: action.payload,
      };

    case ActionTypes.TOGGLE_SELECTED_FRAME: {
      let frameIds: string[];
      const { selectedFrames } = state;
      const frameIsSelected = selectedFrames.includes(action.payload);

      if (frameIsSelected) {
        frameIds = selectedFrames.filter((val) => val !== action.payload);
      } else {
        frameIds = [...selectedFrames, action.payload];
      }

      return {
        ...state,
        selectedFrames: frameIds,
      };
    }

    case ActionTypes.SET_ERROR:
      return {
        ...state,
        status: STATUS.ERROR,
        error: action.payload,
      };

    default:
      throw new Error("Unknown action type") as never;
  }
}
