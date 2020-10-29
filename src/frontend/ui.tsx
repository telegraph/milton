import { h, render } from "preact";
import { App } from "frontend/components/App";
import { MSG_EVENTS } from "constants";
import { postMan } from "utils/messages";
import { resizeAndOptimiseImage } from "frontend/imageHelper";

// Load CSS via esbuild CSS loader
import "./ui.css";

// Register messenger event functions
postMan.registerWorker(MSG_EVENTS.COMPRESS_IMAGE, resizeAndOptimiseImage);

// Render app
render(<App />, document.body);
