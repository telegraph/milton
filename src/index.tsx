import { MSG_EVENTS } from "./constants";
import { MsgFramesType, MsgNoFramesType, MsgRenderType, MsgErrorType } from "./ui";

// Listen for messages from the UI
// NOTE: Listen for DOM_READY message to kick-off main function
figma.ui.on("message", (e) => handleReceivedMsg(e));

// Render the DOM
// NOTE: on successful UI render a post message is send back of DOM_READY
figma.showUI(__html__);

// Resize UI to max viewport dimensions
const { width, height } = figma.viewport.bounds;
const { zoom } = figma.viewport;
const initialWindowWidth = Math.round(width * zoom);
const initialWindowHeight = Math.round(height * zoom);
figma.ui.resize(initialWindowWidth, initialWindowHeight);

function getRootFrames() {
  const { currentPage } = figma;
  const rootFrames = currentPage.children.filter((node) => node.type === "FRAME") as FrameNode[];

  // Return error if there's no frames on the current page
  if (rootFrames.length < 1) {
    console.warn("No frames");
    figma.ui.postMessage({ type: MSG_EVENTS.NO_FRAMES } as MsgNoFramesType);
    return;
  }

  const headlinesAndSource = getHeadlinesAndSource(currentPage);

  const framesData = rootFrames.map((frame) => {
    const { name, width, height, id } = frame;
    const textNodes = getTextNodes(frame);

    return {
      name,
      width,
      height,
      id,
      textNodes,
      responsive: false,
      selected: true,
    };
  });

  figma.ui.postMessage({
    type: MSG_EVENTS.FOUND_FRAMES,
    frames: framesData,
    windowWidth: initialWindowWidth,
    windowHeight: initialWindowHeight,
    ...headlinesAndSource,
  } as MsgFramesType);
}

async function handleRender(frameId: string) {
  try {
    const frame = figma.getNodeById(frameId);
    if (!frame || frame.type !== "FRAME") {
      throw new Error("Missing frame");
    }

    const svg = await frame.exportAsync({
      format: "SVG",
      svgOutlineText: false,
      svgSimplifyStroke: true,
    });

    figma.ui.postMessage({
      type: MSG_EVENTS.RENDER,
      frameId,
      svg,
    } as MsgRenderType);
  } catch (err) {
    figma.ui.postMessage({
      type: MSG_EVENTS.ERROR,
      errorText: `Render failed: ${err ?? err.message}`,
    } as MsgErrorType);
  }
}

export type textNodeSelectedProps = Pick<
  TextNode,
  | "x"
  | "y"
  | "width"
  | "height"
  | "characters"
  | "lineHeight"
  | "letterSpacing"
  | "textAlignHorizontal"
  | "textAlignVertical"
>;

export interface textData extends textNodeSelectedProps {
  colour: { r: number; g: number; b: number; a: number };
  fontSize: number;
  fontFamily: string;
  fontStyle: string;
}

// Extract object properties from textNode for passing via postMessage
function getTextNodes(frame: FrameNode): textData[] {
  const textNodes = frame.findAll(({ type }) => type === "TEXT") as TextNode[];
  const { absoluteTransform } = frame;
  const rootX = absoluteTransform[0][2];
  const rootY = absoluteTransform[1][2];

  return textNodes.map(
    (node): textData => {
      const {
        absoluteTransform,
        width,
        height,
        fontSize: fontSizeData,
        fontName,
        fills,
        characters,
        lineHeight,
        letterSpacing,
        textAlignHorizontal,
        textAlignVertical,
      } = node;

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
      // TODO: Confirm fallback fonts
      let fontFamily = "Arial";
      let fontStyle = "Regular";
      if (fontName !== figma.mixed) {
        fontFamily = fontName.family;
        fontStyle = fontName.style;
      }

      return {
        x,
        y,
        width,
        height,
        fontSize,
        fontFamily,
        fontStyle,
        colour,
        characters,
        lineHeight,
        letterSpacing,
        textAlignHorizontal,
        textAlignVertical,
      };
    }
  );
}

function getHeadlinesAndSource(pageNode: PageNode) {
  const NODE_NAMES = ["headline", "subhead", "source"];

  const result: { [id: string]: string | undefined } = {};
  for (const name of NODE_NAMES) {
    const node = pageNode.findChild((node) => node.name === name && node.type === "TEXT") as TextNode | null;

    result[name] = node?.characters;
  }

  return result;
}

export interface PostMsg {
  type: MSG_EVENTS;
  frameId: string;
  width: number;
  height: number;
}
// Handle messages from the UI
function handleReceivedMsg(msg: PostMsg) {
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
      getRootFrames();
      break;

    case MSG_EVENTS.RENDER:
      console.log("plugin msg: render", frameId);
      handleRender(frameId);
      break;

    case MSG_EVENTS.RESIZE:
      console.log("plugin msg: resize");
      figma.ui.resize(width, height);
      break;

    default:
      console.error("Unknown post message", msg);
  }
}
