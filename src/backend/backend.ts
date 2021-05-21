import { DEFAULT_WINDOW_SIZE, MSG_EVENTS } from "constants";
import { postMan } from "utils/messages";

import {
  getRootFrames,
  renderFrames,
  setEmbedProperties,
  resizeWindow,
} from "backend/figmaUtils";

// Register messenger event functions
postMan.registerWorker(MSG_EVENTS.GET_ROOT_FRAMES, getRootFrames);
postMan.registerWorker(MSG_EVENTS.RENDER, renderFrames);
postMan.registerWorker(MSG_EVENTS.UPDATE_HEADLINES, setEmbedProperties);
postMan.registerWorker(MSG_EVENTS.RESIZE_WINDOW, resizeWindow);

// Render the DOM
figma.showUI(__html__);

// Resize UI to max viewport dimensions
figma.ui.resize(DEFAULT_WINDOW_SIZE.width, DEFAULT_WINDOW_SIZE.height);
