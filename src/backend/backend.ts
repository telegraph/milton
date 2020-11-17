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

const MIN_WIDTH = 600;
const WIDTH_PERCENTAGE = 0.8;
const pluginWidth = Math.round(width * zoom * WIDTH_PERCENTAGE);
const initialWindowWidth = Math.max(pluginWidth, MIN_WIDTH);

const MIN_HEIGHT = 480;
const WINDOW_HEADER_HEIGHT = 120;
const pluginHeight = Math.round(height * zoom) - WINDOW_HEADER_HEIGHT;
const initialWindowHeight = Math.max(pluginHeight, MIN_HEIGHT);

figma.ui.resize(initialWindowWidth, initialWindowHeight);
