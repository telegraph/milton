import {
  setHeadlinesAndSourceProps,
  IFrameData,
  FrameRender,
  FrameDataInterface,
  imageNodeDimensions,
} from "types";
import { randomId, URL_REGEX } from "utils/common";
import { getTextNodesFromFrame } from "utils/figmaText";

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

function doesNodeHaveImageFills(node: SceneNode): boolean {
  if (node.type === "SLICE" || node.type === "GROUP") return false;
  if (node.fills === figma.mixed) return false;
  return node.fills.some((fill) => fill.type === "IMAGE");
}

function getImageDimensions(frameNode: FrameNode): imageNodeDimensions[] {
  const nodesWithImages = frameNode.findAll(doesNodeHaveImageFills);
  const imageDimensions: imageNodeDimensions[] = [];

  for (const node of nodesWithImages) {
    const { height, width, name, fills } = node as VectorNode;
    let fillsWithImages = [];

    if (fills !== figma.mixed) {
      for (const fill of fills) {
        if (fill.type !== "IMAGE") continue;

        const { imageHash, scaleMode, scalingFactor } = fill;
        console.log(node);

        fillsWithImages.push({
          imageHash,
          scaleMode,
          scalingFactor,
        });
      }
    }

    console.log(fillsWithImages);

    const imageInfo: imageNodeDimensions = {
      height,
      name,
      width,
      images: fillsWithImages,
    };

    imageDimensions.push(imageInfo);
  }

  return imageDimensions;
}

function setRandomPrefixForUrlNodeNames(frameNode: FrameNode): void {
  frameNode
    .findAll(({ name }) => URL_REGEX.test(name))
    .forEach((node) => {
      const rndId = randomId(4);
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

  // setRandomPrefixForUrlNodeNames(outputNode);

  return outputNode;
}

/**
 * Render all specified frames out as SVG element.
 * Images are optimised for size and image type compression via the frontend UI
 *
 * @context figma
 */
export async function renderFrames(frameIds: string[]): Promise<FrameRender> {
  // let outputNode: FrameNode | null = null;

  try {
    // Clone each selected frame adding them to the temporary container frame
    const frames = figma.currentPage.findAll(({ id }) =>
      frameIds.includes(id)
    ) as FrameNode[];

    if (frames.length < 1) {
      throw new Error(`No frames found to render ${frameIds.join(" ,")}`);
    }

    // outputNode = createCloneOfFrames(frames);
    // resizeOutputToMaxSize(outputNode);
    // flattenBooleanGroups(outputNode);
    const imageNodeDimensions = getImageDimensions(frames[0]);

    const renderedFrames = await Promise.all(
      frames.map(async (frame) => {
        const svg = await frame.exportAsync({
          format: "SVG",
          svgSimplifyStroke: true,
          svgOutlineText: false,
          svgIdAttribute: true,
        });

        return {
          id: frame.id,
          render: svg,
        };
      })
    );

    return {
      renderedFrames,
      imageNodeDimensions,
    };
  } catch (err) {
    throw new Error(err);
  } finally {
    // Remove the output frame whatever happens
    // outputNode?.remove();
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

  const frames: Record<string, FrameDataInterface> = {};
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
