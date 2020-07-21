/* eslint-disable @typescript-eslint/ban-ts-comment */
import { h } from "preact";
import render from "preact-render-to-string";
import { textData, FrameDataInterface } from "types";

// Import CSS file as plain text via esbuild loader option
// @ts-ignore
import embedCss from "./embed.css";
// @ts-expect-error
import fontsCss from "./fonts.css";

export function generateIframeHtml(body: string) {
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
  const {
    x,
    y,
    width,
    height,
    fontSize,
    fontFamily,
    colour,
    letterSpacing,
    lineHeight,
    textAlignHorizontal,
    textAlignVertical,
    fontStyle,
  } = node;

  // Position center aligned
  const left = `${((x + width / 2) / frameWidth) * 100}%`;
  const top = `${((y + height / 2) / frameHeight) * 100}%`;

  // Colour
  const { r, g, b, a } = colour;
  const colourVals = [r, g, b].map((val = 0) => Math.round(val * 255));
  const textColour = `rgba(${colourVals.join(",")}, ${a})`;
  const fontName = `${fontFamily}`;
  let fontWeight = 400;
  if (fontStyle === "Semibold" || fontStyle === "Bold") {
    fontWeight = 700;
  }

  console.log(fontStyle);

  const { unit: letterUnit, value: letterVal } = letterSpacing as {
    value: number;
    unit: "PIXELS" | "PERCENT";
  };
  let letterSpaceValue = "0";
  switch (letterUnit) {
    case "PIXELS":
      // TODO: FIX ME
      if (fontFamily === "Telesans Text") {
        letterSpaceValue = `${letterVal - 0.33}px`;
      } else if (fontFamily === "Telesans Agate") {
        letterSpaceValue = `${letterVal - 0.19}px`;
      } else {
        letterSpaceValue = `${letterVal}px`;
      }
      break;
    case "PERCENT":
      letterSpaceValue = `${letterVal / 100}em`;

      if (fontFamily === "Telesans Text") {
        letterSpaceValue = `${letterVal / 100 - 0.022}em`;
      } else if (fontFamily === "Telesans Agate") {
        letterSpaceValue = `${letterVal / 100 - 0.015}em`;
      } else {
        letterSpaceValue = `${letterVal / 100}em`;
      }
      break;
    default:
      if (fontFamily === "Telesans Text") {
        letterSpaceValue = "-0.37px";
      } else if (fontFamily === "Telesans Agate") {
        letterSpaceValue = "-0.19}px";
      } else {
        letterSpaceValue = `0`;
      }
      break;
  }

  const { unit: lineUnit, value: lineVal } = lineHeight as {
    value: number;
    unit: "AUTO" | "PIXELS" | "PERCENT";
  };
  let lineHeightValue = "auto";
  switch (lineUnit) {
    case "PIXELS":
      lineHeightValue = `${lineVal}px`;
      break;
    case "PERCENT":
      lineHeightValue = `${lineVal * 1.15}%`;
      break;
    case "AUTO":
      lineHeightValue = "1.2";
      break;
  }

  let alignItemsValue = "auto";
  switch (textAlignVertical) {
    case "TOP":
      alignItemsValue = "flex-start";
      break;
    case "CENTER":
      alignItemsValue = "center";
      break;
    case "BOTTOM":
      alignItemsValue = "flex-end";
      break;
  }

  let justifyItemsValue = "auto";
  switch (textAlignHorizontal) {
    case "LEFT":
      justifyItemsValue = "flex-start";
      break;
    case "CENTER":
      justifyItemsValue = "center";
      break;
    case "RIGHT":
      justifyItemsValue = "flex-end";
      break;
  }

  const newWidth = Math.ceil((width / frameWidth) * 100);

  return `
        font-size: ${String(fontSize)}px;
        font-family: "${fontName}", Georgia, 'Times New Roman', Times, serif;
        font-weight: ${fontWeight};
        position: absolute;
        color: ${textColour};
        width: ${newWidth}%;
        height: ${(height / frameHeight) * 100}%;
        left: ${left};
        top: ${top};
        line-height: ${lineHeightValue};
        letter-spacing: ${letterSpaceValue};
        justify-content: ${justifyItemsValue};
        align-items: ${alignItemsValue};
        display: flex;
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
    <p className="f2h__text" style={styleText}>
      {characters}
    </p>
  );
}

interface renderInlineProps {
  frames: FrameDataInterface[];
  svgText: string;
  headline?: string | undefined;
  subhead?: string | undefined;
  source?: string | undefined;
}
export function renderInline(props: renderInlineProps): string {
  const { frames, svgText, headline, subhead, source } = props;
  const mediaQuery = genreateMediaQueries(frames);
  const textNodes = [];

  for (const frame of frames) {
    const tNode = (
      <div id={`textblock-${frame.id}`} className={frame.uid}>
        {frame.textNodes.map((node) => (
          <Text
            key={node.characters}
            node={node}
            width={frame.width}
            height={frame.height}
          />
        ))}
      </div>
    );

    textNodes.push(tNode);
  }

  const html = render(
    <div className="f2h__embed">
      <style
        dangerouslySetInnerHTML={{
          __html: `
       ${fontsCss as string}
       ${embedCss as string}
       ${mediaQuery}
      `,
        }}
      ></style>

      {(headline || subhead) && (
        <header className="f2h_header">
          {headline && <h1 className="f2h_headline">{headline}</h1>}
          {subhead && <p className="f2h_subbhead">subhead</p>}
        </header>
      )}

      <div className="f2h__wrap" style={`position: relative;`}>
        <div
          className="f2h__svg_container"
          dangerouslySetInnerHTML={{ __html: svgText }}
        />
        <div className="text-nodes">{textNodes}</div>
      </div>

      {source && (
        <footer>
          <p className="f2h_source">{source}</p>
        </footer>
      )}
    </div>
  );

  return html;
}

function genreateMediaQueries(frames: FrameDataInterface[]) {
  // Sort frames by ascending height. Small > big
  const idWidths = frames
    .map(({ width, height, uid }) => [width, height, uid])
    .sort(([a], [b]) => (a < b ? -1 : 1));

  const mediaQueries = idWidths.map(([width, height, uid], i) => {
    // Always show smallest frame
    if (i === 0) {
      return `
          .f2h__svg_container,
          .f2h__wrap {
            width: ${width}px;
            height: ${height}px;
          }
        `;
    }

    const [, , prevId] = idWidths[i - 1];

    // Note: Cascade order is important
    return `
      /* Hide until width is reached */
      @media (max-width: ${width}px) {
        .${uid} { display: none; }
      }

      /* Hide previous and show current frame */
      @media (min-width: ${width}px) {
        .${prevId} { display: none; }
        .${uid} { display: block; }
        .f2h__svg_container,
        .f2h__wrap {
          width: ${width}px;
          height: ${height}px;
        }
      }
    `;
  });

  return mediaQueries.join("");
}
