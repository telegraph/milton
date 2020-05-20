import { h } from 'preact';

import render from 'preact-render-to-string';
import type { AppState, FrameDataType } from './ui';
import { OUTPUT_FORMATS } from './constants';
// @ts-expect-error
import embedCss from './embed.css';

function generateIframeHtml(body: string) {
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style> html, body { margin: 0; } </style>
      </head>
      <body>
        ${body}
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

function renderFrame(
  svgStr: string,
  textNodes: TextNode[],
  width: number,
  height: number
) {}

export function frameRender() {}

export function outputRender(
  frames: AppState['frames'],
  renders: AppState['renders'],
  format: OUTPUT_FORMATS
) {
  if (format === OUTPUT_FORMATS.IFRAME) {
    // render iframe
  }

  if (format === OUTPUT_FORMATS.INLINE) {
    // render inline
  }

  return renders && Object.values(renders).join('\n');
}

// type TextNode = {
//   characters: string;
//   style: { [id: string]: string };
//   position: { left: string; top: string };
// };

function generateStyleText(
  node: Partial<TextNode>,
  frameWidth: number,
  frameHeight: number
) {
  const { x, y, width, height, fontSize, fontName, fills } = node;

  // Position center aligned
  const left = `${((x + width / 2) / frameWidth) * 100}%`;
  const top = `${((y + height / 2) / frameHeight) * 100}%`;

  // Colour
  const [fill] = fills;
  const { opacity = 1 } = fill;
  const { r, g, b } = fill?.color || {};
  const colourVals = [r, g, b].map((val = 0) => Math.round(val * 255));
  const colour = `rgba(${colourVals.join(',')}, ${opacity})`;

  // Font
  const fontFamily = fontName?.family || 'sans-serif';

  return `
        font-size: ${String(fontSize)}px;
        font-family: ${fontFamily};
        position: absolute;
        color: ${colour};
        width: ${width}px;
        left: ${left};
        top: ${top};
      `;
}

type TextProps = {
  node: Partial<TextNode>;
  width: number;
  height: number;
};
function Text(props: TextProps) {
  const { node, width, height } = props;

  const { characters } = node;
  const styleText = generateStyleText(node, width, height);

  return (
    <p class="f2h__text" style={styleText}>
      {characters}
    </p>
  );
}

type FrameContainerProps = {
  id: string;
  svgStr: string;
  textNodes: Partial<TextNode>[];
  width: number;
  height: number;
};

export function FrameContainer(props: FrameContainerProps) {
  const { id, width, height, textNodes, svgStr } = props;

  const textEls = textNodes.map((node) => (
    <Text node={node} width={width} height={height} />
  ));

  return (
    <div
      class="f2h__render"
      style={`width: ${width}px;`}
      id={`f2h__render__${id}`}
    >
      <div
        class="f2h__svg_container"
        dangerouslySetInnerHTML={{ __html: svgStr }}
      />

      <div class="f2h__text_container">{textEls}</div>
    </div>
  );
}

export function renderInline(
  frames: FrameDataType[],
  svgs: AppState['renders']
) {
  const renderedFrames = frames.map((frame) => (
    <FrameContainer {...frame} svgStr={svgs[frame.id]} />
  ));

  const html = render(
    <div class="f2h__embed">
      <style>{embedCss}</style>
      {renderedFrames}
    </div>
  );

  return html.replace(/\n|\r|\s{2,}/g, '');
}
