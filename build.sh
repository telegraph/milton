#!/bin/bash

# Recreate build folder
rm -rf build
mkdir build

# Compile main code to JS int build folder
npx esbuild src/index.tsx --bundle --format=iife --target=es2019 \
  --sourcemap=inline '--define:process.env.NODE_ENV="development"' \
  --jsx-factory=preact.h --jsx-fragment=preact.Fragment \
  --outfile=build/figma2html.js

# Copy plug-in assets to build folder
cp -f src/manifest.json build/manifest.json
cp -f src/ui.html build/ui.html

# Compile UI Typescript to JS and store in variable
ui_js=`npx esbuild src/ui.tsx --bundle --format=iife --target=es2019 \
  --sourcemap=inline '--define:process.env.NODE_ENV="development"'\
  --jsx-factory=h`

# Inline UI JS & CSS into UI HTML
css="$(cat src/ui.css)"
echo "<script>$ui_js</script>\n<style>$css</style>" >> build/ui.html
