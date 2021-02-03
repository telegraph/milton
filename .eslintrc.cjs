module.exports = {
  root: true,
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ["./tsconfig.json"],
  },
  globals: {
    expect: true,
    browser: true,
    global: true,
    figma: true,
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier",
    "prettier/@typescript-eslint",
  ],
  settings: {
    react: {
      pragma: "h",
      version: "16.0",
    },
  },
  rules: {
    "react/no-unknown-property": [2, { ignore: ["class"] }],
  },

  // Fix eslint-plugin-react typescript props bug
  // https://github.com/yannickcr/eslint-plugin-react/issues/2353
  overrides: [
    {
      files: ["**/*.tsx"],
      rules: {
        "react/prop-types": "off",
      },
    },
  ],
};
