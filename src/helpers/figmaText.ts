import { textData } from "types";

export function getNodeText(
  rootNode: PageNode,
  nodeName: string
): string | undefined {
  const foundNode = rootNode.findChild((node) => node.name === nodeName);
  return foundNode && foundNode.type === "TEXT"
    ? foundNode.characters
    : undefined;
}

function calculateLetterSpacing(
  fontFamily: string,
  letterSpacing: LetterSpacing
) {
  const { unit: letterUnit, value: letterVal } = letterSpacing;
  let letterSpaceValue = "0";
  console.log(letterUnit, letterSpacing, fontFamily);
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
        letterSpaceValue = "-0.19px";
      } else {
        letterSpaceValue = `0`;
      }
      break;
  }

  return letterSpaceValue;
}

export function getTextNodes(frame: FrameNode): textData[] {
  const textNodes = frame.findAll(({ type }) => type === "TEXT") as TextNode[];
  const { absoluteTransform } = frame;
  const rootX = absoluteTransform[0][2];
  const rootY = absoluteTransform[1][2];

  return textNodes.map(
    (node): textData => {
      const {
        absoluteTransform,
        width,
        height,
        fontSize: fontSizeData,
        fontName,
        fills,
        characters,
        lineHeight,
        letterSpacing,
        textAlignHorizontal,
        textAlignVertical,
      } = node;

      // NOTE: Figma node x, y are relative to first parent, we want them
      // relative to the root frame
      const textX = absoluteTransform[0][2];
      const textY = absoluteTransform[1][2];
      const x = textX - rootX;
      const y = textY - rootY;

      // Extract basic fill colour
      let colour = { r: 0, g: 0, b: 0, a: 1 };

      interface ITextPropRange {
        start: number;
        end: number;
        value: number;
      }

      function getTextRangeValues(textNode: TextNode) {
        const { characters } = node;

        console.log(JSON.stringify(characters));
        console.log(characters.length);

        // Letter spacing
        const letterSpacing: ITextPropRange[] = [];
        let startRange = 0;
        let props: ITextPropRange = { start: 0, end: 0, value: 0 };

        for (let i = 1; i < characters.length; i++) {
          const sizeValue = textNode.getRangeLetterSpacing(startRange, i);

          if (i === characters.length - 1) {
            props.end = characters.length;
            letterSpacing.push({ ...props });
            break;
          }

          if (sizeValue === figma.mixed) {
            props.end = i - 1;
            letterSpacing.push({ ...props });
            startRange = i;
          } else {
            props = {
              start: startRange,
              end: i,
              value: sizeValue,
            };
          }
        }

        console.log("letter spacing", letterSpacing);

        // Line heights
        const lineHeights = [];
        startRange = 0;
        props = { start: 0, end: 0, value: 16 };

        for (let i = 1; i < characters.length; i++) {
          const sizeValue = textNode.getRangeLineHeight(startRange, i);

          if (i === characters.length - 1) {
            props.end = characters.length;
            lineHeights.push({ ...props });
            break;
          }

          if (sizeValue === figma.mixed) {
            props.end = i - 1;
            lineHeights.push({ ...props });
            startRange = i;
          } else {
            let value = undefined;
            if (sizeValue.unit !== "AUTO") {
              value =
                sizeValue.unit === "PIXELS"
                  ? `${sizeValue.value}px`
                  : `${sizeValue.value / 100}rem`;
            }

            props = { start: startRange, end: i, value };
          }
        }

        console.log(lineHeights);

        // Font sizes
        const fontSizes: ITextPropRange[] = [];
        startRange = 0;
        props = { start: 0, end: 0, value: 16 };

        for (let i = 1; i < characters.length; i++) {
          const sizeValue = textNode.getRangeFontSize(startRange, i);

          if (i === characters.length - 1) {
            props.end = characters.length;
            fontSizes.push({ ...props });
            break;
          }

          if (sizeValue === figma.mixed) {
            props.end = i - 1;
            fontSizes.push({ ...props });
            startRange = i;
          } else {
            props = { start: startRange, end: i, value: sizeValue };
          }
        }

        console.log(fontSizes);

        const paints: any[] = [];
        startRange = 0;
        props = { start: 0, end: 0, value: 16 };

        for (let i = 1; i < characters.length; i++) {
          const paintValue = textNode.getRangeFills(startRange, i);

          if (i === characters.length - 1) {
            props.end = characters.length;
            paints.push({ ...props });
            break;
          }

          if (paintValue === figma.mixed) {
            props.end = i - 1;
            paints.push({ ...props });
            startRange = i;
          } else {
            let colour = { r: 0, g: 0, b: 0 };
            if (paintValue[0].type === "SOLID") {
              colour = { ...paintValue[0].color };
            }

            props = {
              start: startRange,
              end: i - 1,
              value: colour,
            };
          }
        }

        console.log(paints);

        const fonts: any[] = [];
        startRange = 0;
        props = { start: 0, end: 0, value: 16 };

        for (let i = 1; i < characters.length; i++) {
          const fontValue = textNode.getRangeFontName(startRange, i);

          if (i === characters.length - 1) {
            props.end = characters.length;
            fonts.push({ ...props });
            console.log("ENDING FONTS", i, props);
            break;
          }

          if (fontValue === figma.mixed) {
            props.end = i - 1;
            fonts.push({ ...props });
            startRange = i;
          } else {
            props = { start: startRange, end: i, value: fontValue };
          }
        }

        console.log(fonts);

        // Collect all end indexed, sort accending and remove duplicates
        const ends = [
          ...fonts.map((f) => f.end),
          ...paints.map((f) => f.end),
          ...fontSizes.map((f) => f.end),
          ...letterSpacing.map((f) => f.end),
          ...lineHeights.map((f) => f.end),
        ]
          .sort((a, b) => (a > b ? 1 : -1))
          .filter((n, i, self) => self.indexOf(n) === i);

        console.log("ends", ends);
        const styles = [];
        let startIndex = 0;
        for (let end of ends) {
          if (startIndex === end) {
            end++;
          }

          console.log(
            `Start: ${startIndex}, End: ${end}, chars: ${JSON.stringify(
              characters.substring(startIndex, end)
            )}`
          );
          const colour = paints.find(
            (f) => startIndex + 1 >= f.start && end <= f.end
          );

          const font = fonts.find(
            (f) => startIndex + 1 >= f.start && end <= f.end
          );

          const fontSize = fontSizes.find(
            (f) => startIndex + 1 >= f.start && end <= f.end
          );

          const letterSpace = letterSpacing.find(
            (f) => startIndex + 1 >= f.start && end <= f.end
          );

          const lineHeight = lineHeights.find(
            (f) => startIndex + 1 >= f.start && end <= f.end
          );

          if (!fontSize) {
            console.log(
              "Missing font size",
              startIndex,
              end,
              JSON.stringify(characters.substring(startIndex, end))
            );
          }

          if (!font) {
            console.log(
              "missing font",
              startIndex,
              end,
              font,
              JSON.stringify(characters.substring(startIndex, end))
            );
          }

          const style = {
            start: startIndex,
            end: end,
            chars: characters.substring(startIndex, end),
            font: font.value,
            colour: colour.value,
            size: fontSize?.value,
            letterSpace: calculateLetterSpacing(
              font.value.family,
              letterSpace?.value
            ),
            lineHeight: lineHeight?.value,
          };

          styles.push(style);
          startIndex = end;
        }

        return styles;
      }

      // Get font sizes ranges
      const styles = getTextRangeValues(node);

      console.log(styles);

      // Extract font info
      // TODO: Confirm fallback fonts
      // const fontSize = fontSizeData !== figma.mixed ? fontSizeData : 16;
      const fontFamily = fontName !== figma.mixed ? fontName.family : "Arial";
      const fontStyle = fontName !== figma.mixed ? fontName.style : "Regular";

      return {
        x,
        y,
        width,
        height,
        fontSize: 12,
        fontFamily,
        fontStyle,
        colour: { r: 0, g: 0, b: 0 },
        characters,
        lineHeight: "AUTO",
        letterSpacing: "auto",
        textAlignHorizontal,
        textAlignVertical,
        styles,
      };
    }
  );
}
