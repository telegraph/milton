import fs from "fs-extra";
import os from "os";
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
    await esbuild.build({
      entryPoints: [path.join("src", "backend", "backend.ts")],
      outfile: path.join(BUILD_FOLDER, "figma2html.js"),
      format: "iife",
      target: "es2017",
      loader: { [".css"]: "text" },
      define: { "process.env.NODE_ENV": "development" },
      bundle: true,
      minify: true,
    });

    // Build UI JS
    const tmpDir = os.tmpdir();
    const tempFolder = await fs.mkdtemp(`${tmpDir}${path.sep}`);

    await esbuild.build({
      entryPoints: [path.join("src", "UI", "ui.tsx")],
      outdir: tempFolder,
      format: "iife",
      target: "es2017",
      define: { "process.env.NODE_ENV": "development" },
      loader: { [".css"]: "css" },
      jsxFactory: "preact.h",
      jsxFragment: "preact.Fragment",
      bundle: true,
      minify: true,
    });

    // Create Figma UI HTML
    const uiJs = await fs.readFile(path.join(tempFolder, "ui.js"));
    const uiCss = await fs.readFile(path.join(tempFolder, "ui.css"));

    // Combine JS and CSS into a single HTML block
    const uiHtml = `
      <div id="app"></div>
      <script>${uiJs}</script>
      <style>${uiCss}</style>
    `;

    // Save HTML
    await fs.writeFile(path.join(BUILD_FOLDER, "ui.html"), uiHtml);

    // Clean-up
    await fs.remove(tempFolder);

    console.timeEnd(buildTitle);
  } catch (err) {
    // Handle build failure
    console.error("Build failed with error:", err);
    process.exit(1);
  }
})();
