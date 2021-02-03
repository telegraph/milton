import { ERRORS, STATUS } from "constants";
import { FigmaFramesType } from "types";
import { toggleItem } from "utils/common";
import { ACTIONS, ActionTypes } from "./actions";

interface StateInterface {
  status: STATUS;
  selectedFrames: string[];
  figmaFrames: FigmaFramesType;
  headline: string;
  subhead: string;
  source: string;
  sourceUrl: string;
  embedUrl: string;
  responsive: boolean;
  svg: string;
  error?: ERRORS;
}

export const initialState: StateInterface = {
  status: STATUS.LOADING,
  figmaFrames: {},
  selectedFrames: [],
  headline: "",
  subhead: "",
  source: "",
  sourceUrl: "",
  embedUrl: "",
  responsive: true,
  svg: "",
};

export function reducer(
  state: StateInterface,
  action: ActionTypes
): StateInterface {
  switch (action.type) {
    case ACTIONS.SET_HEADLINE:
      return { ...state, headline: action.payload };

    case ACTIONS.SET_SUBHEAD:
      return { ...state, subhead: action.payload };

    case ACTIONS.SET_SOURCE:
      return { ...state, source: action.payload };

    case ACTIONS.SET_SOURCE_URL:
      return { ...state, sourceUrl: action.payload };

    case ACTIONS.SET_EMBED_URL:
      return { ...state, embedUrl: action.payload };

    case ACTIONS.SET_STATUS:
      return { ...state, status: action.payload };

    case ACTIONS.SET_FRAMES:
      return { ...state, figmaFrames: action.payload };

    case ACTIONS.SET_SELECTED_FRAMES:
      return { ...state, selectedFrames: action.payload };

    case ACTIONS.SET_RESPONSIVE:
      return { ...state, responsive: action.payload };

    case ACTIONS.SET_SVG:
      return { ...state, svg: action.payload };

    case ACTIONS.TOGGLE_SELECTED_FRAME: {
      return {
        ...state,
        selectedFrames: toggleItem(action.payload, state.selectedFrames),
      };
    }

    case ACTIONS.SET_ERROR:
      return { ...state, status: STATUS.ERROR, error: action.payload };

    default:
      throw new Error("Unknown action type") as never;
  }
}
