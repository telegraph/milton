import { saveAs } from 'file-saver';
import type { board } from './index';

function saveBinaryFile(data: any, filename: string = 'download') {
  const blob = new Blob([data], { type: 'text/html' });
  saveAs(blob, filename);
}

function main(boards: board[]) {
  // Sort boards by width ascending
  boards.sort((a, b) => {
    return a.width < b.width ? -1 : 1;
  });

  const svgsHtml = boards.map((board) => {
    const { id, buffer } = board;
    const svgStr = String.fromCharCode.apply(null, Array.from(buffer));

    return `
      <div class="container" id="${id}">
        ${svgStr}
      </div>
    `;
  });

  const mediaQueries = boards.map((board, i) => {
    const { id, width } = board;
    const { width: nextWidth } = boards[i + 1] || {};

    return `
      #${id} {
        display: none;
      }
      @media screen and (min-width: ${width}px) ${
      nextWidth ? `and (max-width: ${nextWidth}px)` : ''
    } {
        #${id} {
          display: block;
        }
      }
    `;
  });

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          html, body {
            margin: 0;
            font-size: 16px;
          }
        </style>
        <style>
          ${mediaQueries.join('\n')}
        </style>
      </head>
      <body>
        ${svgsHtml.join('\n')}
      </body>
    </html>
  `;
  // console.log(html);
  saveBinaryFile(html, 'figma2html-export.html');
}

window.addEventListener('message', (event) => {
  const { type, data } = event?.data?.pluginMessage;
  if (type && type === 'EXPORT') {
    main(data);
  }
});
