/* eslint-disable @typescript-eslint/ban-ts-comment */
import { h, render } from "preact";
import { injectCss } from "./utils/css";
import { App } from "./components/App";
import { postMan } from "utils/messages";
import { MSG_EVENTS } from "constants";
import { compressImage } from "helpers";
import { version } from "../package.json";

// Import CSS files as plain text via esbuild loader option
// @ts-expect-error
import uiCss from "./ui.css";
// @ts-expect-error
import fontsCss from "./fonts.css";
// @ts-expect-error
import embedCss from "./embed.css";

injectCss(uiCss);
injectCss(embedCss);
injectCss(fontsCss);

// Register post message workers
postMan.registerWorker(MSG_EVENTS.COMPRESS_IMAGE, compressImage);

// Render app
render(<App version={version} />, document.body);
