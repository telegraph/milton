import { h, Component, createRef, RefObject } from "preact";
import render from "preact-render-to-string";
import type { textData } from ".";
import type { FrameDataType } from "./ui";
import { OUTPUT_FORMATS } from "./constants";

import simplify from "simplify-js";
import { toPath, toPoints } from "svg-points";
import { node, frameShape, updateNode } from "wilderness-dom-node";

// Import CSS file as plain text via esbuild loader option
// @ts-expect-error
import embedCss from "./embed.css";
// @ts-expect-error
import fontsCss from "./fonts.css";

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

  let fontName = `${fontFamily} ${fontStyle}`;

  // Font family
  // Austin News Deck
  // Austin News Text
  // Telesans Text
  // Austin News Deck
  // Telesans Agate

  // "Austin News Deck Semibold"
  // "Austin News Deck Medium"
  // "Austin News Text Roman"
  // "Telesans Text Regular"
  // "Telesans Agate"

  // Regular, Medium, Roman, Semibold

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
        font-weight: normal;
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
    <p class="f2h__text" style={styleText}>
      {characters}
    </p>
  );
}

interface FrameContainerProps extends FrameDataType {
  scale?: number | false;
}
interface FrameContainerState {
  optimize: boolean;
}
export class FrameContainer extends Component<
  FrameContainerProps,
  FrameContainerState
> {
  state: FrameContainerState = {
    optimize: false,
  };

  private svgContainedEl: RefObject<HTMLDivElement> = createRef();

  componentDidUpdate = () => {
    if (this.state.optimize) {
      this.simplify();
    }
  };

  toggleSimplify = () => {
    this.setState({ optimize: !this.state.optimize });
  };

  simplify = () => {
    console.log("simplifying");
    const { current: el } = this.svgContainedEl;

    if (!el) {
      return console.error("Missing SVG DOM wrapper");
    }

    const svg = el.querySelector("svg");
    if (!svg) {
      return console.error("Missing SVG DOM element");
    }

    const SIMPLIFY_AMOUNT = 1;
    const paths = Array.from(el.querySelectorAll("svg path"));

    // Split paths into collections based on move to, then add them back after each simplify
    paths.forEach((path) => {
      const shape = frameShape(path);
      const splitPoints = [];
      for (const point of shape.points) {
        point.moveTo
          ? splitPoints.push([point])
          : splitPoints[splitPoints.length - 1].push(point);
      }

      shape.points = splitPoints.flatMap((points: any[]) => [
        points[0],
        ...simplify(points.splice(1), SIMPLIFY_AMOUNT),
      ]);

      updateNode(path, shape);
    });

    const fileKbSize = Math.ceil(svg.outerHTML.length / 1000);
    console.log(fileKbSize);
  };

  render() {
    const { optimize } = this.state;

    const {
      uid,
      width,
      height,
      textNodes,
      svg = "",
      responsive,
      scale,
    } = this.props;
    const textEls = textNodes.map((node) => (
      <Text node={node} width={width} height={height} />
    ));
    const classNames = `f2h__render ${
      responsive ? "f2h__render--responsive" : ""
    }`;

    let style = responsive ? "" : `width: ${width}px;`;
    style = scale ? `${style} transform: scale(${scale});` : style;

    return (
      <div class={classNames} style={style} id={uid}>
        <input
          type="checkbox"
          checked={optimize}
          onChange={this.toggleSimplify}
          style="margin: 10px; display: block; position: absolute; z-index: 22;"
        />
        <div
          ref={this.svgContainedEl}
          class="f2h__svg_container"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div class="f2h__text_container">{textEls}</div>
      </div>
    );
  }
}

interface renderInlineProps {
  frames: FrameDataType[];
  iframe: OUTPUT_FORMATS;
  headline?: string | undefined;
  subhead?: string | undefined;
  source?: string | undefined;
}
export function renderInline(props: renderInlineProps) {
  const { frames, iframe, headline, subhead, source } = props;
  const mediaQuery = genreateMediaQueries(frames);

  const renderedFrames = frames.map((frame) => <FrameContainer {...frame} />);

  let html = render(
    <div class="f2h__embed">
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
        <header class="f2h_header">
          {headline && <h1 class="f2h_headline">{headline}</h1>}
          {subhead && <p class="f2h_subbhead">subhead</p>}
        </header>
      )}

      {renderedFrames}

      {source && (
        <footer>
          <p class="f2h_source">{source}</p>
        </footer>
      )}
    </div>
  );

  if (iframe === OUTPUT_FORMATS.IFRAME) {
    html = generateIframeHtml(html);
  }

  return html;
  // return html.replace(/\n|\r|\s{2,}/g, "");
}

function genreateMediaQueries(frames: FrameDataType[]) {
  const idWidths = frames
    .map(({ width, uid }) => [width, uid])
    .sort(([a], [b]) => (a < b ? -1 : 1));

  const mediaQueries = idWidths.map(([width, uid], i) => {
    if (i === 0) {
      return "";
    }

    const [, prevId] = idWidths[i - 1];

    // Note: Cascade order is important.
    return `
      @media (max-width: ${width}px) {
        #${uid} { display: none; }
      }
      @media (min-width: ${width}px) {
        #${prevId} { display: none; }
        #${uid} { display: block; }
      }
    `;
  });

  return mediaQueries.join("");
}
