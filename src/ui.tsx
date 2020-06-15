/* eslint-disable @typescript-eslint/ban-ts-comment */
import { h, render } from "preact";
import { injectCss } from "./utils/css";
import { App } from "./components/App";

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

// Render app
render(<App />, document.body);
