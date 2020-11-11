import { resizeAndOptimiseImage } from "./imageHelper";
import { imageNodeDimensions } from "types";
import { pointsOnPath } from "points-on-path";

// TODO: Is there a way to identify mapping of image to elements from
// the @figma context? If so we don't need to look inside the SVG elements
// NOTE: We only resize based on width. Could be improved using aspect ratio
async function optimizeSvgImages(
  svgEl: SVGElement,
  nodeDimensions: imageNodeDimensions[]
): Promise<void> {
  const images = svgEl.querySelectorAll("image");

  for (const img of images) {
    const { id } = img;
    const imgSrc = img.getAttribute("xlink:href");
    if (!id || !imgSrc) return;

    // Get patterns using image
    const patterns = [...svgEl.querySelectorAll("pattern")].filter(
      (pattern) =>
        pattern.querySelector("use")?.getAttribute("xlink:href") === `#${id}`
    );

    // Create CSS selector from pattern IDs to find elements using the image
    const patternIds = patterns.map(({ id }) => id);

    // Find elements using the image
    const figmaElementNames = nodeDimensions.map((el) => el.name);
    const ids = figmaElementNames.filter(() => {
      const cssSelector = patternIds
        .map((id) => `[fill="url(#${id})"],[stroke="url(#${id})"]`)
        .join(",");

      return svgEl.querySelector(cssSelector);
    });

    // Find max width out of all the found elements
    const dimensions = nodeDimensions.filter(({ name }) => ids.includes(name));
    if (dimensions.length > 0) {
      const imgDataUrl = await resizeAndOptimiseImage(imgSrc, dimensions);
      img.setAttribute("xlink:href", imgDataUrl);
    }
  }
}

function optimizeSvgPaths(svgEl: SVGElement): void {
  svgEl.querySelectorAll("path").forEach((path) => {
    let d = path.getAttribute("d");
    if (d) {
      // Simplify paths
      const points = pointsOnPath(d, 0.1, 0.2);
      d = points.reduce((acc, point) => (acc += "M" + point.join(" ")), "");
      // Reduce precision
      path.setAttribute("d", d.replace(/(\.\d{2})\d+/g, "$1"));
    }
  });
}

// Replace all HTTP urls with HTTPS
function replaceHttpWithHttps(svgText: string): string {
  return svgText.replace(/http:\/\//g, "https://");
}

// Replace figma IDs "00:00" with CSS valid IDs
function replaceIdsWithClasses(svgEl: SVGElement, ids: string[][]): void {
  for (const [id, uid] of ids) {
    svgEl
      .querySelector(`[id="${id}"]`)
      ?.setAttribute("class", `f2h__frame ${uid}`);
  }
}

function createSvgElement(svgText: string): SVGElement | null {
  const emptyDiv = document.createElement("div");
  emptyDiv.innerHTML = svgText;
  return emptyDiv.querySelector("svg");
}

function cleanUpSvg(svgEl: SVGElement): void {
  // BUG: Remove empty clip paths
  svgEl.querySelectorAll("clipPath").forEach((clipPath) => {
    if (clipPath.childElementCount === 0) {
      clipPath.parentNode?.removeChild(clipPath);
    }
  });

  // Remove text nodes
  svgEl
    .querySelectorAll("text")
    .forEach((textNode) => textNode.parentNode?.removeChild(textNode));
}

function addLinks(svgEl: SVGElement): void {
  // @ref: https://ihateregex.io/expr/url/
  const urlPattern = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()!@:%_\+.~#?&\/\/=]*)/;
  const elWithIds = svgEl.querySelectorAll("[id]");

  for (const el of elWithIds) {
    const { id } = el;
    const [match] = urlPattern.exec(id) || [];
    // console.log(match, el);

    if (match) {
      const a = window.document.createElement("a");
      a.setAttribute("href", match);
      a.setAttribute("target", "_parent");
      el.parentNode?.insertBefore(a, el);
      a.appendChild(el);
    }
  }
}

export async function decodeSvgToString(
  svgData: Uint8Array,
  ids: string[][],
  imageNodeDimensions: imageNodeDimensions[]
): Promise<string | undefined> {
  let svgStr = new TextDecoder("utf-8").decode(svgData);
  svgStr = replaceHttpWithHttps(svgStr);

  const svgEl = createSvgElement(svgStr);
  if (!svgEl) return;

  svgEl.setAttribute("preserveAspectRatio", "xMinYMin meet");

  cleanUpSvg(svgEl);
  replaceIdsWithClasses(svgEl, ids);
  addLinks(svgEl);
  optimizeSvgPaths(svgEl);
  await optimizeSvgImages(svgEl, imageNodeDimensions);

  return svgEl?.outerHTML;
}
