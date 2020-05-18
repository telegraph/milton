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
  NO_TARGET_FRAMES,
  FOUND_FRAMES,
  RENDER,
  CLOSE,
  ERROR,
}

export enum BREAKPOINTS {
  Mobile = 340,
  Tablet = 520,
  Desktop = 1024,
}

export const UI_TEXT = {
  ERROR_UNEXPECTED: 'Unexpected error',
  ERROR_MISSING_FRAMES: 'No frames found. Please add some frames to the page.',
  WARN_NO_TARGETS: 'Standard frames not found. Please select target frames.',
  WARN_TOO_MANY_TARGETS: 'Please select three target frames',
  INFO_PREVIEW: 'Preview each frame output',
  TITLE_CHOOSE_FRAME: 'Choose which frames to export',
  TITLE_PREVIEW: 'Preview each frame',
  TILE_OUTPUT: 'Export',
};
