import { h, JSX } from "preact";
import copy from "clipboard-copy";
import { downloadHtml } from "utils/common";

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

      <button
        class="btn export__copy"
        onClick={() => {
          copy(html)
            .then(() => {
              alert("Figma2HTML code copied to clipboard");
            })
            .catch(console.error);
        }}
      >
        Copy to clipboard
      </button>

      <button class="btn export__download" onClick={() => downloadHtml(html)}>
        Download
      </button>
    </fieldset>
  );
}
