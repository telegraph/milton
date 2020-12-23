import { h, JSX } from "preact";

import { downloadHtml, copyToClipboard } from "utils/common";

interface ExportProps {
  svg: string;
  html: string;
}
export function Export({ svg, html }: ExportProps): JSX.Element {
  return (
    <fieldset class="export">
      <legend>
        Export{" "}
        <span class="export__filesize">{Math.ceil(svg.length / 1024)}k</span>
      </legend>

      <button class="btn export__copy" onClick={() => copyToClipboard(html)}>
        Copy to clipboard
      </button>

      <button class="btn export__download" onClick={() => downloadHtml(html)}>
        Download
      </button>
    </fieldset>
  );
}
