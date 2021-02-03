import { resizeAndOptimiseImage } from "./imageHelper";
import { imageNodeDimensions } from "types";
import { randomId, URL_REGEX } from "utils/common";

// TODO: Is there a way to identify mapping of image to elements from
// the @figma context? If so we don't need to look inside the SVG elements
// NOTE: We only resize based on width. Could be improved using aspect ratio
export async function optimizeSvgImages(
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

    console.log(patternIds);

    // Find elements using the image
    const figmaElementNames = nodeDimensions.map((el) => el.name);
    console.log(figmaElementNames);
    // const ids = figmaElementNames.filter(() => {
    //   const cssSelector = patternIds
    //     .map((id) => `[fill="url(#${id})"],[stroke="url(#${id})"]`)
    //     .join(",");

    //   return svgEl.querySelector(cssSelector);
    // });

    // // Find max width out of all the found elements
    // const dimensions = nodeDimensions.filter(({ name }) => ids.includes(name));
    // if (dimensions.length > 0) {
    //   const imgDataUrl = await resizeAndOptimiseImage(imgSrc, dimensions);
    //   img.setAttribute("xlink:href", imgDataUrl);
    // }
  }
}

export function reducePathPrecision(svgEl: SVGElement): void {
  svgEl.querySelectorAll("path").forEach((path) => {
    const d = path.getAttribute("d");
    if (d) {
      // Simplify paths
      // const points = pointsOnPath(d, 0.1, 0.3);
      // d = points.reduce((acc, point) => (acc += "M" + point.join(" ")), "");
      // Reduce precision
      path.setAttribute("d", d.replace(/(\.\d{2})\d+/g, "$1"));
    }
  });
}

export function replaceHttpWithHttps(svgText: string): string {
  return svgText.replace(/http:\/\//g, "https://");
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
  const elWithIds = svgEl.querySelectorAll("[id]");

  for (const el of elWithIds) {
    const { id } = el;
    const [match] = URL_REGEX.exec(id) || [];

    if (match) {
      const a = window.document.createElement("a");
      a.setAttribute("href", match);
      a.setAttribute("target", "_parent");
      el.parentNode?.insertBefore(a, el);
      a.appendChild(el);
    }
  }
}

function randomiseIds(svgEl: SVGElement): void {
  const idMap: Record<string, string> = {};

  const elementsWithIds = svgEl.querySelectorAll("[id]");
  for (const el of elementsWithIds) {
    const rndId = `${el.id}-${randomId(4)}`;
    idMap[el.id] = rndId;
    el.setAttribute("data-id", el.id);
    el.setAttribute("id", rndId);
  }

  const allChildElements = svgEl.querySelectorAll("*");
  replaceIdsWithinSvgElementAttributes([...allChildElements], idMap);
}

// https://www.w3.org/TR/SVG11/linking.html#processingIRI
const ID_REF_PROPERTIES = [
  "clip-path",
  "fill",
  "stroke",
  "marker-mid",
  "marker-start",
  "xlink:href",
];

const ID_URL_PATTERN = /^((?:url\()?#)(.*?)(\)?$)/;

function replaceIdsWithinSvgElementAttributes(
  nodes: Element[],
  idMap: Record<string, string>
): void {
  for (const el of nodes) {
    if (!el.hasAttributes()) continue;

    for (const attr of el.attributes) {
      if (!ID_REF_PROPERTIES.includes(attr.name)) continue;

      const match = attr.value.match(ID_URL_PATTERN);
      if (!match) continue;

      const originalId = match[2];
      const replacementId = idMap[originalId];
      if (!replacementId) continue;

      const completeId = `$1${replacementId}$3`;
      attr.value = attr.value.replace(ID_URL_PATTERN, completeId);
    }
  }
}

function getPatternIds(imageId: string, svgElement: SVGElement): string[] {
  const useSelector = `pattern use[*|href="#${imageId}"]`;
  const useElements = [...svgElement.querySelectorAll(useSelector)];

  const elementIds: string[] = [];

  for (const useEl of useElements) {
    if (!useEl.parentElement) continue;
    elementIds.push(useEl.parentElement.id);
  }

  return elementIds;
}

function getElementsWithFills(
  elementIds: string[],
  svgElement: SVGElement
): Element[] {
  let elementsWithFills: Element[] = [];
  for (const elementId of elementIds) {
    const fillSelector = `*[fill="url(#${elementId})"]`;
    const elements = svgElement.querySelectorAll(fillSelector);
    elementsWithFills = elementsWithFills.concat(...elements);
  }

  return elementsWithFills;
}

function getMaxDimensions(
  elements: Element[]
): { width: number; height: number } {
  const widths: number[] = [];
  const heights: number[] = [];

  for (const element of elements) {
    const widthValue = element.getAttribute("width");
    if (widthValue) {
      const width = parseInt(widthValue);
      widths.push(width);
    }

    const heightValue = element.getAttribute("height");
    if (heightValue) {
      const height = parseInt(heightValue);
      heights.push(height);
    }
  }

  const maxWidth = Math.max(...widths);
  const maxHeight = Math.max(...heights);

  return {
    width: maxWidth,
    height: maxHeight,
  };
}

export interface MaxElementSizes {
  [id: string]: { width: number; height: number };
}
export function getMaxImageElementDimensions(
  svgElement: SVGElement,
  imageIds: string[]
): MaxElementSizes {
  const maxElementSizes: MaxElementSizes = {};

  for (const id of imageIds) {
    const elementIds = getPatternIds(id, svgElement);
    const elementsWithFills = getElementsWithFills(elementIds, svgElement);
    maxElementSizes[id] = getMaxDimensions(elementsWithFills);
  }

  return maxElementSizes;
}

export async function convertRenderIntoSvg(
  renderedFrame: { id: string; render: Uint8Array },
  imageNodeDimensions: imageNodeDimensions[]
): Promise<SVGElement> {
  let svgStr = new TextDecoder("utf-8").decode(renderedFrame.render);
  svgStr = replaceHttpWithHttps(svgStr);

  const svgEl = createSvgElement(svgStr);
  if (!svgEl) throw new Error("Failed to create SVG element");

  svgEl.setAttribute("preserveAspectRatio", "xMinYMin meet");
  svgEl.setAttribute("id", renderedFrame.id);

  randomiseIds(svgEl);

  // optimizeSvgImages(svgEl, []);
  // cleanUpSvg(svgEl);
  // reducePathPrecision(svgEl);
  // addLinks(svgEl);
  // await optimizeSvgImages(svgEl, imageNodeDimensions);

  return svgEl;
}

export function removeDuplicateImages(
  svgElement: SVGElement,
  storedImages: Record<string, string>
): void {
  const images = svgElement.querySelectorAll("image");
  for (const image of images) {
    const src = image.getAttribute("xlink:href");
    if (!src) continue;

    const storedImageList = Object.entries(storedImages);
    const matchedImage = storedImageList.find(([, imgSrc]) => imgSrc === src);

    if (matchedImage) {
      const allChildNodes = [...svgElement.querySelectorAll("*")];
      const replacement = { [image.id]: matchedImage[0] };
      replaceIdsWithinSvgElementAttributes(allChildNodes, replacement);
      image.parentNode?.removeChild(image);
    } else {
      storedImages[image.id] = src;
    }
  }
}

export function replaceImage(
  imageId: string,
  svgElement: SVGElement,
  src: string
): void {
  const image = svgElement.querySelector(`image#${imageId}`);
  image?.setAttribute("xlink:href", src);
}
