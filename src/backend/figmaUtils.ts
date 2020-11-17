import {
  setHeadlinesAndSourceProps,
  IFrameData,
  FrameRender,
  FrameDataInterface,
} from "types";
import { getNodeText, getTextNodesFromFrame } from "utils/figmaText";
import { HEADLINE_NODE_NAMES } from "../constants";

/**
 * Test if Figma node supports fill property type
 * @context figma
 */
function supportsFills(
  node: SceneNode
): node is Exclude<SceneNode, SliceNode | GroupNode> {
  return node.type !== "SLICE" && node.type !== "GROUP";
}

/**
 * Render all specified frames out as SVG element.
 * Images are optimised for size and image type compression via the frontend UI
 *
 * @context figma
 */
export async function renderFrames(frameIds: string[]): Promise<FrameRender> {
  const outputNode = figma.createFrame();
  outputNode.name = "output";

  try {
    // Clone each selected frame adding them to the temporary container frame
    const frames = figma.currentPage.findAll(({ id }) => frameIds.includes(id));
    if (frames.length < 1) {
      throw new Error(`No frames found to render ${frameIds.join(" ,")}`);
    }

    // Calculate the max dimensions for output container frame
    const maxWidth = Math.max(...frames.map((f) => f.width));
    const maxHeight = Math.max(...frames.map((f) => f.height));
    outputNode.resizeWithoutConstraints(maxWidth, maxHeight);

    for (const frame of frames) {
      const clone = frame?.clone() as FrameNode;

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

    // Find all nodes with image fills
    const nodesWithImages = outputNode.findAll(
      (node) =>
        supportsFills(node) &&
        node.fills !== figma.mixed &&
        node.fills.some((fill) => fill.type === "IMAGE")
    );

    const imageNodeDimensions = nodesWithImages.map(
      ({ name, width, height }) => ({
        name,
        width,
        height,
      })
    );

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
    outputNode.remove();
  }
}

/**
 * Create, update or delete headline text in figma document from plugin UI
 *
 * @context figma
 */
export function setHeadlinesAndSource({
  headline,
  subhead,
  source,
}: setHeadlinesAndSourceProps): void {
  figma.currentPage.setPluginData("headline", headline);
  figma.currentPage.setPluginData("subhead", subhead);
  figma.currentPage.setPluginData("source", source);
}

export function createFrameData(node: FrameNode): FrameDataInterface {
  const { name, width, height, id } = node;
  const textNodes = getTextNodesFromFrame(node);

  const fixedPositionNodes = node.children
    .slice(node.children.length - node.numberOfFixedChildren)
    .map((node) => node.id);

  return {
    id,
    name,
    width,
    height,
    textNodes,
    fixedPositionNodes,
  };
}

/**
 * Find and return root frame nodes in current page
 *
 * @context figma
 */
export function getRootFrames(): IFrameData {
  const { currentPage } = figma;

  let selectedFrames = currentPage.selection.filter(
    (node) => node.type === "FRAME"
  ) as FrameNode[];

  if (selectedFrames.length === 0) {
    selectedFrames = currentPage.children.filter(
      (node) => node.type === "FRAME"
    ) as FrameNode[];
  }

  const frames = {};
  for (const frame of selectedFrames) {
    const { id } = frame;
    frames[id] = createFrameData(frame);
  }

  return {
    frames,
    headline: currentPage.getPluginData("headline"),
    subhead: currentPage.getPluginData("subhead"),
    source: currentPage.getPluginData("source"),
  };
}
