import { ERRORS, STATUS } from "constants";
import { FigmaFramesType } from "types";
import { toggleItem } from "utils/common";
import { ACTIONS, ActionTypes } from "./actions";

export interface EmbedProperties {
  headline: string;
  subhead: string;
  source: string;
  sourceUrl: string;
  embedUrl: string;
}

export interface StateInterface {
  status: STATUS;
  selectedFrames: string[];
  frames: FigmaFramesType;
  embedProperties: EmbedProperties;
  responsive: boolean;
  svg: string;
  zoom: number;
  errors: { [key in ERRORS]?: string };
}

export const initialState: StateInterface = {
  status: STATUS.LOADING,
  frames: {},
  selectedFrames: [],
  embedProperties: {
    headline: "",
    subhead: "",
    source: "",
    sourceUrl: "",
    embedUrl: "",
  },
  zoom: 1,
  responsive: true,
  svg: "",
  errors: {},
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
        status: STATUS.IDLE,
      };

    case ACTIONS.SET_EMBED_PROPERTY:
      return {
        ...state,
        embedProperties: { ...state.embedProperties, ...action.payload },
      };

    case ACTIONS.SET_STATUS:
      return { ...state, status: action.payload };

    case ACTIONS.SET_FRAMES:
      return { ...state, frames: action.payload };

    case ACTIONS.SET_SELECTED_FRAMES:
      return { ...state, selectedFrames: action.payload };

    case ACTIONS.SET_RESPONSIVE:
      return { ...state, responsive: action.payload };

    case ACTIONS.SET_ZOOM:
      return { ...state, zoom: action.payload };

    case ACTIONS.SET_SVG:
      return { ...state, svg: action.payload };

    case ACTIONS.TOGGLE_SELECTED_FRAME: {
      const newSelection = toggleItem(action.payload, state.selectedFrames);

      return {
        ...state,
        selectedFrames: newSelection,
      };
    }

    case ACTIONS.SET_ERROR:
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.payload.error]: action.payload.message,
        },
      };

    case ACTIONS.CLEAR_ERROR:
      const newError = { ...state.errors };
      delete newError[action.payload];

      return {
        ...state,
        errors: newError,
      };

    default:
      throw new Error("Unknown action type") as never;
  }
}
