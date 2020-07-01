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
