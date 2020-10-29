import { MSG_EVENTS } from "constants";
import { postMan } from "utils/messages";

import {
  getRootFrames,
  renderFrames,
  setHeadlinesAndSource,
} from "backend/figmaUtils";

// Register messenger event functions
postMan.registerWorker(MSG_EVENTS.GET_ROOT_FRAMES, getRootFrames);
postMan.registerWorker(MSG_EVENTS.RENDER, renderFrames);
postMan.registerWorker(MSG_EVENTS.UPDATE_HEADLINES, setHeadlinesAndSource);

// Render the DOM
const { ui_html } = __uiFiles__;
figma.showUI(ui_html);

// Resize UI to max viewport dimensions
const { width, height } = figma.viewport.bounds;
const { zoom } = figma.viewport;
const initialWindowWidth = Math.round(width * zoom);
const initialWindowHeight = Math.round(height * zoom);
figma.ui.resize(initialWindowWidth, initialWindowHeight);
