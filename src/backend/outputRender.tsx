import { h } from "preact";
import render from "preact-render-to-string";
import { textData, FrameDataInterface, TextRange, FontStyle } from "types";

// Import CSS file as plain text via esbuild loader option
// @ts-expect-error
import embedCss from "backend/embed.css";
// @ts-expect-error
import fontsCss from "backend/telegraphFonts.css";
import { buildFontFaceCss } from "./fonts";

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

// Remove line-breaks and multiple whitespace
function minimiseText(str: string): string {
  return str
    .replace(/\s{2,}/g, " ")
    .replace(/\n|\r/g, "")
    .trim();
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

function generateSpanStyles({
  weight,
  colour,
  family,
  italic,
  letterSpacing,
  lineHeight,
  size,
}: TextRange): string {
  let cssStyle = "";
  if (letterSpacing) cssStyle += `letter-spacing: ${letterSpacing};`;
  if (lineHeight) cssStyle += `line-height: ${lineHeight};`;
  if (size) cssStyle += `font-size: ${size}px;`;
  if (colour) cssStyle += `color: ${colour};`;
  if (family) cssStyle += `font-family: ${family};`;
  if (italic) cssStyle += `font-style: italic;`;
  if (weight) cssStyle += `font-weight: ${weight};`;

  return cssStyle;
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
            key={style.text}
            data-text={node.strokeWeight ? style.text : ""}
            style={generateSpanStyles(style)}
            dangerouslySetInnerHTML={{
              __html: style.text.replace(/\n/g, "<br />"),
            }}
          ></span>
        ))}
      </p>
    </div>
  );
}

type FrameProps = {
  frames: FrameDataInterface[];
};
function TextContainer(props: FrameProps) {
  const { frames } = props;

  return (
    <div className="text-nodes">
      {frames.map((frame) => (
        <div
          id={`textblock-${frame.id}`}
          className={`f2h__frame_text ${frame.uid}`}
        >
          {frame.textNodes.map((node) => (
            <Text
              node={node}
              width={frame.width}
              height={frame.height}
              positionFixed={frame.fixedPositionNodes.includes(node.id)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Extract unique font styles from range styles nested deep in frame info
// frames[] -> textNodes[] -> rangeStyles[] -> { style }
function generateFontFaces(frames: FrameDataInterface[]): string {
  // @TODO: Extracting font styles is messy. Could we collect this info
  // from the backend when building up the text style ranges?
  const fontStyles = frames
    .flatMap(({ textNodes }) => textNodes)
    .flatMap(({ rangeStyles }) => rangeStyles)
    .flatMap(({ family, italic, weight }) => ({ family, italic, weight }))
    .reduce((acc, style): FontStyle[] => {
      // De-dupe styles by searching for a match in the accumulator
      return acc.some(
        ({ family, weight, italic }) =>
          family === style.family &&
          italic === style.italic &&
          weight === style.weight
      )
        ? acc
        : [...acc, style];
    }, [] as FontStyle[]);

  return buildFontFaceCss(fontStyles);
}

type renderInlineProps = {
  frames: FrameDataInterface[];
  svgText: string;
  headline?: string | undefined;
  subhead?: string | undefined;
  source?: string | undefined;
  responsive: boolean;
};
export function generateEmbedHtml(props: renderInlineProps): string {
  const { frames, svgText, headline, subhead, source, responsive } = props;
  const mediaQuery = genreateMediaQueries(frames);
  const fontFaces = generateFontFaces(frames);

  const css = minimiseText(fontFaces + embedCss + mediaQuery);

  const html = render(
    <div className={`f2h__embed ${responsive ? "f2h--responsive" : ""}`}>
      <style dangerouslySetInnerHTML={{ __html: css }}></style>

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
        <TextContainer frames={frames} />
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
      // Wrapper widths
      cssText += `
        .f2h__embed.f2h--responsive {
          width: ${(width / height) * 100}vh;
        }
        .f2h__svg_container,
        .f2h__wrap {
            width: ${width}px;
            height: ${height}px;
          }`;

      cssText += `.f2h--responsive svg {
            width: ${(largestWidth / width) * 100}%;
        }`;

      cssText += `.f2h__frame.${uid},
        .f2h__frame_text.${uid} {
          display: block;
        }`;

      cssText += `     
        .f2h--responsive .f2h__wrap  {
          padding-top: ${(height / width) * 100}%;
        }`;
    } else {
      // Styles for the  remaining breakpoints
      const { uid: prevId } = sortedFrames[i - 1];

      /* Hide previous and show current frame */
      cssText += `
      @media (min-width: ${width}px) {
        .f2h__embed.f2h--responsive {
          width: ${(width / height) * 100}vh;
        }

        .f2h__svg_container,
        .f2h__wrap {
            width: ${width}px;
            height: ${height}px;
        }
        .f2h--responsive svg {
          width: ${(largestWidth / width) * 100}%;
        }
        .f2h--responsive .f2h__wrap  {
          padding-top: ${(height / width) * 100}%;
        }
        .${prevId} { display: none !important; }
        .${uid} { display: block !important; }
      }
      `;
    }

    // Style for last breakpoint
    // if (i === sortedFrames.length - 1) {
    //   cssText += `
    //     @media (min-aspect-ratio: ${
    //       width / height
    //     }) and (min-width: ${width}px) {
    //       .f2h--responsive svg {
    //         max-height: 100vh;
    //       }
    //       .f2h--responsive .text-nodes {
    //         /* max-width is aspect ratio */
    //         max-width: ${(width / height) * 100}vh;

    //       }

    //     }
    //   `;
    // }
  }

  return cssText;
}

function test<T>(arg: T[]): T[] {
  console.log(arg.length);
  return arg;
}

console.log(test([3]));
