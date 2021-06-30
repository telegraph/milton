import { extendDefaultPlugins, optimize } from "svgo/dist/svgo.browser.js";
import { imageNodeDimensions } from "types";
import { randomId } from "utils/common";
import { resizeAndOptimiseImage } from "./imageHelper";

const imageCache: Record<string, string> = {};

function getPatternIds(el: Element): string[] {
  const URL_REGEX = /url\((#.+?)\)/;
  const patternIds: string[] = [];

  const fillId = (el.getAttribute("fill") ?? "").match(URL_REGEX);
  if (fillId) {
    patternIds.push(fillId[1]);
  }

  const strokeId = (el.getAttribute("stroke") ?? "").match(URL_REGEX);
  if (strokeId) {
    patternIds.push(strokeId[1]);
  }

  return patternIds;
}

function getImageIds(el: Element, patternIds: string[]) {
  const imageIds: string[] = [];

  for (const patternId of patternIds) {
    const useEl = el.querySelector(`${patternId} use`);
    if (!useEl) continue;

    const id = useEl.getAttribute("xlink:href");
    if (id) {
      imageIds.push(id);
    }
  }

  return imageIds;
}

// TODO: Is there a way to identify mapping of image to elements from
// the @figma context? If so we don't need to look inside the SVG elements
// NOTE: We only resize based on width. Could be improved using aspect ratio
async function optimizeSvgImages(
  svgEl: SVGElement,
  nodeDimensions: imageNodeDimensions[]
): Promise<void> {
  const ATTR_SELECTOR = "[fill^=url],[stroke^=url]";

  const processedImages: string[] = [];
  for (const size of nodeDimensions) {
    const { width, height, id } = size;

    const el = svgEl.querySelector(`#${id}`);
    if (!el) continue;

    let patternIds = getPatternIds(el);

    const childrenWithFills = el.querySelectorAll(ATTR_SELECTOR);
    for (const childEl of childrenWithFills) {
      patternIds = patternIds.concat(getPatternIds(childEl));
    }

    const imageIds = getImageIds(svgEl, patternIds);

    for (const imageId of imageIds) {
      if (processedImages.includes(imageId)) continue;

      const imageEl = svgEl.querySelector(imageId);
      if (!imageEl) continue;

      const imgSrc = imageEl.getAttribute("xlink:href");
      if (!imgSrc) continue;

      if (!imageCache[imgSrc]) {
        const imgDataUrl = await resizeAndOptimiseImage(imgSrc, width, height);
        imageCache[imgSrc] = imgDataUrl;
      }

      imageEl.setAttribute("xlink:href", imageCache[imgSrc]);
      processedImages.push(imageId);
    }
  }
}

// Replace all HTTP urls with HTTPS
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

// https://www.w3.org/TR/SVG11/linking.html#processingIRI
const ID_REF_PROPERTIES = [
  "clip-path",
  "fill",
  "stroke",
  "mask",
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

export async function decodeSvgToString(
  svgData: Uint8Array,
  imageNodeDimensions: imageNodeDimensions[]
): Promise<string> {
  let svgStr = new TextDecoder("utf-8").decode(svgData);
  let svgEl = createSvgElement(svgStr);

  if (!svgEl) {
    throw new Error("Failed to create SVG element");
  }

  // Optimize images before SVG shapes for performance improvement
  if (imageNodeDimensions.length > 0) {
    await optimizeSvgImages(svgEl, imageNodeDimensions);
  }
  svgStr = svgEl?.outerHTML;

  const optimizedSvg = optimize(svgStr, {
    plugins: extendDefaultPlugins([
      {
        name: "convertPathData",
        params: {
          floatPrecision: 1,
        },
        active: true,
      },
      {
        name: "convertShapeToPath",
        params: {
          floatPrecision: 1,
        },
        active: true,
      },

      {
        name: "mergePaths",
        params: {
          floatPrecision: 1,
        },
        active: true,
      },

      {
        name: "cleanupListOfValues",
        active: true,
        params: {
          floatPrecision: 1,
        },
      },
      {
        name: "removeViewBox",
        active: false,
      },

      {
        name: "collapseGroups",
        active: false,
      },

      {
        name: "cleanupIDs",
        active: false,
      },

      {
        name: "reusePaths",
        active: false,
      },
    ]),
  });

  if (!optimizedSvg.data) {
    console.error("Failed to optimize data", optimizedSvg);
    // throw new Error("Optimization failed. Missing SVG data");
  }

  svgEl = createSvgElement(optimizedSvg.data);

  if (!svgEl) {
    throw new Error("Failed to create SVG element");
  }

  svgEl.setAttribute("preserveAspectRatio", "xMinYMin meet");
  cleanUpSvg(svgEl);
  randomiseIds(svgEl);

  return svgEl?.outerHTML;
}
