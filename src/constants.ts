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

export enum ERRORS {
  MISSING_FRAMES = "MISSING_FRAMES",
  MISSING_FONT = "MISSING_FONT",
  MULTIPLE_SAME_WIDTH = "MULTIPLE_SAME_WIDTH",
  FAILED_TO_FETCH_DATA = "FAILED_TO_FETCH_DATA",
  FAILED_TO_SET_EMBED_SETTINGS = "FAILED_TO_SET_EMBED_SETTINGS",
  NO_FRAMES_SELECTED = "NO_FRAMES_SELECTED",
  INPUT_EMBED_INVALID_URL = "INPUT_EMBED_INVALID_URL",
  INPUT_SOURCE_INVALID_URL = "INPUT_SOURCE_INVALID_URL",
  UNKNOWN = "UNKNOWN",
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
  BUTTON_NEXT: "Next",
  BUTTON_DOWNLOAD: "Download",
  BUTTON_PREVIOUS: "Back",
  ZOOM_TOOLTIP: "Zoom/view options",
  COPY_TO_CLIPBOARD: "Copy to clipboard",
  DOWNLOAD: "Download",
  ERRORS: {
    [ERRORS.MISSING_FRAMES]:
      "No frames found. Please add a frame and try again",
    [ERRORS.MULTIPLE_SAME_WIDTH]:
      "Some frames have the same width. All frame widths need to be different",
    [ERRORS.FAILED_TO_FETCH_DATA]: "Failed to fetch data",
    [ERRORS.INPUT_EMBED_INVALID_URL]:
      "Invalid embed URL. Please check and update the URL.",
    [ERRORS.INPUT_SOURCE_INVALID_URL]:
      "Invalid source URL. Please check and update the URL.",
    [ERRORS.NO_FRAMES_SELECTED]: "Need to select at least one frame.",
    [ERRORS.FAILED_TO_SET_EMBED_SETTINGS]: "Failed to save embed setting",
    [ERRORS.MISSING_FONT]: "Unknown font",
    [ERRORS.UNKNOWN]: "Unknown error",
  },
};

export const FRAME_WARNING_SIZE = 300;

export enum HEADLINE_NODE_NAMES {
  HEADLINE = "headline",
  SUBHEAD = "subhead",
  SOURCE = "source",
}
