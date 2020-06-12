/**
 * Converts basic shape to more compact path.
 * It also allows further optimizations like
 * combining paths with similar attributes.
 *
 * @see http://www.w3.org/TR/SVG/shapes.html
 *
 * @param {SVGGeometryElement} item current iteration item
 *
 * @author Lev Solntsev
 */
export function convertShapesToPath(el: SVGElement): void {
  if (
    el instanceof SVGRectElement &&
    el.hasAttribute("width") &&
    el.hasAttribute("height") &&
    el.hasAttribute("rx") === false &&
    el.hasAttribute("ry") === false
  ) {
    const x = parseFloat(el.getAttribute("x") || "0");
    const y = parseFloat(el.getAttribute("y") || "0");
    const width = parseFloat(el.getAttribute("width") || "0");
    const height = parseFloat(el.getAttribute("height") || "0");

    // Values like '100%' compute to NaN, thus running after
    // cleanupNumericValues when 'px' units has already been removed.
    // TODO: Calculate sizes from % and non-px units if possible.
    if (isNaN(x - y + width - height)) return;

    const pathEl = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );

    const pathData = `M${x} ${y}H${x + width}V${y + height}H${x}z`;
    pathEl.setAttribute("d", pathData);

    const ATTRIBUTES_TO_EXCLUDE = ["x", "y", "width", "height"];
    for (const prop of Array.from(el.attributes)) {
      if (ATTRIBUTES_TO_EXCLUDE.includes(prop.name) === false) {
        pathEl.setAttribute(prop.name, prop.value);
      }
    }

    el.parentElement?.replaceChild(pathEl, el);
  } else if (el instanceof SVGLineElement) {
    const x1 = parseFloat(el.getAttribute("x1") || "0");
    const x2 = parseFloat(el.getAttribute("x2") || "0");
    const y1 = parseFloat(el.getAttribute("y1") || "0");
    const y2 = parseFloat(el.getAttribute("y2") || "0");

    if (isNaN(x1 - y1 + x2 - y2)) return;

    const pathEl = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );
    const pathData = `M${x1} ${y1}L${x2} ${y2}`;
    pathEl.setAttribute("d", pathData);

    const ATTRIBUTES_TO_EXCLUDE = ["x1", "y1", "x2", "y2"];
    for (const prop of Array.from(el.attributes)) {
      if (ATTRIBUTES_TO_EXCLUDE.includes(prop.name) === false) {
        pathEl.setAttribute(prop.name, prop.value);
      }
    }

    el.parentElement?.replaceChild(pathEl, el);
  } else if (
    (el instanceof SVGPolylineElement || el instanceof SVGPolygonElement) &&
    el.hasAttribute("points")
  ) {
    const REGX_NUMBER = /[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g;
    const points = el.getAttribute("points") ?? "";
    const coords = (points.match(REGX_NUMBER) ?? []).map(Number);

    if (coords.length < 4) return;

    const pathEl = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );
    const [x, y] = coords.slice(0, 2);
    const remainingPoints = coords.slice(2).join(" ");
    const suffix = el instanceof SVGPolygonElement ? "z" : "";
    const pathData = `M${x} ${y}L${remainingPoints}${suffix}`;
    pathEl.setAttribute("d", pathData);

    const ATTRIBUTES_TO_EXCLUDE = ["points"];
    for (const prop of Array.from(el.attributes)) {
      if (ATTRIBUTES_TO_EXCLUDE.includes(prop.name) === false) {
        pathEl.setAttribute(prop.name, prop.value);
      }
    }

    el.parentElement?.replaceChild(pathEl, el);
  }
}
