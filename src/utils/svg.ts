import UPNG from "upng-js";
import { crunchSvg } from "./crunchSvg";

export async function decodeSvgToString(svg: Uint8Array) {
  let svgStr = new TextDecoder("utf-8").decode(svg);
  // Update HTTP links to HTTPS
  svgStr = svgStr.replace(/http:\/\//g, "https://");

  // const emptyDiv = document.createElement("div");
  // emptyDiv.innerHTML = svgStr;
  // const svgEl = emptyDiv.querySelector("svg");
  // crunchSvg(svgEl);

  return svgStr;
}

export async function getSvgString(url: string): Promise<string> {
  return fetch(url).then((res) => {
    if (res.ok === false) throw new Error("Failed to fetch SVG blob");

    return res.text();
  });
}
