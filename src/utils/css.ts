export function injectCss(css: string) {
  const styleEl = document.createElement("style");
  const styleText = document.createTextNode(css);
  styleEl.appendChild(styleText);
  document.head.appendChild(styleEl);
}
