#!/bin/bash

# Recreate build folder
rm -rf build
mkdir build

# Compile main code to JS int build folder
npx esbuild src/index.tsx --bundle --format=iife --target=es2017 \
  --sourcemap=inline '--define:process.env.NODE_ENV="development"' \
  --loader:.css=text \
  --jsx-factory=preact.h --jsx-fragment=preact.Fragment \
  --outfile=build/figma2html.js

# Copy plug-in assets to build folder
cp -f src/manifest.json build/manifest.json
cp -f src/ui.html build/ui.html

# Compile UI Typescript to JS and store in variable
ui_js=`npx esbuild src/ui.tsx --bundle --format=iife --target=es2017 \
  --loader:.css=text \
  --sourcemap=inline '--define:process.env.NODE_ENV="development"'\
  --jsx-factory=h`

# Inline UI JS into UI HTML
echo "<script>$ui_js</script>" >> build/ui.html
