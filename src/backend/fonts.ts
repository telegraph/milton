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
      500: "Telesans Agate-Medium",
      700: "Telesans Agate-Bold",
    },
  },

  "Telesans Text": {
    normal: {
      400: "Telesans Text Web-Regular",
      700: "Telesans Text Web-Bold",
    },
  },
};

function getFontCss(
  styles: { name: string; weight?: number; style?: "normal" | "italic" }[]
): string {
  const URL_ROOT = "https://cf.eip.telegraph.co.uk/assets/_fonts/";
  let fontCss = "";

  for (const item of styles) {
    const { name, style = "normal", weight = 400 } = item;

    const file = fonts[name][style]?.[weight];
    if (file) {
      const woff = `${URL_ROOT}${file}.woff`;
      const woff2 = `${URL_ROOT}${file}.woff2`;

      fontCss += `@font-face {
        font-family: "${name}";
        src: url("${woff2}") format("woff2"),
        src: url("${woff}") format("woff");
        font-weight: ${weight};
      }`;
    }
  }

  return fontCss;
}
