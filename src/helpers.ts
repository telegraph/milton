import { textData, setHeadlinesAndSourceProps } from "types";
import { HEADLINE_NODE_NAMES, MSG_EVENTS } from "./constants";
import { postMan } from "utils/messages";
import UPNG from "upng-js";
import Pica from "pica";

const JPEG_MAGIC_BYTES = [
  [0xff, 0xd8, 0xff, 0xdb],
  [0xff, 0xd8, 0xff, 0xee],
  [0xff, 0xd8, 0xff, 0xe1],
  [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01],
];
const PNG_MAGIC_BYTES = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const GIF_MAGIC_BYTES = [
  [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
  [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
];
enum IMAGE_FORMATS {
  PNG,
  JPEG,
  GIF,
  UNKNOWN,
}

export function identifyImageFormat(imageData: Uint8Array): IMAGE_FORMATS {
  const isPng = PNG_MAGIC_BYTES.every((val, i) => val === imageData[i]);
  if (isPng) {
    return IMAGE_FORMATS.PNG;
  }

  const isJpeg = JPEG_MAGIC_BYTES.some((bytes) =>
    bytes.every((val, i) => val === imageData[i])
  );
  if (isJpeg) {
    return IMAGE_FORMATS.JPEG;
  }

  const isGif = GIF_MAGIC_BYTES.some((bytes) =>
    bytes.every((val, i) => val === imageData[i])
  );
  if (isGif) {
    return IMAGE_FORMATS.GIF;
  }

  return IMAGE_FORMATS.UNKNOWN;
}

// Context: UI
export function compressImage(props: {
  imgData: Uint8Array;
  nodeDimensions: { width: number; height: number }[];
}): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const { imgData, nodeDimensions } = props;
    console.log("Compressing image", nodeDimensions);

    img.addEventListener("load", async () => {
      // Scale to largest dimension
      const aspectRatio = img.width / img.height;
      console.log(aspectRatio, img.width, img.height);

      // WORK OUT MAX NODE SIZE
      let width = 200;
      let height = 200;

      if (aspectRatio < 1) {
        // 200x300 portrait  = 2/3 = 0.66
        const maxAspectHeight = Math.max(
          ...nodeDimensions.flatMap((d) => d.width / aspectRatio)
        );
        const maxNodeHeight = Math.max(
          ...nodeDimensions.flatMap((d) => d.height)
        );

        height = Math.max(maxNodeHeight, maxAspectHeight);
        width = height * aspectRatio;

        // width = Math.max(...nodeDimensions.flatMap((d) => d.width));
        // height = width / aspectRatio;
      } else {
        // 300x200 portrait  = 3/2 = 1.5
        // Landscape or square
        const maxAspectWidth = Math.max(
          ...nodeDimensions.flatMap((d) => d.height * aspectRatio)
        );
        const maxNodeWidth = Math.max(
          ...nodeDimensions.flatMap((d) => d.width)
        );

        width = Math.max(maxNodeWidth, maxAspectWidth);
        height = width / aspectRatio;
      }

      let targetWidth = 0;
      let targetHeight = 0;

      // Don't scale image up if node is larger than image
      if (width > img.width || height > img.height) {
        targetWidth = img.width;
        targetHeight = img.height;
      } else {
        targetWidth = Math.round(width);
        targetHeight = Math.round(height);
      }

      const canvas = new OffscreenCanvas(targetWidth, targetHeight);
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Unable to get 2d context"));
        return;
      }

      ctx.imageSmoothingQuality = "high";

      console.log(
        "COMPRESSING IMAGE",
        width,
        height,
        targetWidth,
        targetHeight
      );
      const pica = new Pica();
      await pica.resize(img, canvas, {
        unsharpAmount: 50,
        alpha: true,
      });

      // Original image format
      const imageFormat = identifyImageFormat(imgData);

      if (
        imageFormat === IMAGE_FORMATS.PNG ||
        imageFormat === IMAGE_FORMATS.GIF
      ) {
        console.log("IMAGE FORMAT IS PNG");
        // Resize & convert to blob
        const data = ctx.getImageData(0, 0, targetWidth, targetHeight).data;

        const tinyPng = UPNG.encode(
          [data.buffer],
          targetWidth,
          targetHeight,
          64
        );
        resolve(new Uint8Array(tinyPng));
        return;
      }

      if (
        imageFormat === IMAGE_FORMATS.JPEG ||
        imageFormat === IMAGE_FORMATS.UNKNOWN
      ) {
        console.log("IMAGE FORMAT IS JPEG");
        const blob = await canvas.convertToBlob({
          type: "image/jpeg",
          quality: 0.85,
        });
        const buff = await blob.arrayBuffer();
        const uintArry = new Uint8Array(buff);

        resolve(uintArry);
        return;
      }
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

// Context: Figma
export async function renderFrames(frameIds: string[]): Promise<Uint8Array> {
  const outputNode = figma.createFrame();
  outputNode.name = "output";

  try {
    console.log("inside render worker. Data:", frameIds);

    // Clone each selected frame adding them to the temp container frame
    // at origin 0,0
    const frames = figma.currentPage.children.filter(({ id }) =>
      frameIds.includes(id)
    );

    const maxWidth = Math.max(...frames.map((f) => f.width));
    const maxHeight = Math.max(...frames.map((f) => f.height));
    outputNode.resizeWithoutConstraints(maxWidth, maxHeight);

    for (const frame of frames) {
      const clone = frame?.clone();
      outputNode.appendChild(clone);
      clone.x = 0;
      clone.y = 0;

      clone.name = frame.id;
    }

    const cache: {
      [id: string]: { width: number; height: number; id: string }[];
    } = {};

    // Find all nodes with image fills
    const nodesWithImages = outputNode.findAll(
      (node) =>
        node.type !== "SLICE" &&
        node.type !== "GROUP" &&
        node.fills !== figma.mixed &&
        node.fills.some((fill) => fill.type === "IMAGE")
    );

    // Collect dimensions of nodes with images
    for (const node of nodesWithImages) {
      const dimensions = {
        width: node.width,
        height: node.height,
        id: node.id,
      };
      const imgPaint = [...node.fills].find((p) => p.type === "IMAGE");

      // Store node information alongside image hash
      if (cache[imgPaint.imageHash]) {
        cache[imgPaint.imageHash].push(dimensions);
      } else {
        cache[imgPaint.imageHash] = [dimensions];
      }
    }

    // Send images to UI for compression
    for (const imageHash in cache) {
      const bytes = await figma.getImageByHash(imageHash).getBytesAsync();
      const compressedImage: Uint8Array = await postMan.send({
        workload: MSG_EVENTS.COMPRESSED_IMAGE,
        data: {
          imgData: bytes,
          nodeDimensions: cache[imageHash],
        },
      });

      // Store the new image in figma and get the new image hash
      const newImageHash = figma.createImage(compressedImage).hash;

      // Update nodes will new image paint fill
      nodesWithImages.forEach((node) => {
        const imgPaint = [...node.fills].find(
          (p) => p.type === "IMAGE" && p.imageHash === imageHash
        );
        if (imgPaint) {
          const newPaint = JSON.parse(JSON.stringify(imgPaint));
          newPaint.imageHash = newImageHash;
          node.fills = [newPaint];
        }
      });
    }

    console.log("nodes with images", nodesWithImages, cache);

    // HACK! Wait for fills to be set inside Figma
    await new Promise((resolve) => setTimeout(resolve, 300));

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
    outputNode.remove();
  }
}

export function setHeadlinesAndSource(props: setHeadlinesAndSourceProps) {
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

export function getRootFrames() {
  const { currentPage } = figma;
  const rootFrames = currentPage.children.filter(
    (node) => node.type === "FRAME"
  ) as FrameNode[];

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

  return {
    frames: framesData,
    windowWidth: 22,
    windowHeight: 222,
    responsive: false,
    selected: true,
    ...headlinesAndSource,
  };
}
