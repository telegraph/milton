import Compressor from "compressorjs";

export function compressImage(
  image: Uint8Array,
  width: number,
  height: number
) {
  return new Promise((resolve, reject) => {
    // Create image from blob to access native image sizes the resize and
    // compress
    const blob = new Blob([image], { type: "image/png" });
    const imgUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.src = imgUrl;
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

      new Compressor(blob, {
        width: targetWidth,
        height: targetHeight,
        quality: 0.7,
        convertSize: 100000,
        success: async (newImage) => {
          const buf = await newImage.arrayBuffer();
          const data = new Uint8Array(buf);
          resolve(data);
        },
        error: (err) => {
          console.error("Image compression failed");
          reject(err);
        },
      });
    });

    img.addEventListener("error", (err) => {
      console.error("Error loading compressed image");
      reject(err);
    });
  });
}
