import { IresizeImage } from "types";
import Pica from "pica";
import UPNG from "upng-js";

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

export enum IMAGE_FORMATS {
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

function calcSmallestImageSize(
  originalWidth: number,
  originalHeight: number,
  nodeDimensions: { width: number; height: number }[]
): { width: number; height: number } {
  const aspectRatio = originalWidth / originalHeight;

  // WORK OUT MAX NODE SIZE
  let width = 200;
  let height = 200;

  if (aspectRatio < 1) {
    // 200x300 portrait  = 2/3 = 0.66
    const maxAspectHeight = Math.max(
      ...nodeDimensions.flatMap((d) => d.width / aspectRatio)
    );
    const maxNodeHeight = Math.max(...nodeDimensions.flatMap((d) => d.height));
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
    const maxNodeWidth = Math.max(...nodeDimensions.flatMap((d) => d.width));
    width = Math.max(maxNodeWidth, maxAspectWidth);
    height = width / aspectRatio;
  }

  // Don't scale image up if node is larger than image
  if (width > originalWidth || height > originalHeight) {
    width = originalWidth;
    height = originalHeight;
  } else {
    width = Math.round(width);
    height = Math.round(height);
  }

  return { width, height };
}

async function optimizeImage(
  imgData: Uint8Array,
  canvas: OffscreenCanvas
): Promise<Uint8Array> {
  const _COLOUR_COUNT = 64;
  // Original image format
  const imageFormat = identifyImageFormat(imgData);

  const { width, height } = canvas;
  const ctx = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D;

  // Optimize PNG and GIF images with a limited colour pallet or JPEG quality
  let returnImageData: Uint8Array;
  if (imageFormat === IMAGE_FORMATS.PNG || imageFormat === IMAGE_FORMATS.GIF) {
    const data = ctx.getImageData(0, 0, width, height).data;
    const tinyPng = UPNG.encode([data.buffer], width, height, _COLOUR_COUNT);
    returnImageData = new Uint8Array(tinyPng);
  } else {
    const blob = await canvas.convertToBlob({
      type: "image/jpeg",
      quality: 0.85,
    });
    const buff = await blob.arrayBuffer();
    returnImageData = new Uint8Array(buff);
  }

  return returnImageData;
}

export async function resizeAndOptimiseImage(
  props: IresizeImage
): Promise<void> {
  const { img, imgData, nodeDimensions, resolve, reject } = props;

  try {
    const { width, height } = calcSmallestImageSize(
      img.width,
      img.height,
      nodeDimensions
    );
    const canvas = new OffscreenCanvas(width, height);

    // Use image resizing library to create a sharper downscaled image
    const pica = new Pica();
    await pica.resize(img, (canvas as unknown) as HTMLCanvasElement, {
      unsharpAmount: 50,
      alpha: true,
    });

    const optimisedImage = await optimizeImage(imgData, canvas);

    resolve(optimisedImage);
  } catch (err) {
    reject(err);
  }
}
