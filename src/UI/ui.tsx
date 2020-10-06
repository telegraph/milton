import { h, render } from "preact";
import { App } from "UI/components/App";
import { postMan } from "utils/messages";
import { MSG_EVENTS } from "constants";
import { compressImage } from "utils/helpers";
import { version } from "../../package.json";

// Load CSS via esbuild CSS loader
import "./ui.css";

// Register post message workers
postMan.registerWorker(MSG_EVENTS.COMPRESS_IMAGE, compressImage);

// Render app
render(<App version={version} />, document.body);
