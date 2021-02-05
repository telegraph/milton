import { ERRORS, STATUS } from "constants";
import { FigmaFramesType } from "types";
import { toggleItem, URL_REGEX, addOnce, removeItem } from "utils/common";
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
      const errors =
        action.payload === "" || URL_REGEX.test(action.payload)
          ? removeItem(ERRORS.INPUT_INVALID_URL, state.errors)
          : addOnce(ERRORS.INPUT_INVALID_URL, state.errors);

      return { ...state, sourceUrl: action.payload, errors };
    }

    case ACTIONS.SET_EMBED_URL: {
      const errors =
        action.payload === "" || URL_REGEX.test(action.payload)
          ? removeItem(ERRORS.INPUT_INVALID_URL, state.errors)
          : addOnce(ERRORS.INPUT_INVALID_URL, state.errors);

      return {
        ...state,
        embedUrl: action.payload,
        errors,
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
      const selection = toggleItem(action.payload, state.selectedFrames);
      const errors =
        selection.length > 0
          ? removeItem(ERRORS.NO_FRAMES_SELECTED, state.errors)
          : addOnce(ERRORS.NO_FRAMES_SELECTED, state.errors);

      return {
        ...state,
        selectedFrames: selection,
        errors: errors,
      };
    }

    case ACTIONS.SET_ERROR:
      const errors = state.errors.includes(action.payload)
        ? removeItem(action.payload, state.errors)
        : addOnce(action.payload, state.errors);

      return { ...state, errors: errors };

    default:
      throw new Error("Unknown action type") as never;
  }
}
