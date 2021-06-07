import { resizeAndOptimiseImage } from "./imageHelper";
import { imageNodeDimensions } from "types";
import { randomId } from "utils/common";
import { optimize, extendDefaultPlugins } from "svgo/dist/svgo.browser.js";

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
  svgStr = replaceHttpWithHttps(svgStr);

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

  const svgEl = createSvgElement(optimizedSvg.data);
  if (!svgEl) throw new Error("Failed to create SVG element");

  svgEl.setAttribute("preserveAspectRatio", "xMinYMin meet");
  cleanUpSvg(svgEl);
  randomiseIds(svgEl);
  await optimizeSvgImages(svgEl, imageNodeDimensions);

  return svgEl?.outerHTML;
}
