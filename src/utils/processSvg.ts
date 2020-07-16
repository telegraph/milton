interface reduceImageInterface {
  img: HTMLImageElement;
  targetWidth: number;
  targetHeight: number;
  quality?: number;
}

function reduceImage(props: reduceImageInterface): string | void {
  const { img, targetWidth, targetHeight, quality = 0.96 } = props;

  // Create canvas the size of the destination
  const canvas = document.createElement("canvas");
  canvas.setAttribute("width", targetWidth.toString());
  canvas.setAttribute("height", targetHeight.toString());

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    console.error("Failed to get 2D canvas context");
    return;
  }

  // Enable high quality down-sizing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
  return canvas.toDataURL("image/jpeg", quality);
}

function optimizeImages(images: SVGImageElement[]): Promise<void> {
  const promises = images.map(
    (svgImg): Promise<void> => {
      return new Promise((resolve: () => void, reject: () => void) => {
        const href = svgImg.getAttribute("xlink:href");
        if (!href) {
          resolve();
          return;
        }

        // Load image
        const imgEl = new Image();
        imgEl.addEventListener("load", () => {
          const { width, height, src } = imgEl;
          console.log(
            "native width %d, native height: %d, target width: %s, target height: %s",
            width,
            height,
            svgImg.getAttribute("width"),
            svgImg.getAttribute("height"),
            src.length
          );

          // Check native image size to image element size.
          // If the image element is smaller then resize image data and set
          // it back on the image elements

          const reducedImageData = reduceImage({
            img: imgEl,
            targetWidth: 200,
            targetHeight: 100,
          });

          if (!reducedImageData) {
            reject();
            return;
          }

          console.log("in here");

          svgImg.setAttribute("xlink:href", reducedImageData);
          resolve();
        });

        imgEl.addEventListener("error", () => {
          reject();
        });

        imgEl.setAttribute("src", href);
      });
    }
  );

  return Promise.all(promises);
}

export async function processSvg(data: Uint8Array): Promise<void> {
  const svgText = await new Blob([data]).text();
  const svgEl = document.createRange().createContextualFragment(svgText);

  if (!svgEl) {
    throw new Error("Data does not contain valid SVG markup");
  }

  // document.body.appendChild(svgEl);

  // Remove text nodes
  [...svgEl.querySelectorAll("text")].forEach((node) =>
    node.parentNode?.removeChild(node)
  );

  const nodesUsingImage = [...svgEl.querySelectorAll("[fill]")].filter((node) =>
    node.getAttribute("fill")?.includes("url(#")
  );

  for (const node of nodesUsingImage) {
    const width = parseFloat(node.getAttribute("width") || "");
    const height = parseFloat(node.getAttribute("height") || "");
    console.log(node);
    // ISSUE: SvgEl is not in the DOM so node's don't have DOM dimensions
    // <path> don't have width or height attributes.

    const id = node.getAttribute("fill")?.split("url(#")[1]?.slice(0, -1);
    const imgId = svgEl.querySelector(`#${id} use`)?.getAttribute("xlink:href");
    const imgEl = svgEl.querySelector(`image${imgId}`);
    console.log(imgId);

    if (!width || !height) {
      return;
    }

    const imgWidth = parseFloat(imgEl?.getAttribute("width") || "");
    const imgHeight = parseFloat(imgEl?.getAttribute("height") || "");

    if (!imgWidth || !imgHeight) {
      return;
    }

    console.log(imgId, width, height, imgWidth, imgHeight);
  }
  console.log(nodesUsingImage);

  // Get

  // Async resize all images
  // Get image element in <def> patterns
  // Find all uses and their dimensions
  // [Q]: What about image fills that are small patterns on large elements?

  // Orignal image with native width stored in <image> element

  // Shapes (eg. rect) use fill -> pattern -> <use> -> #image
  // const images = Array.from(svgEl.querySelectorAll("image"));
  // const pattern;
  // const maxNodeImageFillSizes = images.map((svgImgEl) => {
  //   const { id } = svgImgEl;
  //   const nodesUsingImage = svgEl.querySelectorAll("rect[fill]");
  //   const nodeFillIds = Array.from(nodesUsingImage).map((node) =>
  //     node.getAttribute("fill")
  //   );
  //   console.log(nodeFillIds);

  //   console.log(nodesUsingImage);
  // });
  // await optimizeImages(images);

  // Array.from(svgEl.querySelectorAll("image")).map(async (img) => {

  // const imgBlob = await fetch(href).then((res) => res.blob());

  // let targetWidth = 0;
  // let targetHeight = 0;
  // const { clientWidth, clientHeight } = img;

  // // Don't scale image up if node is larger than image
  // if (width > img.width || height > img.height) {
  //   targetWidth = clientWidth;
  //   targetHeight = clientHeight;
  // } else {
  //   // Scale to largest dimension
  //   const aspectRatio = img.width / img.height;
  //   targetWidth = aspectRatio >= 1 ? height * aspectRatio : width;
  //   targetHeight = aspectRatio >= 1 ? height : width / aspectRatio;
  // }

  // new Compressor(blob, {
  //   width: targetWidth,
  //   height: targetHeight,
  //   quality: 0.7,
  //   convertSize: 100000,
  //   success: async (newImage) => {
  //     const buf = await newImage.arrayBuffer();
  //     const data = new Uint8Array(buf);
  //     resolve(data);
  //   },
  //   error: (err) => {
  //     console.error("Image compression failed");
  //     reject(err);
  //   },
  // });

  console.log(svgEl);
}
