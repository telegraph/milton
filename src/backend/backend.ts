import { MSG_EVENTS } from "constants";
import { postMan } from "utils/messages";
import { generateEmbedHtml, generateIframeHtml } from "backend/outputRender";
import {
  getRootFrames,
  renderFrames,
  setHeadlinesAndSource,
} from "utils/helpers";

// Register messenger event functions
postMan.registerWorker(MSG_EVENTS.GET_ROOT_FRAMES, getRootFrames);
postMan.registerWorker(MSG_EVENTS.RENDER, renderFrames);
postMan.registerWorker(MSG_EVENTS.UPDATE_HEADLINES, setHeadlinesAndSource);
postMan.registerWorker(MSG_EVENTS.RENDER_EMBED_HTML, generateEmbedHtml);
postMan.registerWorker(MSG_EVENTS.RENDER_IFRAME_HTML, generateIframeHtml);

// Render the DOM
figma.showUI(__html__);

// Resize UI to max viewport dimensions
const { width, height } = figma.viewport.bounds;
const { zoom } = figma.viewport;
const initialWindowWidth = Math.round(width * zoom);
const initialWindowHeight = Math.round(height * zoom);
figma.ui.resize(initialWindowWidth, initialWindowHeight);
