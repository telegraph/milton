import { MSG_EVENTS, HEADLINE_NODE_NAMES } from "./constants";
import {
  MsgNoFramesType,
  MsgRenderType,
  MsgErrorType,
  MsgCompressedImageType,
  textData,
  PostMsg,
  setHeadlinesAndSourceProps,
} from "types";

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

// TODO: Async image compression using callback array feels hacky.
// Take another look.
const compressionPool: {
  uid: string;
  callback: (img: Uint8Array) => void;
  timeout: number;
}[] = [];

function handleCompressedMsg(msg: MsgCompressedImageType) {
  const { uid, image } = msg;

  const poolItemIndex = compressionPool.findIndex((item) => item.uid === uid);
  if (poolItemIndex > -1) {
    compressionPool[poolItemIndex].callback(image);
    clearTimeout(compressionPool[poolItemIndex].timeout);
    compressionPool.splice(poolItemIndex, 1);
  }
}

function getRootFrames() {
  const { currentPage } = figma;
  const rootFrames = currentPage.children.filter(
    (node) => node.type === "FRAME"
  ) as FrameNode[];

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
  });
}

// TODO: Break out nested async logic
function compressImage(node: DefaultShapeMixin): Promise<void> {
  const newFills: Paint[] = [];
  return new Promise((resolve, _reject) => {
    const fills = node.fills === figma.mixed ? [] : [...node.fills];

    Promise.all(
      fills.map(async (paint) => {
        if (paint.type === "IMAGE" && paint.imageHash) {
          const image = figma.getImageByHash(paint.imageHash);
          const imageBytes = await image.getBytesAsync();
          const uid = Math.random().toString(32);

          // Send post message
          figma.ui.postMessage({
            type: MSG_EVENTS.COMPRESS_IMAGE,
            image: imageBytes,
            width: node.width,
            height: node.height,
            uid,
          });

          await new Promise((res) => {
            const timeout = setTimeout(() => {
              _reject("Compress image response timed out.");
            }, 5000);

            compressionPool.push({
              uid,

              callback: (image: Uint8Array) => {
                const newPaint = { ...paint };
                newPaint.imageHash = figma.createImage(image).hash;
                newFills.push(newPaint);
                res();
              },

              timeout,
            });
          });
        }
      })
    )
      .then(() => {
        node.fills = newFills;
        resolve();
      })
      .catch((err) => {
        console.error("compressing images", err);
      });
  });
}

async function handleRender(frameId: string) {
  let clone;

  try {
    const frame = figma.getNodeById(frameId);
    if (!frame || frame.type !== "FRAME") {
      throw new Error("Missing frame");
    }

    // frame.clipsContent = true;
    clone = frame.clone();
    console.log("clipping");
    clone.name = `[temp] ${frame.name}`;

    clone
      .findAll((node) => node.type === "TEXT")
      .forEach((node) => node.remove());

    const nodesWithPaintImages = clone.findAll((node) => {
      if ("fills" in node && node.fills !== figma.mixed) {
        return node.fills.some((fill) => "imageHash" in fill);
      } else {
        return false;
      }
    }) as DefaultShapeMixin[];

    await Promise.all(nodesWithPaintImages.map(compressImage));

    // Wait for Figma to process image hash otherwise the paint fill with have
    // an incorrect transform scale
    // TODO: Find better way
    if (nodesWithPaintImages.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log("RENDERING SVG");
    const svg = await clone.exportAsync({
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
    const msg = err instanceof Error ? err.message : "Unknown render error";
    figma.ui.postMessage({
      type: MSG_EVENTS.ERROR,
      errorText: `Render failed: ${msg}`,
    } as MsgErrorType);
    console.error("Failed to render SVG", err);
  } finally {
    clone?.remove();
  }
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
      const [fill] = fills === figma.mixed ? [] : fills;
      let colour = { r: 0, g: 0, b: 0, a: 1 };
      if (fill.type === "SOLID") {
        colour = { ...colour, a: fill.opacity || 1 };
      }

      // Extract font info
      // TODO: Confirm fallback fonts
      const fontSize = fontSizeData !== figma.mixed ? fontSizeData : 16;
      const fontFamily = fontName !== figma.mixed ? fontName.family : "Arial";
      const fontStyle = fontName !== figma.mixed ? fontName.style : "Regular";

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
    const node = pageNode.findChild(
      (node) => node.name === name && node.type === "TEXT"
    ) as TextNode | null;

    result[name] = node?.characters;
  }

  return result;
}

function setHeadlinesAndSource(props: setHeadlinesAndSourceProps) {
  const { pageNode } = props;
  const frames = pageNode.findChildren((node) => node.type === "FRAME");
  const mostLeftPos = Math.min(...frames.map((node) => node.x));
  const mostTopPos = Math.min(...frames.map((node) => node.y));

  for (const name of Object.values(HEADLINE_NODE_NAMES)) {
    let node =
      (pageNode.findChild(
        (node) => node.name === name && node.type === "TEXT"
      ) as TextNode) || null;
    const textContent = props[name];

    // Remove node if there's no text content
    if (node && !textContent) {
      node.remove();
      return;
    }

    if (!textContent) {
      return;
    }

    // Create node if it doesn't exist
    if (!node) {
      node = figma.createText();
      node.name = name;

      let y = mostTopPos - 60;
      if (name === HEADLINE_NODE_NAMES.HEADLINE) {
        y -= 60;
      } else if (name === HEADLINE_NODE_NAMES.SUBHEAD) {
        y -= 30;
      }

      node.relativeTransform = [
        [1, 0, mostLeftPos],
        [0, 1, y],
      ];
    }

    // Ensure text node is locked
    node.locked = true;

    // Load font
    const fontName =
      node.fontName !== figma.mixed ? node.fontName.family : "Roboto";
    const fontStyle =
      node.fontName !== figma.mixed ? node.fontName.style : "Regular";
    figma
      .loadFontAsync({ family: fontName, style: fontStyle })
      .then(() => {
        // Set text node content
        node.characters = props[name] || "";
      })
      .catch((err) => {
        console.error("Failed to load font", err);
      });
  }
}

// Handle messages from the UI
function handleReceivedMsg(msg: PostMsg) {
  switch (msg.type) {
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
      console.log("plugin msg: render", msg.frameId);
      handleRender(msg.frameId).catch((err) =>
        console.error("Failed to handle render", err)
      );
      break;

    case MSG_EVENTS.RESIZE:
      console.log("plugin msg: resize");
      figma.ui.resize(msg.width, msg.height);
      break;

    case MSG_EVENTS.UPDATE_HEADLINES:
      setHeadlinesAndSource({
        pageNode: figma.currentPage,
        headline: msg.headline,
        subhead: msg.subhead,
        source: msg.source,
      });
      break;

    case MSG_EVENTS.COMPRESSED_IMAGE:
      handleCompressedMsg(msg);
      break;

    default:
      console.error("Unknown post message", msg);
  }
}
