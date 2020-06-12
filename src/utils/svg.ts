export function decodeSvgToString(svg: Uint8Array) {
  let svgStr = new TextDecoder("utf-8").decode(svg);
  // NOTE: Figma generates non-unique IDs for masks which can clash when
  // embedding multiple SVGSs. We do a string replace for unique IDs
  const regex = /id="(.+?)"/g;
  const ids: string[] = [];
  let matches;

  while ((matches = regex.exec(svgStr))) {
    const [, id] = matches;
    ids.push(id);
  }

  ids.forEach((id) => {
    const rnd = Math.random().toString(32).substr(2);
    const randomId = `${id}-${rnd}`;
    // Replace ID
    svgStr = svgStr.replace(`id="${id}"`, `id="${randomId}"`);
    // Replace anchor refs
    svgStr = svgStr.replace(`#${id}`, `#${randomId}`);
  });

  // Update HTTP links to HTTPS
  svgStr = svgStr.replace(/http:\/\//g, "https://");

  return svgStr;
}
