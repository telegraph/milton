export function decodeSvgToString(svg: Uint8Array) {
  let svgStr = new TextDecoder("utf-8").decode(svg);
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

  // Update HTTP links to HTTPS
  svgStr = svgStr.replace(/http:\/\//g, "https://");

  return svgStr;
}

export async function getSvgString(url: string): Promise<string> {
  return fetch(url).then((res) => {
    if (res.ok === false) throw new Error("Failed to fetch SVG blob");

    return res.text();
  });
}
