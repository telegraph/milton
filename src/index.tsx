import { MSG_EVENTS } from "./constants";
import { postMan } from "./utils/messages";
import { getRootFrames, renderFrames } from "./helpers";

// Register messager event functions
postMan.registerWorker(MSG_EVENTS.GET_ROOT_FRAMES, getRootFrames);
postMan.registerWorker(MSG_EVENTS.RENDER, renderFrames);

// Render the DOM
figma.showUI(__html__);

// Resize UI to max viewport dimensions
const { width, height } = figma.viewport.bounds;
const { zoom } = figma.viewport;
const initialWindowWidth = Math.round(width * zoom);
const initialWindowHeight = Math.round(height * zoom);
figma.ui.resize(initialWindowWidth, initialWindowHeight);
