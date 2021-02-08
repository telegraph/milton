import { ERRORS, STATUS } from "constants";
import { FigmaFramesType } from "types";
import { toggleItem, URL_REGEX } from "utils/common";
import { ACTIONS, ActionTypes } from "./actions";

interface StateInterface {
  status: STATUS;
  selectedFrames: string[];
  frames: FigmaFramesType;
  headline: string;
  subhead: string;
  source: string;
  sourceUrl: string;
  embedUrl: string;
  responsive: boolean;
  svg: string;
  errors: ERRORS[];
  errorInfo: { [key in ERRORS]?: string };
}

export const initialState: StateInterface = {
  status: STATUS.LOADING,
  frames: {},
  selectedFrames: [],
  headline: "",
  subhead: "",
  source: "",
  sourceUrl: "",
  embedUrl: "",
  responsive: true,
  svg: "",
  errors: [],
  errorInfo: {},
};

export function reducer(
  state: StateInterface,
  action: ActionTypes
): StateInterface {
  switch (action.type) {
    case ACTIONS.SET_INITIAL_DATA:
      return {
        ...state,
        ...action.payload,
        selectedFrames: Object.keys(action.payload.frames),
      };

    case ACTIONS.SET_HEADLINE:
      return { ...state, headline: action.payload };

    case ACTIONS.SET_SUBHEAD:
      return { ...state, subhead: action.payload };

    case ACTIONS.SET_SOURCE:
      return { ...state, source: action.payload };

    case ACTIONS.SET_SOURCE_URL: {
      const validUrl = action.payload === "" || URL_REGEX.test(action.payload);

      return {
        ...state,
        sourceUrl: action.payload,
        errors: toggleItem(
          ERRORS.INPUT_INVALID_SOURCE_URL,
          state.errors,
          validUrl
        ),
      };
    }

    case ACTIONS.SET_EMBED_URL: {
      const validUrl = action.payload === "" || URL_REGEX.test(action.payload);

      return {
        ...state,
        embedUrl: action.payload,
        errors: toggleItem(
          ERRORS.INPUT_INVALID_EMBED_URL,
          state.errors,
          validUrl
        ),
      };
    }

    case ACTIONS.SET_STATUS:
      return { ...state, status: action.payload };

    case ACTIONS.SET_FRAMES:
      return { ...state, frames: action.payload };

    case ACTIONS.SET_SELECTED_FRAMES:
      return { ...state, selectedFrames: action.payload };

    case ACTIONS.SET_RESPONSIVE:
      return { ...state, responsive: action.payload };

    case ACTIONS.SET_SVG:
      return { ...state, svg: action.payload };

    case ACTIONS.TOGGLE_SELECTED_FRAME: {
      const newSelection = toggleItem(action.payload, state.selectedFrames);
      const validSelection = newSelection.length > 0;

      return {
        ...state,
        selectedFrames: newSelection,
        errors: toggleItem(
          ERRORS.NO_FRAMES_SELECTED,
          state.errors,
          validSelection
        ),
      };
    }

    case ACTIONS.SET_ERROR:
      return {
        ...state,
        errors: toggleItem(
          action.payload.error,
          state.errors,
          action.payload.force ?? state.errors.includes(action.payload.error)
        ),
        errorInfo: {
          ...state.errorInfo,
          [action.payload.error]: action.payload.message,
        },
      };

    case ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        errors: toggleItem(action.payload, state.errors, true),
        errorInfo: { ...state.errorInfo, [action.payload]: "" },
      };

    default:
      throw new Error("Unknown action type") as never;
  }
}
