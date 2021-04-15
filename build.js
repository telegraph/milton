import fs from "fs-extra";
import path from "path";
import esbuild from "esbuild";

(async () => {
  try {
    const buildTitle = `Build: ${new Date().toLocaleString()}`;
    console.time(buildTitle);
    const BUILD_FOLDER = "build";
    // Create and/or empty build folder
    await fs.emptyDir(BUILD_FOLDER);

    // Copy over Figma plug-in manifest
    await fs.copyFile(
      "manifest.json",
      path.join(BUILD_FOLDER, "manifest.json")
    );

    // Build backend JS
    const backendJs = esbuild.build({
      entryPoints: [path.join("src", "backend", "backend.ts")],
      outfile: path.join(BUILD_FOLDER, "figma2html.js"),
      format: "iife",
      target: "es2017",
      platform: "browser",
      loader: { [".css"]: "text" },
      define: {
        "process.env.NODE_ENV": '"development"',
        "process.browser": "true",
      },
      bundle: true,
      sourcemap: "inline",
      minify: false,
    });

    // Build UI JS
    const uiJs = esbuild.build({
      entryPoints: [path.join("src", "frontend", "ui.tsx")],
      format: "iife",
      target: "es2017",
      platform: "browser",
      define: {
        "process.env.NODE_ENV": '"development"',
        "process.browser": "true",
      },
      loader: { ".css": "text" },
      jsxFactory: "preact.h",
      jsxFragment: "preact.Fragment",
      bundle: true,
      sourcemap: "inline",
      minify: false,
      treeShaking: true,
      write: false,
    });

    const uiCss = esbuild.build({
      entryPoints: [path.join("src", "static", "css", "ui.css")],
      platform: "browser",
      loader: { ".svg": "dataurl" },
      bundle: true,
      minify: false,
      write: false,
    });

    const uiFiles = await Promise.all([uiJs, uiCss, backendJs]).then(
      (results) => {
        return {
          js: results[0].outputFiles[0].text,
          css: results[1].outputFiles[0].text,
        };
      }
    );

    // Combine JS and CSS into a single HTML block
    const uiHtml = `
      <div id="app"></div>
      <style>${uiFiles.css}</style>
      <script>${uiFiles.js}</script>
    `;

    // Save HTML
    await fs.writeFile(path.join(BUILD_FOLDER, "ui.html"), uiHtml);

    console.timeEnd(buildTitle);
  } catch (err) {
    // Handle build failure
    // console.error("Build failed with error:", err);

    process.exit(1);
  }
})();
