/* eslint-disable @typescript-eslint/ban-ts-comment */
import { h } from "preact";
import render from "preact-render-to-string";
import { textData, FrameDataInterface } from "types";

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
  const { x, y, width, height } = node;

  // Position center aligned
  const left = `${((x + width / 2) / frameWidth) * 100}%`;
  const top = `${((y + height / 2) / frameHeight) * 100}%`;

  return `
        width: ${width}px;
        transform: translate(-50%, -50%);
        left: ${left};
        top: ${top};
        display: block;
      `;
}

type TextProps = {
  node: textData;
  width: number;
  height: number;
};
function Text(props: TextProps) {
  const { node, width, height } = props;

  // TODO: Style containing DIV with dimensions
  // TODO: Split characters based on styles and wrap them in <span>s
  const styleText = generateParagraphStyle(node, width, height);

  // Split text onto multiple lines based on linebreaks
  const { characters } = node;
  const lines = characters.split("\n");
  console.log(lines);

  // FIXME: Spit spans accross <p> elements for proper line-heights

  // Find all the line breaks
  let previousIndex = 0;
  let foundIndex = 0;
  do {
    // Start search position from 0 or the next char from previous location
    const position = previousIndex ? previousIndex + 1 : 0;
    foundIndex = characters.indexOf("\n", position);

    // End location is with recent find or end of string
    const endPosition = foundIndex > -1 ? foundIndex : undefined;

    // Extact string from found positions
    console.log({ previousIndex, foundIndex, endPosition: endPosition });
    const str = characters.substring(position, endPosition);
    console.log(`Chars "${str}"`);

    console.log(node.rangeStyles);

    // Find all styles that fall with found range
    const styleNodes = node.rangeStyles.filter((style) => {
      const { start, end } = style;
      return previousIndex >= start && foundIndex <= end - 1;
    });

    console.log(styleNodes);

    // Store reference to found position
    previousIndex = foundIndex;
  } while (foundIndex != -1);

  return (
    <p className="f2h__text" style={styleText}>
      {node.rangeStyles.map((style) => (
        <span
          key={style.chars}
          style={`

          letter-spacing: ${style.letterSpace};
          ${style.lineHeight ? `line-height: ${style.lineHeight}` : ""};
          font-size: ${style.size}px;
          color: rgb(${style.colour.r * 255},${style.colour.g * 255},${
            style.colour.b * 255
          });
          font-family: "${style.font.family}";
    
          font-weight: ${
            style.font.style === "Bold" || style.font.style === "Semibold"
              ? 700
              : 400
          };
        `}
          dangerouslySetInnerHTML={{
            __html: style.chars.replace(/\n/g, "<br />"),
          }}
        ></span>
      ))}
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
    <div className="f2h__embed f2h--responsive">
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
