import copy from "clipboard-copy";
import { saveAs } from "file-saver";
import { actionSetNotification } from "frontend/actions";
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

  saveAs(new Blob([fileText], { type: "text/html" }), fileName);
}

async function copyToClipboard(html: string): Promise<void> {
  try {
    await copy(html);
    actionSetNotification(NOTIFICATIONS_IDS.INFO_CLIPBOARD_COPIED);
  } catch (err) {
    console.error(err);
  }
}

export function Export() {
  return (
    <AppContext.Consumer>
      {(props) => (
        <div class="export">
          <button
            class="export__clipboard btn btn--clean"
            onClick={async () => copyToClipboard(await props.getHtml())}
          >
            {UI_TEXT.COPY_TO_CLIPBOARD}
          </button>

          <button
            class="export__download btn btn--clean"
            onClick={async () => downloadHtml(await props.getHtml())}
          ></button>
        </div>
      )}
    </AppContext.Consumer>
  );
}
