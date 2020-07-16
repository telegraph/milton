import Pica from "pica";
import UPNG from "upng-js";
import { parseGIF, decompressFrames } from "gifuct-js";

const JPEG_MAGIC_BYTES = [
  [0xff, 0xd8, 0xff, 0xdb],
  [0xff, 0xd8, 0xff, 0xee],
];
const PNG_MAGIC_BYTES = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const GIF_MAGIC_BYTES = [
  [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
  [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
];

const pngSampleUint8Array = [137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73];

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

export async function resizeImage(imageData: Uint8Array) {
  const imageFormat = identifyImageFormat(imageData);

  if (imageFormat === IMAGE_FORMATS.GIF) {
    console.log("Image is a GIF");
    const gifFrames = parseGIF(imageData);
    const [frame1 = {}] = decompressFrames(gifFrames, true) || [];
    const { patch, dims } = frame1;
    if (!patch) {
      return console.log("MISSING GIF IMAGE PIXEL DATA");
    }

    const pica = new Pica();
    const resizedBuffer = await pica.resizeBuffer({
      src: patch,
      width: dims.width,
      height: dims.height,
      toWidth: 100,
      toHeight: 100,
      alpha: true,
    });

    const smallPng = UPNG.encode(
      [resizedBuffer.buffer],
      100,
      100,
      32
    ) as ArrayBuffer;
    const buffer = new Uint8Array(smallPng);

    console.log("SMALL PNG", buffer);
    console.log("DONE resizing image", resizedBuffer);
    return buffer;
  }
  if (imageFormat === IMAGE_FORMATS.JPEG) {
    console.log("Image is a JPEG");
  }
  if (imageFormat === IMAGE_FORMATS.PNG) {
    console.log("Image is a PNG");
    const decodedPng = UPNG.decode(imageData);
    const rgba = UPNG.toRGBA8(decodedPng)[0];

    const pica = new Pica();
    const resizedBuffer = await pica.resizeBuffer({
      src: new Uint8Array(rgba),
      width: decodedPng.width,
      height: decodedPng.height,
      toWidth: 100,
      toHeight: 100,
      alpha: true,
    });

    const smallPng = UPNG.encode(
      [resizedBuffer.buffer],
      100,
      100,
      86
    ) as ArrayBuffer;
    const buffer = new Uint8Array(smallPng);

    console.log("SMALL PNG", buffer);
    console.log("DONE resizing image", resizedBuffer);
    return buffer;
  }
  if (imageFormat === IMAGE_FORMATS.UNKNOWN) {
    console.log("Image is UNKNOWN");
  }
  // const img = UPNG.decode(pngData.buffer);
  // const rgba = UPNG.toRGBA8(img)[0];
  // const pica = new Pica({});
  // const resizedBuffer = await pica.resizeBuffer({
  //   src: new Uint8Array(rgba),
  //   width: outputNode.width,
  //   height: outputNode.height,
  //   toWidth: 100,
  //   toHeight: 100,
  //   alpha: true,
  // });

  // console.log(resizedBuffer);

  // const smallPng = UPNG.encode(
  //   [resizedBuffer.buffer],
  //   100,
  //   100,
  //   128
  // ) as ArrayBuffer;
  // console.log("SMALL PNG", smallPng);

  // const buffer = new Uint8Array(smallPng);
}

export function compressImage(
  image: Uint8Array,
  width: number,
  height: number
) {
  return new Promise((resolve, reject) => {
    // Create image from blob to access native image sizes the resize and
    // compress

    const img = new Image();

    img.addEventListener("load", () => {
      let targetWidth = 0;
      let targetHeight = 0;

      // Don't scale image up if node is larger than image
      if (width > img.width || height > img.height) {
        targetWidth = img.width;
        targetHeight = img.height;
      } else {
        // Scale to largest dimension
        const aspectRatio = img.width / img.height;
        targetWidth = aspectRatio >= 1 ? height * aspectRatio : width;
        targetHeight = aspectRatio >= 1 ? height : width / aspectRatio;
      }

      const canvas = new OffscreenCanvas(targetWidth, targetHeight);
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Unable to get 2d context"));
        return;
      }

      ctx.imageSmoothingQuality = "high";

      console.log("sdfsdf");

      // Create alpha mask
      ctx.fillStyle = "#000000";
      // ctx.fillRect(0, 0, targetWidth, targetHeight);
      // ctx.filter = "contrast(0) brightness(100)";
      // ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      // ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      canvas.convertToBlob({ type: "image/png" }).then((blob) => {
        blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)));
      });
    });

    img.addEventListener("error", (err) => {
      console.error("Error loading compressed image");
      reject(err);
    });

    const blob = new Blob([image], { type: "image/png" });
    const imgUrl = URL.createObjectURL(blob);
    img.src = imgUrl;
  });
}
