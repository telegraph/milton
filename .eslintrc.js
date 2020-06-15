module.exports = {
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",

    ecmaFeatures: {
      jsx: true,
    },
  },
  env: {
    browser: true,
    node: true,
  },
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
  ],

  settings: {
    react: {
      version: "detect",
      pragma: "h",
    },
  },
};
