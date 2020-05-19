#!/bin/bash

# Remove old temp folder
rm -rf temp
mkdir temp

# Compile main code to JS int build folder
npx esbuild src/index.tsx --bundle --format=iife --target=es2019 '--define:process.env.NODE_ENV="development"' --jsx-factory=preact.h --jsx-fragment=preact.Fragment --outfile=build/figma2html.js

# Inline sourcemap
# NOTE: Looks like Figma strips comments out of the main JS file
index_map=$(base64 < build/figma2html.js.map)
index_sourcemap="//# sourceMappingURL=data:application/json;charset=utf-8;base64,${index_map}"
echo "$index_sourcemap" >> build/figma2html.js

# Copy plug-in assets to build folder
cp src/manifest.json build/manifest.json
cat src/ui.html > build/ui.html

# Compile UI Typescript to JS in temp folder
npx esbuild src/ui.tsx --bundle --format=iife --target=es2019 --sourcemap '--define:process.env.NODE_ENV="development"' --jsx-factory=h --outfile=temp/ui.js

# Inline sourcemap
js="$(cat temp/ui.js)"
map=$(base64 < temp/ui.js.map)
sourcemap="//# sourceMappingURL=data:application/json;charset=utf-8;base64,${map}"
inlined_js="$(echo "${js/\/\/# sourceMappingURL=ui.js.map/$sourcemap}")"

# Inline UI JS into UI HTML
echo '<script>' >> build/ui.html
echo "$inlined_js" >> build/ui.html
echo '</script>' >> build/ui.html

# Inline UI CSS into UI HTML
css="$(cat src/ui.css)"
echo '<style>' >> build/ui.html
echo "$css" >> build/ui.html
echo '</style>' >> build/ui.html


