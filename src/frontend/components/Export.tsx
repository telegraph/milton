import copy from "clipboard-copy";
import { saveAs } from "file-saver";
import { AppContext } from "frontend/app_context";
import { h } from "preact";
import { NOTIFICATIONS_IDS, UI_TEXT } from "../../constants";

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

  const date = new Date().toISOString().replace(/\W/g, "_");
  const fileName = `figma2html-${date}.html`;

  saveAs(new Blob([fileText], { type: "text/html;charset=utf-8" }), fileName);
}

export function Export() {
  return (
    <AppContext.Consumer>
      {(props) => (
        <div class="export">
          <button
            class="export__clipboard btn btn--clean"
            onClick={async () => {
              const html = await props.getHtml();
              await copy(html);
              console.log("here");
              props.setNotification(NOTIFICATIONS_IDS.INFO_CLIPBOARD_COPIED);
            }}
          >
            {UI_TEXT.COPY_TO_CLIPBOARD}
          </button>

          <button
            class="export__download btn btn--clean"
            onClick={async () => {
              const html = await props.getHtml();
              downloadHtml(html);
              props.setNotification(NOTIFICATIONS_IDS.INFO_DOWNLOAD_SUCCESS);
            }}
          ></button>
        </div>
      )}
    </AppContext.Consumer>
  );
}
