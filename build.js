// @ts-check
import esbuild from "esbuild";
import fs from "fs-extra";
import path from "path";

const isProduction = process.env.NODE_ENV === "production";
const BUILD_FOLDER = "build";

/** @type {esbuild.BuildOptions} */
const commonBuildOptions = {
  format: "iife",
  target: "es2017",
  platform: "browser",
  bundle: true,
  sourcemap: isProduction ? false : "inline",
  minify: isProduction ? true : false,
  loader: { ".css": "css", ".svg": "dataurl" },
};

/**
 * Build backend JS
 *
 * @returns {void} Writes backend JS file to folder
 */
function buildBackend() {
  const entryPoint = [path.join("src", "backend", "backend.ts")];
  const outFile = path.join(BUILD_FOLDER, "figma2html.js");

  esbuild.build({
    ...commonBuildOptions,
    entryPoints: entryPoint,
    outfile: outFile,
    watch: isProduction
      ? false
      : {
          onRebuild: () => console.log("Rebuild Backend"),
        },
  });
}

/**
 * Build UI HTML from esbuild result
 *
 * @param {esbuild.BuildResult} result
 * @returns {void}
 */
function writeUIFile(result) {
  // Combine JS and CSS into a single HTML block
  const [frontendJS, frontendCSS] = result.outputFiles;

  const uiHtml = `
    <div id="app"></div>
    <script>${frontendJS.text}</script>
    <style>${frontendCSS.text}</style>
  `;

  // Save HTML
  fs.writeFileSync(path.join(BUILD_FOLDER, "ui.html"), uiHtml);
}

/**
 * Build the frontend code
 *
 * @returns {void} Array containing [JS, CSS]
 */
function buildUI() {
  const uiEntryPoints = [path.join("src", "frontend", "ui.tsx")];

  // Build UI JS
  // Note: Outfile is called "ui.js" and included references to CSS files.
  // Therefore, two files named "ui.js" and "ui.css" will be build and
  // included in the returned result object.

  esbuild
    .build({
      ...commonBuildOptions,
      entryPoints: uiEntryPoints,
      write: false,
      outfile: "ui.js",
      watch: isProduction
        ? false
        : {
            onRebuild(error, result) {
              if (error) console.error("Build watch failed", error);
              else {
                console.log("Rebuilt UI");
                writeUIFile(result);
              }
            },
          },
    })
    .then(writeUIFile);
}

try {
  // Create and/or empty build folder
  fs.emptyDirSync(BUILD_FOLDER);

  // Copy over Figma plug-in manifest
  const manifestPath = path.join(BUILD_FOLDER, "manifest.json");
  fs.copyFileSync("manifest.json", manifestPath);

  // Run esbuild
  buildBackend();
  buildUI();
} catch (err) {
  console.error("Build failed with error:", err);
  process.exit(1);
}
