import { crunchSvg } from "./crunchSvg";

export async function decodeSvgToString(svg: Uint8Array, ids: string[][]) {
  let svgStr = new TextDecoder("utf-8").decode(svg);
  // Update HTTP links to HTTPS
  svgStr = svgStr.replace(/http:\/\//g, "https://");

  // Replace figma IDs "00:00" with CSS valid IDs
  ids.forEach(([id, uid]) => {
    svgStr = svgStr.replace(`id="${id}"`, `id="${id}" class="${uid}" `);
  });

  const emptyDiv = document.createElement("div");
  emptyDiv.innerHTML = svgStr;
  const svgEl = emptyDiv.querySelector("svg");
  crunchSvg(svgEl);
  // BUG: Remove empty clip paths
  [...(svgEl?.querySelectorAll("clipPath") || [])].forEach((clipPath) => {
    if (clipPath.childElementCount === 0) {
      clipPath.parentNode?.removeChild(clipPath);
    }
  });

  return svgEl?.outerHTML;
}

export async function getSvgString(url: string): Promise<string> {
  return fetch(url).then((res) => {
    if (res.ok === false) throw new Error("Failed to fetch SVG blob");

    return res.text();
  });
}
