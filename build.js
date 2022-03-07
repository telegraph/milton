// @ts-check
import esbuild from "esbuild";
import fs from "fs-extra";
import path from "path";

const isProduction = process.env.NODE_ENV === "production";
const BUILD_FOLDER = "build";

const buildTitle = `Build: ${new Date().toLocaleString()}`;
console.time(buildTitle);

/**
 * Build backend JS
 *
 * @returns {Promise<void>} Writes backend JS file to folder
 */
async function buildBackend() {
  const entryPoint = [path.join("src", "backend", "backend.ts")];
  const outFile = path.join(BUILD_FOLDER, "figma2html.js");

  const backendBuildResult = await esbuild.build({
    entryPoints: entryPoint,
    outfile: outFile,
    format: "iife",
    target: "es2017",
    platform: "browser",
    loader: { [".css"]: "text" },
    define: {
      "process.env.NODE_ENV": `${
        isProduction ? '"production"' : '"development"'
      }`,
      "process.browser": "true",
    },

    bundle: true,
    sourcemap: isProduction ? false : "inline",
    minify: isProduction ? true : false,
  });

  if (backendBuildResult.errors.length > 0) {
    console.error(backendBuildResult.errors);
    throw new Error("Backend build error");
  }
}

/**
 * Build the frontend code
 *
 * @returns {Promise<string[]>} Array containing [JS, CSS]
 */
async function buildUI() {
  // Build UI JS
  const uiBuildResult = await esbuild.build({
    entryPoints: [path.join("src", "frontend", "ui.tsx")],
    format: "iife",
    target: "es2017",
    platform: "browser",
    define: {
      "process.env.NODE_ENV": `${
        isProduction ? '"production"' : '"development"'
      }`,
      "process.browser": "true",
    },
    loader: { ".css": "css", ".svg": "dataurl" },
    jsxFactory: "preact.h",
    jsxFragment: "preact.Fragment",
    bundle: true,
    sourcemap: isProduction ? false : "inline",
    minify: isProduction ? true : false,
    treeShaking: true,
    write: false,
    outfile: "ui.js",
  });

  if (uiBuildResult.errors.length > 0) {
    console.error(uiBuildResult.errors);
    throw new Error("Backend build error");
  }

  return uiBuildResult.outputFiles.map((file) => file.text);
}

(async () => {
  try {
    // Create and/or empty build folder
    await fs.emptyDir(BUILD_FOLDER);

    const manifestPath = path.join(BUILD_FOLDER, "manifest.json");
    // Copy over Figma plug-in manifest
    await fs.copyFile("manifest.json", manifestPath);

    // Build backend JS
    await buildBackend();
    const [frontendJS, frontendCSS] = await buildUI();

    // Combine JS and CSS into a single HTML block

    const uiHtml = `
      <div id="app"></div>
      <script>${frontendJS}</script>
      <style>${frontendCSS}</style>
    `;

    // Save HTML
    await fs.writeFile(path.join(BUILD_FOLDER, "ui.html"), uiHtml);
  } catch (err) {
    // Handle build failure
    console.error("Build failed with error:", err);

    process.exit(1);
  }
})();
