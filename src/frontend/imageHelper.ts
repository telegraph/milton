import UPNG from "@pdf-lib/upng";
import pica from "pica";
import { imageNodeDimensions } from "types";

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.setAttribute("src", dataUrl);
  });
}

function optimizePng(
  canvas: HTMLCanvasElement,
  colours: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const { width, height } = canvas;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      resolve(canvas.toDataURL());
      return;
    }

    const imageData = ctx.getImageData(0, 0, width, height);

    // Quantize palette
    const pngData = UPNG.encode([imageData?.data], width, height, colours);

    // Convert PNG data into image
    const blob = new Blob([new Uint8Array(pngData).buffer], {
      type: "image/png",
    });

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
      quality: 1,
    });
  } else {
    ctx.drawImage(img, 0, 0);
  }

  return canvas;
}

function calcResizeDimensions(
  imgWidth: number,
  imgHeight: number,
  nodeWidth: number,
  nodeHeight: number
): { width: number; height: number } {
  const imgAspect = imgWidth / imgHeight;

  const largestNodeAspect = nodeWidth / nodeHeight;

  let width: number;
  let height: number;

  if (imgAspect > largestNodeAspect) {
    // scale image to node height
    const scaleFactor = nodeHeight / imgHeight;
    width = Math.ceil(imgWidth * scaleFactor);
    height = Math.ceil(imgHeight * scaleFactor);
  } else {
    // scale image to node width
    const scaleFactor = nodeWidth / imgWidth;
    width = Math.ceil(imgWidth * scaleFactor);
    height = Math.ceil(imgHeight * scaleFactor);
  }

  return {
    width: width * 2,
    height: height * 2,
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
  nodeWidth: number,
  nodeHeight: number,
  jpegQuality = 75,
  paletteColours = 164
): Promise<string> {
  const img = await loadImage(dataUrl);

  const { width, height } = img || {};
  if (!width || !height) return dataUrl;

  const newSize = calcResizeDimensions(width, height, nodeWidth, nodeHeight);

  console.time("Milton - image resize");
  const imgCanvas = await resizeImage(img, newSize.width, newSize.height);
  console.timeEnd("Milton - image resize");

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
