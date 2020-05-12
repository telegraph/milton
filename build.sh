#!/bin/bash

# Remove old temp folder
rm -rf temp
mkdir temp

# Compile main code to JS int build folder
npx esbuild src/index.tsx --bundle --format=iife --target=es2019 '--define:process.env.NODE_ENV="development"' --jsx-factory=preact.h --jsx-fragment=preact.Fragment --outfile=build/figma2html.js

# Copy plug-in assets to build folder
cp src/manifest.json build/manifest.json
cat src/ui.html > build/ui.html

# Compile UI Typescript to JS in temp folder
npx esbuild src/ui.tsx --bundle --format=iife --target=es2019 '--define:process.env.NODE_ENV="development"' --jsx-factory=h --outfile=temp/ui.js

# Inline UI JS into UI HTML
echo '<script>' >> build/ui.html
cat temp/ui.js >> build/ui.html
echo '</script>' >> build/ui.html

