// Import CSS file as plain text via esbuild loader option
import { Fragment, FunctionalComponent, h, JSX } from "preact";
import render from "preact-render-to-string";
import { FrameDataInterface, textData, TextRange } from "types";
import { version } from "../../../package.json";
import { buildFontFaceCss, generateFontStyles } from "../../backend/fonts";

const embedCss = `
html,
body {
  margin: 0;
  overflow: hidden;

  /* Remove font smoothing */
  -moz-osx-font-smoothing: grayscale; /* Firefox */
  -webkit-font-smoothing: antialiased; /* WebKit  */
}

.f2h__embed.f2h--responsive {
  max-width: 100%;
  margin: 0 auto;
}

.f2h__text {
  margin: 0;
  font-family: sans-serif;
  transform: translate(-50%, -50%);
  position: absolute;
  display: flex;
}
.f2h__text_inner {
  margin: 0;
  line-height: 0;
  width: 100%;
}

.f2h__text_container {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
}

.f2h__svg_container {
  overflow: hidden;
}

.f2h__frame,
.f2h__frame_text {
  display: none;
}

.f2h__svg_container path,
.f2h__svg_container rect,
.f2h__svg_container circle,
.f2h__svg_container line,
.f2h__svg_container polyline,
.f2h__svg_container polygon,
.f2h__svg_container path,
.f2h__svg_container ellipse {
  vector-effect: non-scaling-stroke;
  pointer-events: none;
}
.f2h__svg_container svg {
  height: auto;
}

.f2h__svg_container svg a,
.f2h__svg_container svg a * {
  pointer-events: all;
}

.f2h--responsive svg {
  position: absolute;
  top: 0;
  left: 0;
}

.f2h--responsive .f2h__wrap {
  position: relative;
  overflow: hidden;
}

.f2h--responsive .f2h__svg_container,
.f2h--responsive .f2h__wrap {
  width: 100%;
  height: auto;
}

.f2h_headline {
  font-family: "Austin News Deck", serif;
  font-weight: 600;
  font-size: 17px;
  color: #333;
  margin: 0 0 0 0;
  line-height: 22px;
}
.f2h_subbhead {
  font-family: "Austin News Deck", serif;
  font-style: italic;
  font-weight: 400;
  font-size: 17px;
  color: #333;
  margin: 4px 0 0 0;
  line-height: 22px;
}
.f2h_header {
  padding: 12px 0;
  border-top: 1px solid #b5b5b5;
}

footer {
  margin-top: 12px;
  border-top: 1px solid #b5b5b5;
}

.f2h_source {
  font-family: "Telesans Agate", sans-serif;
  font-weight: normal;
  font-size: 10px;
  color: #959595;
  margin: 4px 0;
  line-height: 12px;
  text-align: right;
}

.f2h_source a {
  color: #04777b;
}

/* Experiment stroking text */
.f2h__text--stroke span {
  position: relative;
}

.f2h__text--stroke span:before {
  content: attr(data-text);
  color: inherit;
  left: 0;
  font-size: 1em;
  z-index: -2;
  -webkit-text-stroke-width: 6px;
  user-select: none;
  color: transparent;
  display: block;
  position: fixed;
  width: 100%;
}
`;

const PRECISION = 4;

export function generateIframeHtml(body: string): string {
  return `
    <!doctype html>
    <html>
      <head>
        <base target="_parent">
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

  if (strokeWeight && strokeColour) {
    const rgbValues = Object.values(strokeColour);
    const rgbScaled = rgbValues.map((colour) => colour * 255);
    const rgbText = `rgb(${rgbScaled.join(",")})`;
    styleText += `-webkit-text-stroke-color:  ${rgbText};`;
  }

  // TODO: Add sensible logic for vertical alignment in responsive view

  // Position center aligned
  const leftPos = ((x + width / 2) / frameWidth) * 100;
  const left = `${leftPos.toPrecision(PRECISION)}%`;

  const topVal = ((y + height / 2) / frameHeight) * 100;
  const top = `${topVal.toPrecision(PRECISION)}%`;

  const bottomVal = frameHeight - y - height - height / 2;
  const bottom = `${bottomVal.toPrecision(4)}px`;

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
      verticalPosition = `bottom: ${bottom}`;
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

  const relWidth = ((width / frameWidth) * 100).toPrecision(PRECISION);
  const relHeight = ((height / frameHeight) * 100).toPrecision(PRECISION);

  return `
        ${styleText}
        width: ${positionFixed ? "auto" : `${relWidth}%`};
        height: ${positionFixed ? "auto" : `${relHeight}%`};
        left: ${positionFixed ? `${x}px` : left};
        ${verticalPosition};
        text-align: ${textAlignHorizontal.toLocaleLowerCase()};
        align-items: ${alignVertical};
        justify-content: ${alignHorizontal};
        position: ${positionFixed ? "fixed" : "absolute"};
        ${positionFixed ? "transform: none;" : ""}
      `;
}

function generateSpanStyles(text: TextRange): string {
  const { weight, colour, family, italic, letterSpacing, lineHeight, size } =
    text;

  let letterSpacingAlt = letterSpacing;

  let cssStyle = "";
  if (letterSpacingAlt) cssStyle += `letter-spacing: ${letterSpacingAlt};`;
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
      class={`f2h__text ${node.strokeWeight ? "f2h__text--stroke" : ""}`}
      style={generateParagraphStyle(node, width, height, positionFixed)}
    >
      <div class="f2h__text_inner">
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
      </div>
    </div>
  );
}

type FrameProps = {
  frames: FrameDataInterface[];
};
function TextContainer(props: FrameProps) {
  const { frames } = props;

  return (
    <div class="f2h__text_container">
      {frames.map((frame) => (
        <div key={frame.id} id={`textblock-${frame.id}`}>
          {frame.textNodes.map((node) => (
            <Text
              key={node.id}
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

const WrapIf: FunctionalComponent<{
  condition: boolean;
  Wrapper: FunctionalComponent;
  [id: string]: unknown;
}> = (props) => {
  const { condition, Wrapper, children, ...rest } = props;

  if (condition) return <Wrapper {...rest}>{children}</Wrapper>;
  if (children) return <Fragment>{children}</Fragment>;
  return null;
};

const LinkWrapper: FunctionalComponent = (props): JSX.Element => {
  const { children, ...rest } = props;

  return <a {...rest}>{children}</a>;
};

type renderInlineProps = {
  outputFrames: FrameDataInterface[];
  svgText: string;
  headline: string;
  subhead: string;
  source: string;
  sourceUrl: string;
  embedUrl: string;
  responsive: boolean;
  fileKey: string;
  googleFonts: boolean;
};
export function generateEmbedHtml(props: renderInlineProps): string {
  const {
    outputFrames,
    svgText,
    headline,
    subhead,
    source,
    sourceUrl,
    responsive,
    embedUrl,
    fileKey,
    googleFonts,
  } = props;

  const mediaQuery = generateMediaQueries(outputFrames);
  const fontStyles = generateFontStyles(outputFrames);
  const fontFaces = googleFonts ? buildFontFaceCss(fontStyles) : "";
  const css = fontFaces + embedCss + mediaQuery;

  console.log({ googleFonts, fontFaces });

  let html = render(
    <div className={`f2h__embed ${responsive ? "f2h--responsive" : ""}`}>
      <style dangerouslySetInnerHTML={{ __html: css }}></style>

      {(headline || subhead) && (
        <header className="f2h_header">
          {headline && <h1 className="f2h_headline">{headline}</h1>}
          {subhead && <p className="f2h_subbhead">{subhead}</p>}
        </header>
      )}

      <div className="f2h__wrap" style={`position: relative;`}>
        <WrapIf condition={!!embedUrl} Wrapper={LinkWrapper} href={embedUrl}>
          <div
            className="f2h__svg_container"
            dangerouslySetInnerHTML={{ __html: svgText }}
          />
          <TextContainer frames={outputFrames} />
        </WrapIf>
      </div>

      {source && (
        <footer>
          <p className="f2h_source">
            {sourceUrl ? <a href={sourceUrl}>{source}</a> : source}
          </p>
        </footer>
      )}
    </div>,
    null,
    { pretty: true }
  );

  // html = minimiseText(html);
  const nodeIdParam = encodeURIComponent(outputFrames[0].id);

  html = `<!--
  # [ Figma2HTML Export v${version} ]
  # 
  # File: https://www.figma.com/file/${fileKey}?node-id=${nodeIdParam}
  # Date: ${Date()}
  # Key: ${fileKey}
-->

${html}

`;

  return html;
}

/**
 * TODO: There's too much logic in  here. Breakout into separate functions
 */
function generateMediaQueries(frames: FrameDataInterface[]) {
  // Sort frames by ascending height. Small > big
  const sortedFrames = Object.values(frames)
    .map(({ width, height, backgroundColour, id }) => ({
      width,
      height,
      backgroundColour,
      id,
    }))
    .sort((a, b) => (a.width < b.width ? -1 : 1));

  const largestWidth = Math.max(...sortedFrames.map(({ width }) => width));

  let cssText = "";

  for (let i = 0; i < sortedFrames.length; i++) {
    const { id, width, height } = sortedFrames[i];

    // const relContainerWidth = ((width / height) * 100).toPrecision(PRECISION);
    const relSvgWidth = ((largestWidth / width) * 100).toPrecision(PRECISION);
    const paddingHeight = ((height / width) * 100).toPrecision(PRECISION);

    // Styles for the first (smallest) breakpoint
    if (i === 0) {
      // Wrapper widths
      cssText += `

        .f2h__embed {
          background-color: ${sortedFrames[i].backgroundColour};
        }
   
        .f2h__svg_container,
        .f2h__wrap {
            width: ${width}px;
            height: ${height}px;
          }`;

      cssText += `.f2h--responsive svg { width: ${relSvgWidth}%; } \n`;
      cssText += `[data-id="${id}"], [id="textblock-${id}"] { display: block; } \n`;
      cssText += `.f2h--responsive .f2h__wrap  { padding-top: ${paddingHeight}%; } \n`;
    } else {
      // Styles for the  remaining breakpoints
      const { id: prevId } = sortedFrames[i - 1];

      cssText += `[data-id="${id}"], [id="textblock-${id}"] { display: none; }`;

      /* Hide previous and show current frame */
      cssText += `
      
      @media (min-width: ${width}px) {

        .f2h__embed {
          background-color: ${sortedFrames[i].backgroundColour};
        }    

        .f2h__svg_container,
        .f2h__wrap {
            width: ${width}px;
            height: ${height}px;
        }
        .f2h--responsive svg {
          width: ${relSvgWidth}%;
        }
        .f2h--responsive .f2h__wrap  {
          padding-top: ${paddingHeight}%;
        }
        [data-id="${prevId}"], [id="textblock-${prevId}"] { display: none !important; }
        [data-id="${id}"], [id="textblock-${id}"] { display: block !important; }
      }
      `;
    }
  }

  return cssText;
}
