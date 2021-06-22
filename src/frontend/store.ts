import { NOTIFICATIONS_IDS, STATUS } from "constants";
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
  zoom: number;
  breakpointWidth: number;
  backgroundColour: string;
  notificationId?: NOTIFICATIONS_IDS;
  notificationMessage?: string;
  fileKey: string;
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
  fileKey: "",
  responsive: true,
  breakpointWidth: 100,
  backgroundColour: "#C4C4C4",
  notificationId: undefined,
  notificationMessage: "",
};

export function reducer(
  state: StateInterface,
  action: ActionTypes
): StateInterface {
  console.log(action);
  switch (action.type) {
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

    case ACTIONS.SET_BREAKPOINT:
      return {
        ...state,
        breakpointWidth: action.payload.width,
      };

    case ACTIONS.SET_ZOOM:
      return { ...state, zoom: action.payload };

    case ACTIONS.SET_BACKGROUND_COLOUR:
      return { ...state, backgroundColour: action.payload };

    case ACTIONS.SET_NOTIFICATION:
      return {
        ...state,
        notificationId: action.payload.id,
        notificationMessage: action.payload.message || "",
      };

    case ACTIONS.CLEAR_NOTIFICATION:
      return {
        ...state,
        notificationId: undefined,
        notificationMessage: "",
      };

    default:
      throw new Error("Unknown action type") as never;
  }
}
