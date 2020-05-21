import { h } from 'preact';
import render from 'preact-render-to-string';
import type { textData } from '.';
import type { AppState, FrameDataType } from './ui';
import { OUTPUT_FORMATS } from './constants';

// Import CSS file as plain text via esbuild loader option
// @ts-expect-error
import embedCss from './embed.css';

function htmlSafeId(id: string) {
  const safeId = id.replace(/\W/g, '_');

  return `f2h__render-${safeId}`;
}

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

function generateStyleText(
  node: textData,
  frameWidth: number,
  frameHeight: number
) {
  const { x, y, width, height, fontSize, fontFamily, colour } = node;

  // Position center aligned
  const left = `${((x + width / 2) / frameWidth) * 100}%`;
  const top = `${((y + height / 2) / frameHeight) * 100}%`;

  // Colour
  const { r, g, b, a } = colour;
  const colourVals = [r, g, b].map((val = 0) => Math.round(val * 255));
  const textColour = `rgba(${colourVals.join(',')}, ${a})`;

  return `
        font-size: ${String(fontSize)}px;
        font-family: "${fontFamily}", Georgia, 'Times New Roman', Times, serif;
        position: absolute;
        color: ${textColour};
        width: ${width}px;
        left: ${left};
        top: ${top};
      `;
}

type TextProps = {
  node: textData;
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
  textNodes: textData[];
  width: number;
  height: number;
};

export function FrameContainer(props: FrameContainerProps) {
  const { id, width, height, textNodes, svgStr } = props;

  const textEls = textNodes.map((node) => (
    <Text node={node} width={width} height={height} />
  ));

  return (
    <div class="f2h__render" style={`width: ${width}px;`} id={htmlSafeId(id)}>
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
  svgs: AppState['renders'],
  iframe: OUTPUT_FORMATS
) {
  const mediaQuery = genreateMediaQueries(frames);

  const renderedFrames = frames.map((frame) => (
    <FrameContainer {...frame} svgStr={svgs[frame.id]} />
  ));

  let html = render(
    <div class="f2h__embed">
      <style>
        {embedCss}
        {mediaQuery}
      </style>
      {renderedFrames}
    </div>
  );

  if (iframe === OUTPUT_FORMATS.IFRAME) {
    html = generateIframeHtml(html);
  }

  return html.replace(/\n|\r|\s{2,}/g, '');
}

function genreateMediaQueries(frames: FrameDataType[]) {
  const idWidths = frames
    .map(({ width, id }) => [width, htmlSafeId(id)])
    .sort(([a], [b]) => (a < b ? -1 : 1));

  const mediaQueries = idWidths.map(([width, id], i) => {
    if (i === 0) {
      return '';
    }

    const [, prevId] = idWidths[i - 1];

    return `
      @media (min-width: ${width}px) {
        #${prevId} { display: none; }
        #${id} { display: block; }
      }
      @media (max-width: ${width}px) {
        #${id} { display: none; }
      }
    `;
  });

  return mediaQueries.join('');
}
