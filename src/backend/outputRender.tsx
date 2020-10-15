import { h } from "preact";
import render from "preact-render-to-string";
import { textData, FrameDataInterface, ITextStyle } from "types";

// Import CSS file as plain text via esbuild loader option
// @ts-expect-error
import embedCss from "backend/embed.css";
// @ts-expect-error
import fontsCss from "backend/telegraphFonts.css";

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
  frameHeight: number,
  positionFixed: boolean
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

  // Strokes
  if (strokeWeight && strokeColour) {
    styleText += `
     -webkit-text-stroke-color:  ${strokeColour};
    `;
  }

  // TODO: Add sensible logic for vertical alignment in responsive view

  // Position center aligned
  const leftPos = (x + width / 2) / frameWidth;
  const left = `${leftPos * 100}%`;
  const top = `${((y + height / 2) / frameHeight) * 100}%`;

  let alignVertical = "center";
  let verticalPosition = "";
  switch (textAlignVertical) {
    case "TOP":
      alignVertical = "flex-start";
      break;
    case "CENTER":
      alignVertical = "center";
      break;
    case "BOTTOM":
      alignVertical = "flex-end";
      break;
  }

  switch (constraints.vertical) {
    case "MIN":
      verticalPosition = `top: ${top}`;
      break;
    case "MAX":
      verticalPosition = `bottom: ${frameHeight - y - height - height / 2}px`;
      break;
    default:
      verticalPosition = `top: ${top}`;
  }

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
        width: ${positionFixed ? "auto" : `${(width / frameWidth) * 100}%`};
        height: ${positionFixed ? "auto" : `${(height / frameHeight) * 100}%`};
        left: ${positionFixed ? `${x}px` : left};
        ${verticalPosition};
        text-align: ${textAlignHorizontal.toLocaleLowerCase()};
        align-items: ${alignVertical};
        justify-content: ${alignHorizontal};
        position: ${positionFixed ? "fixed" : "absolute"};
        ${positionFixed ? "transform: none;" : ""}
      `;
}

function generateSpanStyles(style: ITextStyle): string {
  const { r, g, b } = style.colour;
  const colour = `rgb(${r * 255}, ${g * 255}, ${b * 255})`;

  // Font weights
  let fontWeight = 400;
  switch (style.font.style) {
    case "Bold":
      fontWeight = 700;
      break;

    case "Semibold":
      fontWeight = 600;
      break;

    case "Medium":
      fontWeight = 500;
      break;

    case "Roman":
      fontWeight = 400;
      break;
  }

  // HACK: Fix letter spacing font rendering by adding offset
  let letterSpaceOffset = "0px";
  if (style.font.family === "Telesans Text") {
    letterSpaceOffset = "0.026em";
  }
  if (style.font.family === "Telesans Agate") {
    // letterSpaceOffset = "0.004em";
  }
  if (
    style.font.family === "Austin News Deck" &&
    ["Bold", "Semibold"].includes(style.font.style)
  ) {
    letterSpaceOffset = "0.02em";
  }

  // Font style
  let fontStyle = "normal";
  if (RegExp("italic", "i").test(style.font.style)) {
    fontStyle = "italic";
  }

  return `
    letter-spacing: calc(${style.letterSpace} - ${letterSpaceOffset});
    line-height: ${style.lineHeight};
    font-size: ${style.size}px;
    color: ${colour};
    font-family: "${style.font.family}";
    font-weight: ${fontWeight};
    font-style: ${fontStyle};
`;
}

type TextProps = {
  node: textData;
  width: number;
  height: number;
  positionFixed: boolean;
};
function Text(props: TextProps) {
  const { node, width, height, positionFixed } = props;

  return (
    <div
      className={`f2h__text ${node.strokeWeight ? "f2h__text--stroke" : ""}`}
      style={generateParagraphStyle(node, width, height, positionFixed)}
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
export function generateEmbedHtml(props: renderInlineProps): string {
  const { frames, svgText, headline, subhead, source, responsive } = props;
  const mediaQuery = genreateMediaQueries(frames);

  const fonts = frames.flatMap((frame) =>
    frame.textNodes.flatMap((textNode) =>
      textNode.rangeStyles.flatMap((range) => range.font)
    )
  );
  console.log(fonts);

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
            positionFixed={frame.fixedPositionNodes.includes(node.id)}
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
       ${fontsCss}
       ${embedCss}
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

/**
 * TODO: There's too much logic in  here. Breakout into separate functions
 */
function genreateMediaQueries(frames: FrameDataInterface[]) {
  // Sort frames by ascending height. Small > big
  const sortedFrames = Object.values(frames)
    .map(({ width, height, uid }) => ({ width, height, uid }))
    .sort((a, b) => (a.width < b.width ? -1 : 1));

  const largestWidth = Math.max(...sortedFrames.map(({ width }) => width));

  let cssText = "";
  for (let i = 0; i < sortedFrames.length; i++) {
    const { uid, width, height } = sortedFrames[i];

    // Styles for the first (smallest) breakpoint
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
    } else {
      // Styles for the  remaining breakpoints
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

    // Style for last breakpoint
    if (i === sortedFrames.length - 1) {
      cssText += `
        @media (min-aspect-ratio: ${
          width / height
        }) and (min-width: ${width}px) {
          .f2h--responsive svg { 
            max-height: 100vh;
          }
          .f2h--responsive .text-nodes {
            /* max-width is aspect ratio */
            max-width: ${(width / height) * 100}vh;
            left: 50%;
            transform: translateX(-50%);
          }
          .f2h--responsive .f2h__wrap {
            max-height: 100vh;
          }
        }
      `;
    }
  }

  return cssText;
}

function test<T>(arg: T[]): T[] {
  console.log(arg.length);
  return arg;
}

console.log(test([3]));
