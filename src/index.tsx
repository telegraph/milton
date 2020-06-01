import { MSG_EVENTS } from "./constants";
import { MsgFramesType, MsgNoFramesType, MsgRenderType, MsgErrorType, FrameDataType } from "./ui";

// Generate a unique id prefixed with identifer string for safe use as HTML ID
// Note: Figma seems to stub .toString for security?
function genRandomUid() {
  const rnd = Math.random();
  const uid = rnd.toString().substr(2);
  return `f2h-${uid}`;
}

async function getFrameSvgAsString(frame: SceneNode): Promise<string> {
  const svgBuff = await frame.exportAsync({
    format: "SVG",
    svgOutlineText: false,
    svgSimplifyStroke: true,
  });

  return String.fromCharCode.apply(null, Array.from(svgBuff));
}

export interface PostMsg {
  type: MSG_EVENTS;
  frameId: string;
  width: number;
  height: number;
}
// Handle messages from the UI
const handleReceivedMsg = (msg: PostMsg) => {
  const { type, width, height, frameId } = msg;

  switch (type) {
    case MSG_EVENTS.ERROR:
      console.log("plugin msg: error");
      break;

    case MSG_EVENTS.CLOSE:
      console.log("plugin msg: close");
      figma.closePlugin();
      break;

    case MSG_EVENTS.DOM_READY:
      console.log("plugin msg: DOM READY");
      main();
      break;

    case MSG_EVENTS.RENDER:
      console.log("plugin msg: render", frameId);
      renderFrame(frameId)
        .then((svgStr) => {
          figma.ui.postMessage({
            type: MSG_EVENTS.RENDER,
            frameId,
            svgStr,
          } as MsgRenderType);
        })
        .catch((err) => {
          figma.ui.postMessage({
            type: MSG_EVENTS.ERROR,
            errorText: `Render failed: ${err ?? err.message}`,
          } as MsgErrorType);
        });
      break;

    case MSG_EVENTS.RESIZE:
      console.log("plugin msg: resize");
      figma.ui.resize(width, height);
      break;

    default:
      console.error("Unknown post message", msg);
  }
};

// Listen for messages from the UI
figma.ui.on("message", (e) => handleReceivedMsg(e));

const main = () => {
  const { currentPage } = figma;

  // Get default frames names
  const allFrames = currentPage.children.filter((node) => node.type === "FRAME") as FrameNode[];

  if (allFrames.length > 0) {
    const framesData: { [id: string]: FrameDataType } = {};

    allFrames.forEach((frame) => {
      const { name, width, height, id } = frame;
      const textNodes = getTextNodes(frame);
      const uid = genRandomUid();

      framesData[id] = {
        name,
        width,
        height,
        id,
        textNodes,
        uid,
        responsive: false,
        selected: true,
      };
    });

    figma.ui.postMessage({
      type: MSG_EVENTS.FOUND_FRAMES,
      frames: framesData,
    } as MsgFramesType);

    return;
  }

  if (allFrames.length < 1) {
    console.warn("No frames");
    figma.ui.postMessage({ type: MSG_EVENTS.NO_FRAMES } as MsgNoFramesType);
    return;
  }
};

// Render the DOM
figma.showUI(__html__);
figma.ui.resize(figma.viewport.bounds.width, figma.viewport.bounds.height);

async function renderFrame(frameId: string) {
  const frame = figma.getNodeById(frameId);
  if (!frame || frame.type !== "FRAME") {
    throw new Error("Missing frame");
  }

  let svgStr = await getFrameSvgAsString(frame);

  // NOTE: Figma generates non-unique IDs for masks which can clash when
  // embedding multiple SVGSs. We do a string replace for unique IDs
  const regex = /id="(.+?)"/g;
  const ids: string[] = [];
  let matches;

  while ((matches = regex.exec(svgStr))) {
    const [, id] = matches;
    ids.push(id);
  }

  ids.forEach((id) => {
    const randomId = `${id}-${genRandomUid()}`;
    // Replace ID
    svgStr = svgStr.replace(`id="${id}"`, `id="${randomId}"`);
    // Replace anchor refs
    svgStr = svgStr.replace(`#${id}`, `#${randomId}`);
  });

  return svgStr;
}

export type textNodeSelectedProps = Pick<TextNode, "x" | "y" | "width" | "height" | "characters">;

export interface textData extends textNodeSelectedProps {
  colour: { r: number; g: number; b: number; a: number };
  fontSize: number;
  fontFamily: string;
}

// Extract object properties from textNode for passing via postMessage
function getTextNodes(frame: FrameNode): textData[] {
  const textNodes = frame.findAll(({ type }) => type === "TEXT") as TextNode[];
  const { absoluteTransform } = frame;
  const rootX = absoluteTransform[0][2];
  const rootY = absoluteTransform[1][2];

  return textNodes.map(
    (node): textData => {
      const { absoluteTransform, width, height, fontSize: fontSizeData, fontName, fills, characters } = node;

      // NOTE: Figma node x, y are relative to first parent, we want them
      // relative to the root frame
      const textX = absoluteTransform[0][2];
      const textY = absoluteTransform[1][2];
      const x = textX - rootX;
      const y = textY - rootY;

      // Extract basic fill colour
      const [fill] = fills;
      let colour = { r: 0, g: 0, b: 0, a: 1 };
      if (fill.type === "SOLID") {
        colour = { ...colour, a: fill.opacity || 1 };
      }

      // Extract font family
      let fontSize = 16;
      if (fontSizeData !== figma.mixed) {
        fontSize = fontSizeData;
      }

      // Extract font family
      let fontFamily = "Arial";
      if (fontName !== figma.mixed) {
        fontFamily = fontName.family;
      }

      return { x, y, width, height, fontSize, fontFamily, colour, characters };
    }
  );
}
