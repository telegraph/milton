export async function decodeSvgToString(svg: Uint8Array) {
  let svgStr = new TextDecoder("utf-8").decode(svg);
  // Update HTTP links to HTTPS
  svgStr = svgStr.replace(/http:\/\//g, "https://");

  // // NOTE: Figma generates non-unique IDs for masks which can clash when
  // // embedding multiple SVGSs. We do a string replace for unique IDs
  // const regex = /id="(.+?)"/g;
  // const ids: string[] = [];
  // let matches;

  // while ((matches = regex.exec(svgStr))) {
  //   const [, id] = matches;
  //   ids.push(id);
  // }

  // ids.forEach((id) => {
  //   const rnd = btoa(`${Math.random()}`).substr(6, 6);
  //   const randomId = `${id}-${rnd}`;
  //   // Replace ID
  //   svgStr = svgStr.replace(`id="${id}"`, `id="${randomId}"`);
  //   // Replace anchor refs
  //   const regex = new RegExp(`#${id}`, "g");
  //   svgStr = svgStr.replace(regex, `#${randomId}`);
  // });

  // QUESTION: What do we do with tall and wide shapes?

  // Images are stored as SVG images elements inside <defs>
  // We need to reverse look-up which patterns use each image
  // then which elements use those patterns.
  // Once we have the elements we can work out the max dimensions

  const emptyDiv = document.createElement("div");
  emptyDiv.innerHTML = svgStr;
  const svgEl = emptyDiv.querySelector("svg");
  const svgImages = [...svgEl.querySelectorAll("image")];

  await Promise.all(
    svgImages.map((img) => {
      return new Promise((resolve, reject) => {
        img.onload = () => {
          console.log("loaded svg image");
          resolve();
        };
        img.onerror = reject;
      });
    })
  );

  if (!svgEl) {
    return;
  }

  // TODO: Long loop. Breakout into individual math function calls
  for (const img of [...svgEl.querySelectorAll("image")]) {
    const { id } = img;

    const useEls = [...svgEl.querySelectorAll(`pattern use[*|href="#${id}"]`)];

    const patternIds = useEls
      .map(({ parentElement }) => parentElement?.id)
      .filter(Boolean);

    const elements = patternIds.flatMap((id) => {
      return [...svgEl.querySelectorAll(`[fill="url(#${id})"]`)];
    });

    const maxWidth = Math.max(
      ...elements.map((el) => parseFloat(el.getAttribute("width") ?? ""))
    );

    const maxHeight = Math.max(
      ...elements.map((el) => parseFloat(el.getAttribute("height") ?? ""))
    );

    const width = parseFloat(img.getAttribute("width") ?? "1");
    const height = parseFloat(img.getAttribute("height") ?? "1");
    const aspectRatio = width / height;

    console.log("original size", width, height);
    let resizeWidth = width;
    let resizeHeight = height;

    // Question:  Do we move "height > maxHeight" and "widthOfTallestElementImg"
    //            outside of the nested if statement? How?

    // If original image is wide or square and wider than any element...
    const widthOfTallestElementImg = maxHeight * aspectRatio;
    const heightOfWidestElementImg = maxWidth * aspectRatio;

    if (
      aspectRatio >= 1 &&
      width > maxWidth &&
      width > widthOfTallestElementImg
    ) {
      console.log("Wide image");

      if (widthOfTallestElementImg > maxWidth) {
        console.log("WIDE IMAGE | tall element");
        resizeWidth = (maxHeight / height) * width;
        resizeHeight = maxHeight;
      } else {
        console.log("WIDE IMAGE | wide element");
        resizeWidth = maxWidth;
        resizeHeight = maxWidth / aspectRatio;
      }
    } else if (
      aspectRatio < 1 &&
      height > maxHeight &&
      height > heightOfWidestElementImg
    ) {
      // Original image is tall and taller than any element
      console.log("Tall image");

      if (heightOfWidestElementImg > maxHeight) {
        console.log("TALL IMAGE | wide element");
        resizeWidth = maxWidth;
        resizeHeight = maxWidth * aspectRatio;
        console.log("INININI", resizeWidth, resizeHeight);
      } else {
        console.log("TALL IMAGE | tall element");
        resizeWidth = maxHeight * aspectRatio;
        resizeHeight = maxHeight;
        console.log("INININI", resizeWidth, resizeHeight);
      }
    }

    // Double resoltion for HiDPI screens
    // resizeWidth = resizeWidth * 2;
    // resizeHeight = resizeHeight * 2;

    const canvas = document.createElement("canvas");
    canvas.width = resizeWidth;
    canvas.height = resizeHeight;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return;
    }

    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, resizeWidth, resizeHeight);

    // ctx.fillStyle = "#000000";
    // ctx.fillRect(0, 0, resizeWidth, resizeHeight);
    // // ctx.filter = "contrast(0) brightness(100)";
    // // ctx.drawImage(img, 0, 0, resizeWidth, resizeHeight);

    const imgData = canvas.toDataURL("image/png");
    img.setAttribute("xlink:href", imgData);
    img.setAttribute("width", `${resizeWidth}`);
    img.setAttribute("height", `${resizeHeight}`);

    const scaleRegex = /scale\(([0-9\.]+)(?:\s([0-9\.]+))?/;

    useEls.forEach((use) => {
      const transform = use.getAttribute("transform");
      if (transform) {
        const [, scaleX, scaleY] = transform.match(scaleRegex) || [];

        console.log("original scales", transform,scaleX, scaleY)

        const newXScale =  parseFloat(scaleX) / (resizeWidth / width);
        const newYScale =  parseFloat(scaleY) / (resizeHeight / height);

        let newScale = "";

        if (scaleX && scaleY) {
          newScale += `${newXScale} ${newYScale}`;
        }

        if (scaleX && !scaleY) {
          newScale += `${newXScale}`;
        }
 

        if (newScale !== "") {
          const newTransform = transform.replace(
            /scale\(.+?\)/,
            `scale(${newScale})`
          );
          use.setAttribute("transform", newTransform);
        }
      }
    });
  }

  return svgEl.outerHTML;
}

export async function getSvgString(url: string): Promise<string> {
  return fetch(url).then((res) => {
    if (res.ok === false) throw new Error("Failed to fetch SVG blob");

    return res.text();
  });
}
