export enum STAGES {
  CHOOSE_FRAMES,
  RESPONSIVE_PREVIEW,
  SAVE_OUTPUT,
}

export const DEFAULT_WINDOW_SIZE = {
  width: 820,
  height: 560,
};

export enum EMBED_PROPERTIES {
  HEADLINE = "headline",
  SUBHEAD = "subhead",
  SOURCE = "source",
  SOURCE_URL = "sourceUrl",
  EMBED_URL = "embedUrl",
}

export enum STATUS {
  LOADING = "LOADING",
  IDLE = "IDLE",
  RENDERING = "RENDERING",
}

export enum MSG_EVENTS {
  FOUND_FRAMES,
  NO_FRAMES,
  RENDER,
  CLOSE,
  ERROR,
  UPDATE_HEADLINES,
  COMPRESS_IMAGE,
  GET_ROOT_FRAMES,
  RENDER_EMBED_HTML,
  RENDER_IFRAME_HTML,
  MIN_MAX_WINDOW,
  RESIZE_WINDOW,
}

export enum OUTPUT_FORMATS {
  INLINE,
  IFRAME,
}

export enum NOTIFICATION_TYPE {
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

export enum ERRORS {
  MISSING_FRAMES,
  MISSING_FILE_KEY,
  MISSING_FONT,
  MULTIPLE_SAME_WIDTH,
  FAILED_TO_FETCH_DATA,
  FAILED_TO_SET_EMBED_SETTINGS,
  NO_FRAMES_SELECTED,
  INPUT_EMBED_INVALID_URL,
  INPUT_SOURCE_INVALID_URL,
  UNKNOWN,
}

export const UI_TEXT = {
  INFO_PREVIEW: "Preview each frame output",
  TITLE_CHOOSE_FRAME: "Choose which frames to export",
  TITLE_PREVIEW: "Preview",
  TITLE_RESPONSIVE_PREVIEW: "Responsive preview",
  TILE_OUTPUT: "Export",
  TITLE_LINKS: "Add links to all frames",
  TITLE_BACKGROUND_COLOUR: "Preview background",
  TITLE_BACKGROUND_MODAL: "Background",
  BUTTON_NEXT: "Next",
  BUTTON_DOWNLOAD: "Download",
  BUTTON_PREVIOUS: "Back",
  ZOOM_TOOLTIP: "Zoom/view options",
  COPY_TO_CLIPBOARD: "Copy to clipboard",
  DOWNLOAD: "Download",
  RESPONSIVE_LABEL: "Responsive",
  EMBED_PROPS_HEADLINE_PLACEHOLDER: "Headline",
  EMBED_PROPS_SUB_HEAD_PLACEHOLDER: "Sub headline",
  EMBED_PROPS_SOURCE_PLACEHOLDER: "Source",
  EMBED_PROPS_URL_PLACEHOLDER: "Destination link https://...",
  EMBED_PROPS_SOURCE_URL_PLACEHOLDER: "Source link https://...",
  EMBED_PROPS_INVALID_URL: "Enter a valid link",
  WINDOW_MAXIMIZE: "Maximize",
  WINDOW_MINIMIZE: "Minimize",
  TAB_OPTIONS: "Options",
  TAB_COMPRESSION: "Compression",
  TAB_WRAPPER: "Wrapper",
};

export enum NOTIFICATIONS_IDS {
  INFO_CLIPBOARD_COPIED,
  ERROR_MISSING_FRAMES,
  ERROR_MULTIPLE_SAME_WIDTH,
  ERROR_FAILED_TO_FETCH_DATA,
  ERROR_NO_FRAMES_SELECTED,
  ERROR_FAILED_TO_SET_EMBED_SETTINGS,
  ERROR_MISSING_FONT,
  ERROR_UNKNOWN,
}

export const NOTIFICATIONS = {
  [NOTIFICATIONS_IDS.INFO_CLIPBOARD_COPIED]: {
    type: NOTIFICATION_TYPE.INFO,
    text: "👍 Success! Code copied to clipboard!",
  },
  [NOTIFICATIONS_IDS.ERROR_MISSING_FRAMES]: {
    type: NOTIFICATION_TYPE.ERROR,
    text: "👎 No frames found. Please add a frame and try again",
  },
  [NOTIFICATIONS_IDS.ERROR_MULTIPLE_SAME_WIDTH]: {
    type: NOTIFICATION_TYPE.ERROR,
    text: "👎 All frames widths need to be different. Please resize frames and try again",
  },
  [NOTIFICATIONS_IDS.ERROR_FAILED_TO_FETCH_DATA]: {
    type: NOTIFICATION_TYPE.ERROR,
    text: "😬 Failed to fetch data",
  },
  [NOTIFICATIONS_IDS.ERROR_NO_FRAMES_SELECTED]: {
    type: NOTIFICATION_TYPE.ERROR,
    text: "👎 No frames selected | You must select at least one frame to ‘copy to clipboard’ or ‘download’",
  },
  [NOTIFICATIONS_IDS.ERROR_FAILED_TO_SET_EMBED_SETTINGS]: {
    type: NOTIFICATION_TYPE.ERROR,
    text: "😬 Failed to save embed setting",
  },
  [NOTIFICATIONS_IDS.ERROR_MISSING_FONT]: {
    type: NOTIFICATION_TYPE.WARN,
    text: "😬 Unknown font",
  },
  [NOTIFICATIONS_IDS.ERROR_UNKNOWN]: {
    type: NOTIFICATION_TYPE.ERROR,
    text: "😬 Unknown error",
  },
};

export const FRAME_WARNING_SIZE = 300;

export enum HEADLINE_NODE_NAMES {
  HEADLINE = "headline",
  SUBHEAD = "subhead",
  SOURCE = "source",
}
