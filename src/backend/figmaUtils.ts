import { setHeadlinesAndSourceProps, IFrameData, FrameRender } from "types";
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
export function setHeadlinesAndSource(props: setHeadlinesAndSourceProps): void {
  const pageNode = figma.currentPage;
  const mostLeftPos = Math.min(...pageNode.children.map((node) => node.x));
  const mostTopPos = Math.min(...pageNode.children.map((node) => node.y));

  // Loop through each headline node names
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

    // Do nothing is there's no text content
    if (!textContent) {
      return;
    }

    // Create node if it doesn't already exist
    if (!node) {
      node = figma.createText();
      node.name = name;

      // Position new text node top-left of the first frame in the page
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

  const framesData = selectedFrames.map((frame) => {
    const { name, width, height, id } = frame;
    const textNodes = getTextNodesFromFrame(frame);

    const fixedPositionNodes = frame.children
      .slice(frame.children.length - frame.numberOfFixedChildren)
      .map((node) => node.id);

    return {
      name,
      width,
      height,
      id,
      textNodes,
      fixedPositionNodes,
    };
  });

  return {
    frames: framesData,
    headline: getNodeText(currentPage, HEADLINE_NODE_NAMES.HEADLINE),
    subhead: getNodeText(currentPage, HEADLINE_NODE_NAMES.HEADLINE),
    source: getNodeText(currentPage, HEADLINE_NODE_NAMES.HEADLINE),
  };
}