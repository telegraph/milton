export enum STAGES {
  CHOOSE_FRAMES,
  PREVIEW_OUTPUT,
  RESPONSIVE_PREVIEW,
  SAVE_OUTPUT,
}

export enum MSG_EVENTS {
  DOM_READY,
  NO_FRAMES,
  FOUND_FRAMES,
  RESIZE,
  RENDER,
  CLOSE,
  ERROR,
  UPDATE_HEADLINES,
  COMPRESS_IMAGE,
  COMPRESSED_IMAGE,
}

export enum OUTPUT_FORMATS {
  INLINE,
  IFRAME,
}

export const UI_TEXT = {
  ERROR_UNEXPECTED: "Unexpected error",
  ERROR_MISSING_FRAMES: "No frames found. Please add some frames to the page.",
  WARN_NO_TARGETS: "Standard frames not found. Please select target frames.",
  WARN_TOO_MANY_TARGETS: "Please select three target frames",
  INFO_PREVIEW: "Preview each frame output",
  TITLE_CHOOSE_FRAME: "Choose which frames to export",
  TITLE_PREVIEW: "Preview",
  TITLE_RESPONSIVE_PREVIEW: "Responsive preview",
  TILE_OUTPUT: "Export",
  BUTTON_NEXT: "Next",
  BUTTON_DOWNLOAD: "Download",
  BUTTON_PREVIOUS: "Back",
};

export const INITIAL_UI_SIZE = {
  width: 480,
  height: 500,
  maxWidth: 1200,
  maxHeight: 900,
  minWidth: 420,
  minHeight: 480,
};

export const FRAME_WARNING_SIZE = 300;

export enum HEADLINE_NODE_NAMES {
  HEADLINE = "headline",
  SUBHEAD = "subhead",
  SOURCE = "source",
}
