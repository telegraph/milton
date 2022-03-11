import { FontStyle, FrameDataInterface } from "types";

type FontStyles = Map<
  string,
  {
    upright: Set<number>;
    italic: Set<number>;
  }
>;

// Extract unique font styles from range styles nested deep in frame info
// frames[] -> textNodes[] -> rangeStyles[] -> { style }
export function generateFontStyles(frames: FrameDataInterface[]): FontStyles {
  const fonts = new Map();

  frames
    .flatMap(({ textNodes }) => textNodes)
    .flatMap(({ rangeStyles }) => rangeStyles)
    .forEach((style): void => {
      const { family, italic, weight } = style;

      if (!family) return;

      if (!fonts.has(family)) {
        fonts.set(family, {
          upright: new Set(),
          italic: new Set(),
        });
      }

      if (italic) {
        fonts.get(family).italic.add(weight);
      } else {
        fonts.get(family).upright.add(weight);
      }
    });

  return fonts;
}

export function generateGoogleFontCss(styles: FontStyles): string {
  // NOTE: Google enforces a strict API query param ordering
  // see https://developers.google.com/fonts/docs/css2#forming_api_urls

  const url = new URL("https://fonts.googleapis.com/css2");

  for (const [family, weights] of styles) {
    const { upright, italic } = weights;

    const fontName = family.replace(" ", "+");
    const allWeights = [...upright].sort().map((val) => `0,${val}`);
    if (italic.size > 0) {
      const italicWeights = [...italic].sort().map((val) => `1,${val}`);
      allWeights.push(...italicWeights);
    }

    const queryParam = `${fontName}:ital,wght@${allWeights.join(";")}`;

    url.searchParams.append("family", queryParam);
  }

  url.searchParams.append("display", "swap");

  const cssImport = `@import url('${decodeURIComponent(url.href)}');`;

  return cssImport;
}

// Generate the CSS for a given font family, weight and styles
export function buildFontFaceCss(styles: FontStyle[]): string {
  const googleFonts = generateGoogleFontCss(styles);

  return googleFonts;
}
