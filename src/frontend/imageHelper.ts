import UPNG from "upng-js";
import pica from "pica";
import { imageNodeDimensions } from "types";

async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.setAttribute("src", dataUrl);
  });
}

async function optimizePng(
  canvas: HTMLCanvasElement,
  colours: number
): Promise<string> {
  const { width, height } = canvas;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas.toDataURL();

  const imageData = ctx.getImageData(0, 0, width, height);

  // Quantize palette
  const pngData = UPNG.encode([imageData?.data], width, height, colours);

  // Convert PNG data into image
  const blob = new Blob([new Uint8Array(pngData).buffer], {
    type: "image/png",
  });

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.addEventListener("load", () => resolve(reader.result as string));
    reader.addEventListener("error", reject);
  });
}

async function resizeImage(
  img: HTMLImageElement,
  newWidth: number,
  newHeight: number
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  const { width, height } = img;
  const shouldScaleDown = newWidth < width;

  canvas.setAttribute("width", `${shouldScaleDown ? newWidth : width}`);
  canvas.setAttribute("height", `${shouldScaleDown ? newHeight : height}`);

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  if (shouldScaleDown) {
    ctx.imageSmoothingQuality = "high";
    await pica().resize(img, canvas, {
      alpha: true,
      quality: 3,
      unsharpAmount: 40,
      unsharpRadius: 0.5,
      unsharpThreshold: 0.2,
    });
  } else {
    ctx.drawImage(img, 0, 0);
  }

  return canvas;
}

function calcResizeDimensions(
  imgWidth: number,
  imgHeight: number,
  nodeDimensions: imageNodeDimensions[]
): { width: number; height: number } {
  const imgAspect = imgWidth / imgHeight;

  const sortedNodeAspects = [...nodeDimensions].sort((a, b) => {
    const aAspect = a.width / a.height;
    const bAspect = b.width / b.height;
    return aAspect > bAspect ? 1 : -1;
  });

  const n = sortedNodeAspects.pop() as imageNodeDimensions;
  const largestNodeAspect = n.width / n.height;

  let width: number;
  let height: number;

  if (imgAspect > largestNodeAspect) {
    // scale image to node height
    const scaleFactor = n.height / imgHeight;
    width = Math.ceil(imgWidth * scaleFactor);
    height = Math.ceil(imgHeight * scaleFactor);
  } else {
    // scale image to node width
    const scaleFactor = n.width / imgWidth;
    width = Math.ceil(imgWidth * scaleFactor);
    height = Math.ceil(imgHeight * scaleFactor);
  }

  return {
    width,
    height,
  };
}

type imageTypes = "png" | "jpg" | "gif";
function getImageFormatFromDataUrl(dataUrl: string): imageTypes | null {
  if (dataUrl.startsWith("data:image/jpeg")) return "jpg";
  if (dataUrl.startsWith("data:image/png")) return "png";
  if (dataUrl.startsWith("data:image/gif")) return "gif";
  return null;
}
export async function resizeAndOptimiseImage(
  dataUrl: string,
  nodeDimensions: imageNodeDimensions[],
  jpegQuality = 75,
  paletteColours = 32
): Promise<string> {
  const img = await loadImage(dataUrl);

  const { width, height } = img || {};
  if (!width || !height) return dataUrl;

  const newSize = calcResizeDimensions(width, height, nodeDimensions);
  const imgCanvas = await resizeImage(img, newSize.width, newSize.height);

  let newDataUrl = "";

  const imgFormat = getImageFormatFromDataUrl(dataUrl);
  switch (imgFormat) {
    case "jpg":
      newDataUrl = imgCanvas.toDataURL("image/jpeg", jpegQuality);
      break;

    case "gif":
    case "png":
      newDataUrl = await optimizePng(imgCanvas, paletteColours);
      break;

    default:
      newDataUrl = dataUrl;
  }

  return newDataUrl;
}
