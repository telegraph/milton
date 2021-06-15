import { ITextStyle, textData, TextRange } from "types";

export function getNodeText(
  rootNode: PageNode,
  nodeName: string
): string | undefined {
  const foundNode = rootNode.findChild((node) => node.name === nodeName);
  return foundNode && foundNode.type === "TEXT"
    ? foundNode.characters
    : undefined;
}

function getRangeStyles(textNode: TextNode): TextRange[] {
  // Get text styles for each character
  const allStyles = [];
  let previousStyle: ITextStyle | undefined;

  for (let i = 0; i < textNode.characters.length; i++) {
    // Font family, weight and style
    const fontName = textNode.getRangeFontName(i, i + 1);
    const family = fontName === figma.mixed ? null : fontName.family;
    const figmaStyle = fontName === figma.mixed ? null : fontName.style;
    const italic = figmaStyle ? /italic/i.test(figmaStyle) : false;

    // Font weight
    let weight = 400;
    if (figmaStyle) {
      if (/^bold$/i.test(figmaStyle)) weight = 700;
      if (/^semi-?\s?bold$/i.test(figmaStyle)) weight = 600;
      if (/^medium$/i.test(figmaStyle)) weight = 500;
    }

    // Font size
    const figmaSize = textNode.getRangeFontSize(i, i + 1);
    const size = figmaSize !== figma.mixed ? figmaSize : null;

    // Colour
    const fill = textNode.getRangeFills(i, i + 1);
    const paint = fill !== figma.mixed && fill[0].type === "SOLID" && fill[0];
    const rgb = paint ? paint.color : { r: 0, g: 0, b: 0 };
    const rgb255 = Object.values(rgb).flatMap((c) => Math.round(c * 255));
    const colour = `rgb(${rgb255.join(",")})`;

    // Line height
    const lh = textNode.getRangeLineHeight(i, i + 1);
    const lhUnit = lh !== figma.mixed && lh.unit;
    const lhCssUnit = lhUnit === "PERCENT" ? "em" : "px";
    let lhVal = lh !== figma.mixed && lh.unit !== "AUTO" && lh.value;
    if (lhVal && lhUnit === "PERCENT") lhVal = lhVal / 100;
    const lineHeight = lhVal ? `${lhVal}${lhCssUnit}` : "1";

    // Letter spacing
    const lp = textNode.getRangeLetterSpacing(i, i + 1);
    const lpUnit = lp !== figma.mixed && lp.unit;
    const lpCssUnit = lpUnit === "PERCENT" ? "em" : "px";
    let lpVal = lp !== figma.mixed && lp.value;
    // Convert percentage into character scale
    if (lpVal && lpUnit === "PERCENT") lpVal = lpVal / 100;
    const letterSpacing = lpVal ? `${lpVal}${lpCssUnit}` : null;

    const style: ITextStyle = {
      family,
      weight,
      colour,
      lineHeight,
      letterSpacing,
      size,
      italic,
    };

    const char = textNode.characters[i];

    // Check if current style is the same as the previous and either
    // append text character or start a new style
    const same = JSON.stringify(previousStyle) === JSON.stringify(style);
    if (same) {
      allStyles[allStyles.length - 1].text += char;
    } else {
      previousStyle = style;
      allStyles.push({ ...style, text: char });
    }
  }

  return allStyles;
}

export function getTextNodesFromFrame(frame: FrameNode): textData[] {
  const textNodes = frame.findAll(
    (node) => node.type === "TEXT" && node.characters.length > 0
  ) as TextNode[];
  const { absoluteTransform } = frame;
  const rootX = absoluteTransform[0][2];
  const rootY = absoluteTransform[1][2];

  const textCollection: textData[] = [];
  for (const textNode of textNodes) {
    const {
      absoluteTransform,
      width,
      height,
      textAlignHorizontal,
      textAlignVertical,
      constraints,
      strokes,
      strokeWeight,
      id,
      name,
    } = textNode;

    let strokeColour: RGB | undefined;
    for (const stroke of strokes) {
      if (stroke.type === "SOLID") {
        strokeColour = stroke.color;
        break;
      }
    }

    // NOTE: Figma node x, y are relative to first parent, we want them
    // relative to the root frame
    const textX = absoluteTransform[0][2];
    const textY = absoluteTransform[1][2];
    const x = textX - rootX;
    const y = textY - rootY;

    textCollection.push({
      x,
      y,
      width,
      height,
      textAlignHorizontal,
      textAlignVertical,
      constraints,
      rangeStyles: getRangeStyles(textNode),
      id,
      name,
      strokeColour,
      strokeWeight,
    });
  }

  return textCollection;
}
