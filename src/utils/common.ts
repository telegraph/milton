import { saveAs } from "file-saver";

export function containsDuplicate(values: number[]): boolean {
  return values.some(
    (width, _i, arr) => arr.filter((val) => val === width).length > 1
  );
}

export function isEmpty(collection: Record<string, unknown>): boolean {
  return !collection || Object.keys(collection).length === 0;
}

// Trigger download SVG HTML as a file
export function downloadHtml(html: string): void {
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
