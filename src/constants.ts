export enum STAGES {
  CHOOSE_FRAMES,
  RESPONSIVE_PREVIEW,
  SAVE_OUTPUT,
}

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
}

export enum OUTPUT_FORMATS {
  INLINE,
  IFRAME,
}

export enum NOTIFICATION_TYPE {
  INFO,
  WARN,
  ERROR,
}

export enum ERRORS {
  MISSING_FRAMES,
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
  ERROR_UNEXPECTED: "Unexpected error",
  ERROR_MISSING_FRAMES: "No frames found. Please add some frames to the page",
  WARN_NO_TARGETS: "Standard frames not found. Please select target frames",
  WARN_TOO_MANY_TARGETS: "Please select three target frames",
  INFO_PREVIEW: "Preview each frame output",
  TITLE_CHOOSE_FRAME: "Choose which frames to export",
  TITLE_PREVIEW: "Preview",
  TITLE_RESPONSIVE_PREVIEW: "Responsive preview",
  TILE_OUTPUT: "Export",
  TITLE_LINKS: "Add links to all frames",
  BUTTON_NEXT: "Next",
  BUTTON_DOWNLOAD: "Download",
  BUTTON_PREVIOUS: "Back",
  ZOOM_TOOLTIP: "Zoom/view options",
  COPY_TO_CLIPBOARD: "Copy to clipboard",
  DOWNLOAD: "Download",
  EMBED_PROPS_HEADLINE_PLACEHOLDER: "Headline",
  EMBED_PROPS_SUB_HEAD_PLACEHOLDER: "Sub headline",
  EMBED_PROPS_SOURCE_PLACEHOLDER: "Source",
  EMBED_PROPS_URL_PLACEHOLDER: "Embed URL",
  EMBED_PROPS_SOURCE_URL_PLACEHOLDER: "Source URL",
  EMBED_PROPS_INVALID_URL: "Enter a valid link",
};

export const NOTIFICATIONS = {
  WARN_CLIPBOARD_COPIED: {
    type: NOTIFICATION_TYPE.INFO,
    text: "👍 Success! Code copied to clipboard!",
  },
  ERROR_MISSING_FRAMES: {
    type: NOTIFICATION_TYPE.ERROR,
    text: "No frames found. Please add a frame and try again",
  },
  ERROR_MULTIPLE_SAME_WIDTH: {
    type: NOTIFICATION_TYPE.ERROR,
    text:
      "Some frames have the same width. All frame widths need to be different",
  },
  ERROR_FAILED_TO_FETCH_DATA: {
    type: NOTIFICATION_TYPE.ERROR,
    text: "Failed to fetch data",
  },
  ERROR_INPUT_EMBED_INVALID_URL: {
    type: NOTIFICATION_TYPE.ERROR,
    text: "Invalid embed URL. Please check and update the URL",
  },
  ERROR_INPUT_SOURCE_INVALID_URL: {
    type: NOTIFICATION_TYPE.ERROR,
    text: "Invalid source URL. Please check and update the URL",
  },
  ERROR_NO_FRAMES_SELECTED: {
    type: NOTIFICATION_TYPE.ERROR,
    text:
      "👎 No frames selected | You must select at least one frame to ‘copy to clipboard’ or ‘download’",
  },
  ERROR_FAILED_TO_SET_EMBED_SETTINGS: {
    type: NOTIFICATION_TYPE.ERROR,
    text: "Failed to save embed setting",
  },
  ERROR_MISSING_FONT: {
    type: NOTIFICATION_TYPE.ERROR,
    text: "Unknown font",
  },
  ERROR_UNKNOWN: {
    type: NOTIFICATION_TYPE.ERROR,
    text: "Unknown error",
  },
};

export const FRAME_WARNING_SIZE = 300;

export enum HEADLINE_NODE_NAMES {
  HEADLINE = "headline",
  SUBHEAD = "subhead",
  SOURCE = "source",
}

export const DEFAULT_BREAKPOINTS = [
  { width: 320, height: 320, default: true },
  { width: 480, height: 480, default: true },
  { width: 640, height: 480, default: true },
  { width: 720, height: 480, default: true },
  { width: 1024, height: 480, default: true },
  { width: 1200, height: 480, default: true },
];
