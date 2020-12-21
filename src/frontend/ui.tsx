import { h, render } from "preact";
import { App } from "frontend/components/App";
import { ErrorBoundary as ErrorBoundary } from "frontend/components/ErrorBoundary";
import { MSG_EVENTS } from "constants";
import { postMan } from "utils/messages";
import { resizeAndOptimiseImage } from "frontend/imageHelper";

// Load CSS via esbuild CSS loader
import uiCss from "./ui.css";
import { setHeadlinesAndSource } from "backend/figmaUtils";
const styleEl = window.document.createElement("style");
styleEl.appendChild(window.document.createTextNode(uiCss));
window.document.head.appendChild(styleEl);

// Register messenger event functions
postMan.registerWorker(MSG_EVENTS.COMPRESS_IMAGE, resizeAndOptimiseImage);
postMan.registerWorker(MSG_EVENTS.UPDATE_HEADLINES, setHeadlinesAndSource);

// Render app
render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
  document.body
);
