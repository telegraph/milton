import type { AppState } from './ui';

function generateIframeHtml(mediaQueries: string[], svgsHtml: string[]) {
  return `
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
          p {
            margin: 0;
            padding: 0;
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
}

function genreateMediaQueries(frames: AppState['frames']) {
  const mediaQueries = frames.map((frame, i) => {
    const { id, width } = frame;
    const { width: nextWidth } = frames[i + 1] || {};

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

  return mediaQueries;
}

const baseStyle = `
<style>
      @import url('https://cf.eip.telegraph.co.uk/assets/_css/fontsv02.css');
      .f_svg_text {
        margin: 0;
        font-family: sans-serif;
        transform: translate(-50%, -50%);
      }
      .f_svg_wrapper {
        width: 100%;
      }
      svg {
        width: 100%;
        height: auto;
      }
      svg text {
        display: none;
      }
    </style>
  `;

export function frameRender() {}

export function outputRender(
  frames: AppState['frames'],
  renders: AppState['renders']
) {
  return renders && Object.values(renders).join('\n');
}
