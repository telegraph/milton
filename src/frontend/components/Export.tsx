import { h, Component } from "preact";
import { saveAs } from "file-saver";
import copy from "clipboard-copy";
import { UI_TEXT } from "../../constants";
import { Dropdown } from "frontend/components/dropdown/dropdown";
import { shareServices } from "config.json";

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
  zoom: number;
}
export class Export extends Component<ExportProps> {
  copyToClipboard = () => {
    copy(this.props.html)
      .then(() => {
        alert("Figma2HTML code copied to clipboard");
      })
      .catch(console.error);
  };

  render() {
    const fileSizeKb = Math.ceil(this.props.svg.length / 1024);

    const servicesList = shareServices.map((service) => ({
      text: `${service.name} ›`,
      value: service.url,
    }));

    return (
      <div class="export">
        <button class="btn export__download" onClick={() => downloadHtml(html)}>
          Download
        </button>

        <Dropdown
          className={"clipboard"}
          onOpen={this.copyToClipboard}
          options={servicesList}
          label={UI_TEXT.COPY_TO_CLIPBOARD}
          onSelect={(val) => console.log(val)}
        />
      </div>
    );
  }
}
