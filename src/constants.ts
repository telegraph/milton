export type board = {
  id: string;
  width: number;
  buffer: Uint8Array;
};

export enum STAGES {
  CHOOSE_FRAMES,
  PREVIEW_OUTPUT,
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
}

export enum BREAKPOINTS {
  Mobile = 340,
  Tablet = 520,
  Desktop = 1024,
}

export enum OUTPUT_FORMATS {
  INLINE,
  IFRAME,
}

export const UI_TEXT = {
  ERROR_UNEXPECTED: 'Unexpected error',
  ERROR_MISSING_FRAMES: 'No frames found. Please add some frames to the page.',
  WARN_NO_TARGETS: 'Standard frames not found. Please select target frames.',
  WARN_TOO_MANY_TARGETS: 'Please select three target frames',
  INFO_PREVIEW: 'Preview each frame output',
  TITLE_CHOOSE_FRAME: 'Choose which frames to export',
  TITLE_PREVIEW: 'Preview',
  TILE_OUTPUT: 'Export',
  BUTTON_NEXT: 'Next',
  BUTTON_DOWNLOAD: 'Download',
  BUTTON_PREVIOUS: 'Back',
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
