/* eslint-disable @typescript-eslint/ban-ts-comment */
import { h } from "preact";
import render from "preact-render-to-string";
import { textData, FrameDataInterface, ITextStyle } from "types";

// Import CSS file as plain text via esbuild loader option
// @ts-ignore
import embedCss from "./embed.css";
// @ts-expect-error
import fontsCss from "./fonts.css";

export function generateIframeHtml(body: string): string {
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

function generateParagraphStyle(
  node: textData,
  frameWidth: number,
  frameHeight: number
) {
  const {
    x,
    y,
    width,
    height,
    textAlignHorizontal,
    textAlignVertical,
    constraints,
    strokeWeight,
    strokeColour,
  } = node;

  let styleText = "";

  // FIXME: HACK - HTML text widths are larger than text node in figma resulting
  // in wrapping text. Need a smarter way to calculate addition width based
  // on font, letter-spacing and number of characters
  const BUFFER = 4;
  console.log("alignment", textAlignHorizontal, textAlignVertical);

  // Position center aligned
  const left = `${((x + width / 2) / frameWidth) * 100}%`;
  const top = `${((y + height / 2) / frameHeight) * 100}%`;

  // Strokes
  console.log("IN HERER", strokeColour, strokeWeight);
  if (strokeWeight && strokeColour) {
    console.log("IN HERER", strokeColour, strokeWeight);
    styleText += `
     -webkit-text-stroke-color:  ${strokeColour};
    `;
  }

  // TODO: Add sensible logic for vertical alignment in responsive view
  const alignVertical = "center";
  // switch (constraints.vertical) {
  //   case "MIN":
  //     alignVertical = "flex-start";
  //     break;
  //   case "CENTER":
  //     alignVertical = "center";
  //     break;
  //   case "MAX":
  //     alignVertical = "flex-end";
  //     break;
  // }

  let alignHorizontal = "center";
  switch (constraints.horizontal) {
    case "MIN":
      alignHorizontal = "flex-start";
      break;
    case "CENTER":
      alignHorizontal = "center";
      break;
    case "MAX":
      alignHorizontal = "flex-end";
      break;
  }

  return `
        ${styleText}
        width: ${((width + BUFFER) / frameWidth) * 100}%;
        height: ${((height + BUFFER) / frameHeight) * 100}%;
        left: ${left};
        top: ${top};
        text-align: ${textAlignHorizontal.toLocaleLowerCase()};
        align-items: ${alignVertical};
        justify-content: ${alignHorizontal}
      `;
}

function generateSpanStyles(style: ITextStyle): string {
  const { r, g, b } = style.colour;
  const colour = `rgb(${r * 255}, ${g * 255}, ${b * 255})`;
  const fontWeight =
    style.font.style === "Bold" || style.font.style === "Semibold" ? 700 : 400;

  // HACK: Fix letter spacing font rendering by adding offset
  let letterSpaceOffset = "0px";
  if (style.font.family === "Telesans Text") {
    letterSpaceOffset = "0.022em";
  }
  if (style.font.family === "Telesans Agate") {
    letterSpaceOffset = "0.013em";
  }

  return `
    letter-spacing: calc(${style.letterSpace} - ${letterSpaceOffset});
    line-height: ${style.lineHeight};
    font-size: ${style.size}px;
    color: ${colour};
    font-family: "${style.font.family}";
    font-weight: ${fontWeight};
`;
}

type TextProps = {
  node: textData;
  width: number;
  height: number;
};
function Text(props: TextProps) {
  const { node, width, height } = props;

  return (
    <div
      className={`f2h__text ${node.strokeWeight ? "f2h__text--stroke" : ""}`}
      style={generateParagraphStyle(node, width, height)}
    >
      <p className="f2h__text_inner">
        {node.rangeStyles.map((style) => (
          <span
            key={style.chars}
            data-text={node.strokeWeight ? style.chars : ""}
            style={generateSpanStyles(style)}
            dangerouslySetInnerHTML={{
              __html: style.chars.replace(/\n/g, "<br />"),
            }}
          ></span>
        ))}
      </p>
    </div>
  );
}

interface renderInlineProps {
  frames: FrameDataInterface[];
  svgText: string;
  headline?: string | undefined;
  subhead?: string | undefined;
  source?: string | undefined;
  responsive: boolean;
}
export function renderInline(props: renderInlineProps): string {
  const { frames, svgText, headline, subhead, source, responsive } = props;
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
    <div className={`f2h__embed ${responsive ? "f2h--responsive" : ""}`}>
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
  const sortedFrames = Object.values(frames)
    .map(({ width, height, uid }) => ({ width, height, uid }))
    .sort((a, b) => (a.width < b.width ? -1 : 1));

  const largestWidth = Math.max(...sortedFrames.map(({ width }) => width));

  let cssText = "";
  for (let i = 0; i < sortedFrames.length; i++) {
    const { uid, width, height } = sortedFrames[i];

    if (i === 0) {
      cssText += `
            .f2h__svg_container,
            .f2h__wrap {
              width: ${width}px;
              height: ${height}px;
            }

            .f2h--responsive .f2h__svg_container,
            .f2h--responsive .f2h__wrap
            {
              width: 100%;
              height: ${(height / width) * 100}vw;
            }

            .f2h--responsive svg {
              width: ${(largestWidth / width) * 100}%;
              height: auto;
            }
          `;

      continue;
    }

    const { uid: prevId } = sortedFrames[i - 1];
    cssText += `
      /* Hide until width is reached */
      @media (max-width: ${width}px) {
        .${uid} { display: none; }
      }

      /* Hide previous and show current frame */
      @media (min-width: ${width}px) {
        .f2h--responsive svg {
          width: ${(largestWidth / width) * 100}%;
        }

        .${prevId} { display: none; }
        .${uid} { display: block; }
        .f2h__svg_container,
        .f2h__wrap {
          width: ${width}px;
          height: ${height}px;
        }

        .f2h--responsive .f2h__svg_container,
        .f2h--responsive .f2h__wrap {
          height: ${(height / width) * 100}vw;
         }

        }
      `;
  }

  return cssText;
}
