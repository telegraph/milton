import { h, JSX } from "preact";
import { saveAs } from "file-saver";
import copy from "clipboard-copy";

function downloadHtml(html: string): void {
  const fileText = `
    <!doctype html>
    <html>
      <head>
        <base target="_parent">
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>html,body{margin:0;}</style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `;

  const fileName = `figma2html-${new Date()
    .toISOString()
    .replace(/\W/g, "_")}.html`;

  saveAs(new Blob([fileText], { type: "text/html" }), fileName);
}

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
