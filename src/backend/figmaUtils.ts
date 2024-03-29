import { EMBED_PROPERTIES } from "constants";
import { EmbedProperties } from "frontend/store";
import {
  FrameDataInterface,
  FrameRender,
  IFrameData,
  imageNodeDimensions,
} from "types";
import { URL_REGEX } from "utils/common";
import { getTextNodesFromFrame } from "utils/figmaText";

export function resizeWindow(size: { x: number; y: number }): void {
  figma.ui.resize(size.x, size.y);
  figma.clientStorage
    .setAsync("WINDOW_SIZE", {
      width: size.x,
      height: size.y,
    })
    .catch((error) => console.log("Failed to save window size", error));
}

function flattenBooleanGroups(frameNode: FrameNode): void {
  // Flatten boolean elements
  const booleanNodes = frameNode.findAll(
    (node) => node.type === "BOOLEAN_OPERATION"
  ) as BooleanOperationNode[];

  // Sort nodes based on child hierarchy
  booleanNodes.sort((a, b) => (a.children.includes(b) ? 1 : -1));

  for (const node of booleanNodes) {
    if (!node || !node.parent) break;
    const index = node.parent.children.indexOf(node);
    figma.flatten([node], node.parent, index);
  }
}

type ImageNode = Exclude<SceneNode, SliceNode | GroupNode>;

function supportsFills(node: SceneNode): node is ImageNode {
  return node.type !== "SLICE" && node.type !== "GROUP";
}

function getImageDimensions(frameNode: FrameNode): imageNodeDimensions[] {
  const maxImageNodeWidths: Record<
    string,
    { width: number; height: number; id: string }
  > = {};
  const imageSupportingNodes = frameNode.findAll(supportsFills) as ImageNode[];

  for (const node of imageSupportingNodes) {
    if (node.fills === figma.mixed) {
      continue;
    }

    for (const fill of node.fills) {
      if (fill.type === "IMAGE" && fill.visible && fill.imageHash) {
        const { imageHash } = fill;

        const cssId = "m_" + node.id.replaceAll(/\W/g, "_");
        node.name = cssId;

        const oldWidth = maxImageNodeWidths[imageHash]?.width ?? 0;

        if (node.width > oldWidth) {
          maxImageNodeWidths[imageHash] = {
            width: node.width,
            height: node.height,
            id: cssId,
          };
        }
      }
    }
  }

  return Object.values(maxImageNodeWidths);
}

function setRandomPrefixForUrlNodeNames(frameNode: FrameNode): void {
  frameNode
    .findAll(({ name }) => URL_REGEX.test(name))
    .forEach((node) => {
      const rndId = Math.random().toString(32).substr(2, 4);
      node.name = `n_${rndId}_${node.name}`;
    });
}

function resizeOutputToMaxSize(frameNode: FrameNode): void {
  const maxWidth = Math.max(...frameNode.children.map((f) => f.width));
  const maxHeight = Math.max(...frameNode.children.map((f) => f.height));
  frameNode.resizeWithoutConstraints(maxWidth, maxHeight);
}

function createCloneOfFrames(frames: FrameNode[]): FrameNode {
  const outputNode = figma.createFrame();
  outputNode.name = "output";
  outputNode.fills = [];

  for (const frame of frames) {
    const clone = frame?.clone();

    // NOTE: Previously text nodes were removed here but this caused
    // width changes in auto-layout. Text is removed as part of the
    // SVG optimisation step.

    // Append cloned frame to temp output frame and position in top left
    outputNode.appendChild(clone);
    clone.x = 0;
    clone.y = 0;

    // Store the frame ID as node name (exported in SVG props)
    clone.name = frame.id;
  }

  setRandomPrefixForUrlNodeNames(outputNode);

  return outputNode;
}

/**
 * Render all specified frames out as SVG element.
 * Images are optimised for size and image type compression via the frontend UI
 *
 * @context figma
 */
export async function renderFrames(frameIds: string[]): Promise<FrameRender> {
  let outputNode: FrameNode | null = null;

  try {
    // Clone each selected frame adding them to the temporary container frame
    const frames = figma.currentPage.findAll(({ id }) =>
      frameIds.includes(id)
    ) as FrameNode[];

    if (frames.length < 1) {
      throw new Error(`No frames found to render ${frameIds.join(" ,")}`);
    }

    outputNode = createCloneOfFrames(frames);
    resizeOutputToMaxSize(outputNode);
    flattenBooleanGroups(outputNode);
    const imageNodeDimensions = getImageDimensions(outputNode);

    // Render output container frames to SVG mark-up (in a uint8 byte array)
    const svgData = await outputNode.exportAsync({
      format: "SVG",
      svgSimplifyStroke: true,
      svgOutlineText: false,
      svgIdAttribute: true,
    });

    return {
      svgData,
      imageNodeDimensions,
    };
  } catch (err) {
    throw new Error(err);
  } finally {
    // Remove the output frame whatever happens
    outputNode?.remove();
  }
}

/**
 * Create, update or delete headline text in figma document from plugin UI
 *
 * @context figma
 */
export function setEmbedProperties(props: {
  propName: keyof EmbedProperties;
  value: string;
}): void {
  figma.currentPage.setPluginData(props.propName, props.value);
}

function figmaColourValueToCSS(colourValue: number): string {
  return Math.round(colourValue * 255).toString(10);
}

function getBackgroundColour(
  fills: readonly Paint[] | PluginAPI["mixed"]
): string {
  const DEFAULT_COLOUR = "transparent";
  if (fills === figma.mixed || !fills[0] || fills[0].type !== "SOLID") {
    return DEFAULT_COLOUR;
  }

  const { r, g, b } = fills[0].color;
  const red = figmaColourValueToCSS(r);
  const green = figmaColourValueToCSS(g);
  const blue = figmaColourValueToCSS(b);

  return `rgb(${red}, ${green}, ${blue})`;
}

export function createFrameData(node: FrameNode): FrameDataInterface {
  const { name, width, height, id, fills } = node;
  const backgroundColour = getBackgroundColour(fills);
  const textNodes = getTextNodesFromFrame(node);

  const fixedPositionNodes = node.children
    .slice(node.children.length - node.numberOfFixedChildren)
    .map((node) => node.id);

  return {
    id,
    name,
    width,
    height,
    backgroundColour,
    textNodes,
    fixedPositionNodes,
  };
}

/**
 * Find and return root frame nodes in current page
 *
 * @context figma
 */
export async function getRootFrames(): Promise<IFrameData> {
  const { currentPage } = figma;

  const rootFrames = currentPage.children.filter(
    (node) => node.type === "FRAME"
  ) as FrameNode[];

  rootFrames.sort((frameA, frameB) => {
    return frameA.width < frameB.width ? -1 : 1;
  });

  const userSelectedFrameIDs = currentPage.selection
    .filter((node) => node.type === "FRAME")
    .map((node) => node.id);

  if (rootFrames.length > 0 && userSelectedFrameIDs.length === 0) {
    userSelectedFrameIDs.push(rootFrames[0].id);
  }

  const frames: Record<string, FrameDataInterface> = {};

  for (const frame of rootFrames) {
    const { id } = frame;
    frames[id] = createFrameData(frame);
  }

  const customHTML = await figma.clientStorage.getAsync("CUSTOM_HTML");

  return {
    frames,
    selectedFrames: userSelectedFrameIDs,
    headline: currentPage.getPluginData(EMBED_PROPERTIES.HEADLINE),
    subhead: currentPage.getPluginData(EMBED_PROPERTIES.SUBHEAD),
    source: currentPage.getPluginData(EMBED_PROPERTIES.SOURCE),
    sourceUrl: currentPage.getPluginData(EMBED_PROPERTIES.SOURCE_URL),
    embedUrl: currentPage.getPluginData(EMBED_PROPERTIES.EMBED_URL),
    fileKey: figma.fileKey ?? "MISSING_KEY",
    customHTML: customHTML,
  };
}

export function setCustomHTML(text: string) {
  console.log("backend, saving custom HTML", text);

  figma.clientStorage
    .setAsync("CUSTOM_HTML", text)
    .catch((error) =>
      console.error("Failed to set custom HTML to local storage", error)
    );
}
