import { textData, ITextProp, ITextStyle } from "types";

export function getNodeText(
  rootNode: PageNode,
  nodeName: string
): string | undefined {
  const foundNode = rootNode.findChild((node) => node.name === nodeName);
  return foundNode && foundNode.type === "TEXT"
    ? foundNode.characters
    : undefined;
}

// function calculateLetterSpacing(
//   fontFamily: string,
//   letterSpacing: LetterSpacing
// ) {
//   const { unit: letterUnit, value: letterVal } = letterSpacing;
//   let letterSpaceValue = "0";

//   switch (letterUnit) {
//     case "PIXELS":
//       // TODO: FIX ME
//       if (fontFamily === "Telesans Text") {
//         letterSpaceValue = `${letterVal - 0.33}px`;
//       } else if (fontFamily === "Telesans Agate") {
//         letterSpaceValue = `${letterVal - 0.19}px`;
//       } else {
//         letterSpaceValue = `${letterVal}px`;
//       }
//       break;
//     case "PERCENT":
//       letterSpaceValue = `${letterVal / 100}em`;

//       if (fontFamily === "Telesans Text") {
//         letterSpaceValue = `${letterVal / 100 - 0.022}em`;
//       } else if (fontFamily === "Telesans Agate") {
//         letterSpaceValue = `${letterVal / 100 - 0.015}em`;
//       } else {
//         letterSpaceValue = `${letterVal / 100}em`;
//       }
//       break;
//     default:
//       if (fontFamily === "Telesans Text") {
//         letterSpaceValue = "-0.37px";
//       } else if (fontFamily === "Telesans Agate") {
//         letterSpaceValue = "-0.19px";
//       } else {
//         letterSpaceValue = `0`;
//       }
//       break;
//   }

//   return letterSpaceValue;
// }

enum RANGE_TYPES {
  LETTER_SPACING,
  LINE_HEIGHT,
  FONT_SIZE,
  COLOUR,
  FONT,
}

function getRangeVal(
  textNode: TextNode,
  rangeType: RANGE_TYPES,
  start: number,
  end: number
) {
  switch (rangeType) {
    case RANGE_TYPES.LETTER_SPACING: {
      const letterSpace = textNode.getRangeLetterSpacing(start, end);
      if (letterSpace === figma.mixed) {
        return letterSpace;
      } else {
        return letterSpace.unit === "PERCENT"
          ? `${letterSpace.value / 100}rem`
          : `${letterSpace.value}px`;
      }
    }

    case RANGE_TYPES.LINE_HEIGHT: {
      const lineHeight = textNode.getRangeLineHeight(start, end);
      if (lineHeight === figma.mixed) {
        return lineHeight;
      } else if (lineHeight.unit === "AUTO") {
        return "normal";
      } else {
        return lineHeight.unit === "PERCENT"
          ? `${lineHeight.value / 100}rem`
          : `${lineHeight.value}px`;
      }
    }

    case RANGE_TYPES.FONT_SIZE:
      return textNode.getRangeFontSize(start, end);

    case RANGE_TYPES.COLOUR: {
      const paint = textNode.getRangeFills(start, end);
      if (paint === figma.mixed) {
        return paint;
      } else if (paint[0].type === "SOLID") {
        return { ...paint[0].color };
      } else {
        return { r: 0, g: 0, b: 0 } as RGB;
      }
    }

    case RANGE_TYPES.FONT:
      return textNode.getRangeFontName(start, end);

    default:
      return undefined;
  }
}

function getTypeValues(
  textNode: TextNode,
  rangeType: RANGE_TYPES
): ITextProp[] {
  const { characters } = textNode;

  // If there's no mixed style then short circuit response
  const fullRangeValue = getRangeVal(textNode, rangeType, 0, characters.length);
  if (fullRangeValue !== figma.mixed) {
    return [{ start: 0, end: characters.length, value: fullRangeValue }];
  }

  // There's mixed styles. Go through each char to extract style ranges
  // Bootstrap range values with first character which is never mixed type
  const values: ITextProp[] = [
    { start: 0, end: 1, value: getRangeVal(textNode, rangeType, 0, 1) },
  ];

  // Loop through each character to find ranges.
  // When a mixed range is found update the current end position and
  // create a new range with the next style
  for (let i = 1; i <= characters.length; i++) {
    const prop = values[values.length - 1];

    // Update end position of current style
    prop.end = i;

    const currentValue = getRangeVal(textNode, rangeType, prop.start, i);

    if (currentValue === figma.mixed) {
      // Set end of the current range
      prop.end = i - 1;

      // Create and store next range style
      values.push({
        start: i,
        end: i + 1,
        value: getRangeVal(textNode, rangeType, i - 1, i),
      });
    }
  }

  return values;
}

function findItemInRange(
  items: ITextProp[],
  start: number,
  end: number
): ITextProp | undefined {
  return items.find((item) => start >= item.start && end <= item.end);
}

function getTextRangeValues(textNode: TextNode): ITextStyle[] {
  const { characters } = textNode;

  const ranges = {
    letterSpace: getTypeValues(textNode, RANGE_TYPES.LETTER_SPACING),
    lineHeight: getTypeValues(textNode, RANGE_TYPES.LINE_HEIGHT),
    size: getTypeValues(textNode, RANGE_TYPES.FONT_SIZE),
    colour: getTypeValues(textNode, RANGE_TYPES.COLOUR),
    font: getTypeValues(textNode, RANGE_TYPES.FONT),
  };

  // Collect all end indexed, sort accending and remove duplicates
  const ends = Object.values(ranges)
    .flatMap((range) => range.map((item) => item.end))
    .sort((a, b) => (a > b ? 1 : -1))
    .filter((n, i, self) => self.indexOf(n) === i);

  // TODO: Simplify end index logic
  const styles = [];
  let iStart = 0;
  for (let iEnd of ends) {
    if (iStart === iEnd) {
      iEnd++;
    }

    const style: ITextStyle = {
      start: iStart,
      end: iEnd,
      chars: characters.substring(iStart, iEnd),
      font: findItemInRange(ranges.font, iStart + 1, iEnd)?.value,
      colour: findItemInRange(ranges.colour, iStart + 1, iEnd)?.value,
      size: findItemInRange(ranges.size, iStart + 1, iEnd)?.value,
      letterSpace: findItemInRange(ranges.letterSpace, iStart + 1, iEnd)?.value,
      lineHeight: findItemInRange(ranges.lineHeight, iStart + 1, iEnd)?.value,
    };

    styles.push(style);
    iStart = iEnd;
  }

  return styles;
}

export function getTextNodesFromFrame(frame: FrameNode): textData[] {
  const textNodes = frame.findAll(({ type }) => type === "TEXT") as TextNode[];
  const { absoluteTransform } = frame;
  const rootX = absoluteTransform[0][2];
  const rootY = absoluteTransform[1][2];

  const textCollection: textData[] = [];
  for (const textNode of textNodes) {
    const {
      absoluteTransform,
      width,
      height,
      characters,
      textAlignHorizontal,
      textAlignVertical,
      constraints,
      strokes,
      strokeWeight,
    } = textNode;

    console.log(strokes, strokeWeight);

    let strokeDetails = {};

    const strokeColour = strokes.find(
      (paint) => paint.type === "SOLID"
    ) as SolidPaint;

    if (strokeColour) {
      strokeDetails = {
        strokeWeight: strokeWeight,
        strokeColour: `rgb(${Object.values(strokeColour.color)
          .map((val) => val * 255)
          .join(",")})`,
      };
    }

    // NOTE: Figma node x, y are relative to first parent, we want them
    // relative to the root frame
    const textX = absoluteTransform[0][2];
    const textY = absoluteTransform[1][2];
    const x = textX - rootX;
    const y = textY - rootY;

    // Get font sizes ranges
    const rangeStyles = getTextRangeValues(textNode);
    textCollection.push({
      x,
      y,
      width,
      height,
      characters,
      textAlignHorizontal,
      textAlignVertical,
      constraints,
      rangeStyles,
      ...strokeDetails,
    });
  }

  return textCollection;
}
