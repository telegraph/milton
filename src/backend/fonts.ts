import { FontStyle, FrameDataInterface } from "types";

// Extract unique font styles from range styles nested deep in frame info
// frames[] -> textNodes[] -> rangeStyles[] -> { style }
export function generateFontStyles(frames: FrameDataInterface[]): FontStyle[] {
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

  return fontStyles;
}

type FontsType = {
  [id: string]: {
    normal: { [weight: number]: string };
    italic?: { [weight: number]: string };
  };
};

const fonts: FontsType = {
  "Austin News Deck": {
    normal: {
      400: "Austin News Deck Web-Roman",
      500: "Austin News Deck Web-Medium",
      600: "Austin News Deck Web-Semibold",
      700: "Austin News Deck Web-Bold",
      900: "Austin News Deck Web-Fat",
    },
    italic: {
      400: "Austin News Deck Web-Italic",
      500: "Austin News Deck Web-Medium Italic",
      600: "Austin News Deck Web-Semibold Italic",
      900: "Austin News Deck Web-Fat",
    },
  },

  "Austin News Headline Cond": {
    normal: {
      300: "AustinNewsHeadlineCond-Light-Web",
      400: "AustinNewsHeadlineCond-Roman-Web",
      500: "AustinNewsHeadlineCond-Medium-Web",
      600: "AustinNewsHeadlineCond-Semibold-Web",
    },
    italic: {
      300: "AustinNewsHeadlineCond-LightItalic-Web",
      400: "AustinNewsHeadlineCond-Italic-Web",
      500: "AustinNewsHeadlineCond-MediumItalic-Web",
    },
  },

  "Austin News Text": {
    normal: {
      400: "Austin News Text Web-Roman",
      500: "Austin News Text-medium",
      600: "Austin News Text Web-Semibold",
    },
  },

  "Telesans Agate": {
    normal: {
      400: "Telesans Agate-Regular",
      500: "TelesansAgate-Medium",
      600: "TelesansAgate-Medium", // NOTE: Re-using 500
      700: "Telesans Agate-Bold",
    },
  },

  "Telesans Text": {
    normal: {
      400: "Telesans Text Web-Regular",
      500: "Telesans Text Web-Regular", // NOTE: Re-using 400
      600: "Telesans Text Web-Regular", // NOTE: Re-using 400
      700: "Telesans Text Web-Bold",
    },
  },
};

// Generate the CSS for a given font family, weight and styles
export function buildFontFaceCss(styles: FontStyle[]): string {
  const URL_ROOT = "https://cf.eip.telegraph.co.uk/assets/_fonts/";
  let fontFaces = "";

  for (const item of styles) {
    const { family, italic, weight } = item;

    // Skip any fonts with missing family names
    if (!family) continue;

    const style = italic ? "italic" : "normal";
    const file = fonts?.[family]?.[style]?.[weight];

    if (file) {
      const woff = `${URL_ROOT}${file}.woff`;
      const woff2 = `${URL_ROOT}${file}.woff2`;

      fontFaces += `@font-face {
        font-family: "${family}";
        src: url("${woff2}") format("woff2"),
             url("${woff}") format("woff");
        font-weight: ${weight};
      } `;
    } else {
      console.warn(`F2H: Missing family ${JSON.stringify(item)}`);
    }
  }

  return fontFaces;
}

interface MissingFontInfo {
  family: string;
  text: string;
  frame: string;
  layerName: string;
}
export function findMissingFonts(
  frames: FrameDataInterface[]
): MissingFontInfo[] {
  const missingFonts: MissingFontInfo[] = [];

  for (const frame of frames) {
    for (const textNode of frame.textNodes) {
      for (const rangeStyle of textNode.rangeStyles) {
        if (!rangeStyle.family) {
          missingFonts.push({
            family: "Unknown",
            frame: frame.name.substr(0, 10),
            layerName: textNode.name.substr(0, 10),
            text: rangeStyle.text.substr(0, 10),
          });
          continue;
        }

        if (!fonts[rangeStyle.family]) {
          missingFonts.push({
            family: rangeStyle.family,
            frame: frame.name.substr(0, 10),
            layerName: textNode.name.substr(0, 10),
            text: rangeStyle.text.substr(0, 10),
          });
          continue;
        }
      }
    }
  }

  return missingFonts;
}
