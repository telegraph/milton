# Figma to HTML embed plug-in

Figma plug-in that helps generate HTML embeds.

## Features

- Takes frames from current page and generates embedded SVGs
- Shows preview of output at different breakpoints
- Show help when starting for first time or when no frames are present
- Warning about missing breakpoints
- Warn about unsupported content
- Choice of output format in-line or iframe
- Saves output as a HTML file for easy output (or ZIP)?
- Choose frames when more than three are present
- Choose frames when names don't match (mobile/tablet/desktop)

## Tasks

- [BUG] Responsive preview text alignment issues (clipping mask)
- [BUG] Incorrect percentage based line-height
- [Task] Sensible font loading
- [Task] Font family shouldn't use style in name
- [Improvement] Optional headline, sub and source text
- [Improvement] In situ preview mode
- [BUG] Wide responsive preview breaks text layout
- [BUG] Handle frames with the same width (make user choose?)
- [UI] Save UI - Push user to best default
- [UI] Add help message when no frames are used
- [QA] Create test case Figma designs
- [QA] Test embedding in particle CMS
- [QA] Check for CSS
- [Improvement] Remove text nodes from SVG?
- [Improvement] File size warning. Information about large shapes?
- [Improvement] Optimise images and SVG
- [Improvement] Add drag scroll to preview
- [Improvement] ZIP download
- [Improvement] Tidy-up code

## Development

For detailed information on Figma plugin development and the API checkout the
[official Figma plugin docs](https://www.figma.com/plugin-docs/intro/). Local
development uses node, typescript and [watchexec](https://github.com/watchexec/watchexec).

To get started run the following:

```bash
npm install
npm run dev
```

Load the `manifest.json` file located in the `build` folder into Figma to crate
a new plugin. Once you've created a new plugin you can use the development console
within Figma to test and debug the plugin. Saving changes will cause `watchexec`
to automatically rebuild allowing you to reload the plugin in Figma.

## UI

![UI drawing](docs/ui-design_v2.svg)

https://excalidraw.com/#json=5549791576588288,QsqzU1x7rBDCzR_gIZUZRA

## Notes

What is wanted from this tool

- Long form write-up for Nicola
- How we put graphics (charts) into long-form
- Fraiser uses AI2HTML script (no need to alter-workflow) - It auto populates head-footer & source - Remove these - Print designers use this

## Changelog

### 0.1.52

- Improve quality of PNG resizing

### 0.1.51

- Remove image compression for simple PNG conversion to all for alpha transparency

### 0.1.5

- Compress images and simplify SVG shapes

### 0.1.4

- Scaling preview support

### 0.1.3

- Batch select frames and responsive setting
- Background tint
- Copy inline-embed to clipboard
- Select all frames by default
- Hide advanced output settings by default
- Frame ordering
- Nested frames (auto-layout) text position
- Mask not working with mulitple frames

### 0.1.2

- Improvement: Added initial responsive frame support

### 0.1.1

- Improvement: Add file size information and warning

### 0.1.0

- Improvement: New logo
- Improvement: Support window resizing
- Improvement: Auto-size window based on fames
- Fix: Only select top level frames on page

## References

[Responsive sticky text SVGs](https://bl.ocks.org/veltman/5cd1ba0b3c623e7b5146
[Grid widths](https://docs.google.com/spreadsheets/d/1AxeiLKKsQn7pq6wFKcKsSbAgR44K8CA1cLyBYre64IY/edit?ts=5ebd2636#gid=0)

Examples:

- https://interactive.guim.co.uk/uploader/embed/2020/01/iraq-airstrikes/giv-39029u79KgLyXZcG/
- https://interactive.guim.co.uk/uploader/embed/2020/01/reaper-dronespecs/giv-3902RxT87H1Zvcyy/
- https://interactive.guim.co.uk/uploader/embed/2020/01/baghdad_general-zip/giv-3902n6MjnGXSLzAt/
- https://interactive.guim.co.uk/uploader/embed/2020/01/middle_east-zip/giv-3902Ow9fZ1NM5sM7/

## Examples

Telegraph AI2HTML Covid graphs

- https://cf-particle-html.eip.telegraph.co.uk/b6b65be9-f851-4a02-acf6-a07756bdaed0.html
- https://cf-particle-html.eip.telegraph.co.uk/7146379a-a29b-4d05-8a7f-c5070c8c63dc.html
- https://cf-particle-html.eip.telegraph.co.uk/9bbfbfb6-452f-4626-951a-5d9712df2139.html
- https://cf-particle-html.eip.telegraph.co.uk/e21e19d7-f4db-490a-b901-6f7b62b41a79.html?ref=https://www.telegraph.co.uk/news/2020/05/14/second-deadly-wave-coronavirus-hit-europe-winter/&title=Exclusive:%20Second%20more%20deadly%20wave%20of%20coronavirus%20%27to%20hit%20Europe%20this%20winter%27
