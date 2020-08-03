import { setHeadlinesAndSourceProps, IFrameData } from "types";
import { getNodeText, getTextNodes } from "helpers/figmaText";
import { HEADLINE_NODE_NAMES, MSG_EVENTS } from "./constants";
import { postMan } from "utils/messages";
import { resizeAndOptimiseImage } from "./helpers/imageHelper";

/**
 * Compress image using browser's native image decoding support
 * @context Browser (UI)
 */
export function compressImage(props: {
  imgData: Uint8Array;
  nodeDimensions: { width: number; height: number }[];
}): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const { imgData, nodeDimensions } = props;

    img.addEventListener("load", () => {
      resizeAndOptimiseImage({
        img,
        imgData,
        nodeDimensions,
        resolve,
        reject,
      }).catch((err) => reject(err));
    });

    img.addEventListener("error", (err) => {
      console.error("Error loading compressed image");
      reject(err);
    });

    const blob = new Blob([imgData], { type: "image/png" });
    const imgUrl = URL.createObjectURL(blob);
    img.src = imgUrl;
  });
}

/**
 * Test if Figma node supports fill property type
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
export async function renderFrames(frameIds: string[]): Promise<Uint8Array> {
  const outputNode = figma.createFrame();
  outputNode.name = "output";

  try {
    // Clone each selected frame adding them to the temporary container frame
    const frames = figma.currentPage.children.filter(({ id }) =>
      frameIds.includes(id)
    );

    // Calculate the max dimensions for output container frame
    const maxWidth = Math.max(...frames.map((f) => f.width));
    const maxHeight = Math.max(...frames.map((f) => f.height));
    outputNode.resizeWithoutConstraints(maxWidth, maxHeight);

    for (const frame of frames) {
      const clone = frame?.clone() as FrameNode;

      // Find and remove all text nodes
      clone.findAll((n) => n.type === "TEXT").forEach((n) => n.remove());

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

    // A single image can be used multiple times on different nodes in different
    // frames. To ensure images are only optimised once a cache is created
    // of unique images and used to replace original after the async processing
    // is completed.
    const imageCache: {
      [id: string]: { width: number; height: number; id: string }[];
    } = {};

    for (const node of nodesWithImages) {
      if (supportsFills(node) && node.fills !== figma.mixed) {
        // The frontend UI which handles the image optimisation needs to know
        // the sizes of each node that uses the image. The dimensions are stored
        // with the image hash ID in the cache for later use.
        const dimensions = {
          width: node.width,
          height: node.height,
          id: node.id,
        };
        const imgPaint = [...node.fills].find((p) => p.type === "IMAGE");

        if (imgPaint?.type === "IMAGE" && imgPaint.imageHash) {
          // Add the image dimensions to the cache, or update and existing cache
          // item with another nodes dimensions
          if (imageCache[imgPaint.imageHash]) {
            imageCache[imgPaint.imageHash].push(dimensions);
          } else {
            imageCache[imgPaint.imageHash] = [dimensions];
          }
        }
      }
    }

    // Send each image from the imageCache to the frontend for optimisation.
    // The operation is async and can take some time if the images are large.
    for (const imageHash in imageCache) {
      const bytes = await figma.getImageByHash(imageHash).getBytesAsync();
      const compressedImage: Uint8Array = await postMan.send({
        workload: MSG_EVENTS.COMPRESS_IMAGE,
        data: {
          imgData: bytes,
          nodeDimensions: imageCache[imageHash],
        },
      });

      // Store the new image in figma and get the new image hash
      const newImageHash = figma.createImage(compressedImage).hash;

      // Update nodes with new image paint fill
      nodesWithImages.forEach((node) => {
        if (supportsFills(node) && node.fills !== figma.mixed) {
          const imgPaint = [...node.fills].find(
            (p) => p.type === "IMAGE" && p.imageHash === imageHash
          );

          if (imgPaint) {
            const newPaint = JSON.parse(JSON.stringify(imgPaint));
            newPaint.imageHash = newImageHash;
            node.fills = [newPaint];
          }
        }
      });
    }

    // HACK! Figma takes some time to update the image fills. Waiting some
    // amount is required otherwise the images appear blank.
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Render output container frames to SVG mark-up (in a uint8 byte array)
    const svg = await outputNode.exportAsync({
      format: "SVG",
      svgSimplifyStroke: true,
      svgOutlineText: false,
      svgIdAttribute: true,
    });

    return svg;
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
  const frames = pageNode.findChildren((node) => node.type === "FRAME");
  const mostLeftPos = Math.min(...frames.map((node) => node.x));
  const mostTopPos = Math.min(...frames.map((node) => node.y));

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

export function getRootFrames(): IFrameData {
  const { currentPage } = figma;
  const rootFrames = currentPage.children.filter(
    (node) => node.type === "FRAME"
  ) as FrameNode[];

  const framesData = rootFrames.map((frame) => {
    const { name, width, height, id } = frame;
    const textNodes = getTextNodes(frame);

    return {
      name,
      width,
      height,
      id,
      textNodes,
    };
  });

  return {
    frames: framesData,
    headline: getNodeText(currentPage, HEADLINE_NODE_NAMES.HEADLINE),
    subhead: getNodeText(currentPage, HEADLINE_NODE_NAMES.HEADLINE),
    source: getNodeText(currentPage, HEADLINE_NODE_NAMES.HEADLINE),
  };
}
