import copy from "clipboard-copy";
import { saveAs } from "file-saver";
import { actionSetNotification, ActionTypes } from "frontend/actions";
import type { JSX } from "preact";
import { Component, h } from "preact";
import { NOTIFICATIONS_IDS, UI_TEXT } from "../../constants";

interface ExportProps {
  svg: string;
  html: string;
  dispatch: (action: ActionTypes) => void;
}
export class Export extends Component<ExportProps> {
  copyToClipboard = (): void => {
    copy(this.props.html)
      .then(() =>
        this.props.dispatch(
          actionSetNotification(NOTIFICATIONS_IDS.INFO_CLIPBOARD_COPIED)
        )
      )
      .catch(console.error);
  };

  downloadHtml = (): void => {
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
          ${this.props.html}
        </body>
      </html>
    `;

    const fileName = `figma2html-${new Date()
      .toISOString()
      .replace(/\W/g, "_")}.html`;

    saveAs(new Blob([fileText], { type: "text/html" }), fileName);
  };

  render(): JSX.Element {
    const fileSizeKb = Math.ceil(this.props.svg.length / 1024);

    return (
      <div class="export">
        <button
          class="export__clipboard btn btn--clean"
          onClick={this.copyToClipboard}
        >
          {UI_TEXT.COPY_TO_CLIPBOARD}
        </button>

        <button
          class="export__download btn btn--clean"
          onClick={this.downloadHtml}
        >
          {`Download ${fileSizeKb}Kb`}
        </button>
      </div>
    );
  }
}
