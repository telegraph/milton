import { BREAKPOINTS, MSG_EVENTS } from './constants';
import type { board } from './constants';

const embedCss = `
  @import url('https://cf.eip.telegraph.co.uk/assets/_css/fontsv02.css'); 
  
  .f2h__text {
    margin: 0;
    font-family: sans-serif;
    transform: translate(-50%, -50%);
  }

  .f2h__render {
    position: relative;
  }

  .f2h__render svg text {
    display: none;
  }

  .f2h__render--responsive {
    width: 100%;
  }

  .f2h__render--responsive svg {
    width: 100%;
    height: auto;
  }
`;

async function getFrameSvgAsString(frame: SceneNode): Promise<string> {
  const svgBuff = await frame.exportAsync({
    format: 'SVG',
    svgOutlineText: false,
    svgSimplifyStroke: true,
  });

  return String.fromCharCode.apply(null, Array.from(svgBuff));
}

const handleReceivedMsg = (msg: MSG_EVENTS) => {
  const { type, data, frameId } = msg;

  switch (type) {
    case MSG_EVENTS.ERROR:
      console.log('plugin msg: error');
      break;

    case MSG_EVENTS.CLOSE:
      console.log('plugin msg: close');
      figma.closePlugin();
      break;

    case MSG_EVENTS.DOM_READY:
      console.log('plugin msg: DOM READY');
      main();
      break;

    case MSG_EVENTS.RENDER:
      console.log('plugin msg: render', frameId);
      renderFrame(frameId)
        .then((render) => {
          figma.ui.postMessage({
            type: MSG_EVENTS.RENDER,
            rawRender: render,
            renderId: frameId,
          });
        })
        .catch((err) => {
          figma.ui.postMessage({
            type: MSG_EVENTS.ERROR,
            errorText: `Render failed: ${err ?? err.message}`,
          });
        });
      break;

    case MSG_EVENTS.RESIZE:
      console.log('plugin msg: resize');
      figma.ui.resize(data, 400);
      break;

    default:
      console.error('Unknown post message', msg);
  }
};

figma.ui.on('message', (e) => handleReceivedMsg(e));

const main = () => {
  const { currentPage } = figma;

  console.log(MSG_EVENTS);

  // Get default frames names
  const allFrames = currentPage.findAll((node) => node.type === 'FRAME');
  const breakpoints = Object.keys(BREAKPOINTS).map((name) =>
    name.toLowerCase()
  );
  const selectedFrames = allFrames
    .filter((frame) => breakpoints.includes(frame.name.toLowerCase()))
    .map((frame) => frame.id);

  if (allFrames.length > 0) {
    const framesData = allFrames.map(({ name, width, id }) => ({
      name,
      width,
      id,
    }));

    figma.ui.postMessage({
      type: MSG_EVENTS.FOUND_FRAMES,
      frames: framesData,
      selectedFrames,
    });

    return;
  }

  if (allFrames.length < 1) {
    console.warn('No frames');
    figma.ui.postMessage({ type: MSG_EVENTS.NO_FRAMES });
    return;
  }
};

// Render the DOM
figma.showUI(__html__);
figma.ui.resize(640, 500);

async function renderFrame(frameId: string) {
  const frame = figma.getNodeById(frameId);
  if (!frame || frame.type !== 'FRAME') {
    throw new Error('Missing frame');
  }

  const textNodes = frame.findAll((node) => {
    const { type, name } = node;
    console.log(type);
    return type === 'TEXT';
  });

  const frameWidth = frame?.width || 1;
  const frameHeight = frame?.height || 1;

  console.log(frameWidth, frameHeight);

  const textStrings = textNodes.map((tNode) => {
    if (tNode.type !== 'TEXT') {
      return;
    }

    const {
      characters,
      x,
      y,
      constraints,
      width,
      height,
      fontSize,
      fontName,
      fills,
    } = tNode;

    const decoration = tNode.getRangeTextDecoration(0, characters.length);
    const style = tNode.getRangeTextStyleId(0, characters.length);

    const position = {
      left: `${((x + width / 2) / frameWidth) * 100}%`,
      top: `${((y + height / 2) / frameHeight) * 100}%`,
    };

    const [fill] = fills;
    const { r = 0, g = 0, b = 0 } = fill?.color || {};
    const { opacity = 1 } = fill;
    console.log(r, g, b, fill?.color);
    const colour = `rgba(${Math.round(r * 255)}, ${Math.round(
      g * 255
    )}, ${Math.round(b * 255)}, ${opacity})`;

    const fontFamily = fontName?.family || 'sans-serif';

    const css = Object.entries(position)
      .map(([prop, val]) => {
        return `${prop}: ${val}`;
      })
      .join('; ');

    const styleText = `
          font-size: ${String(fontSize)};
          font-family: ${fontFamily};
          position: absolute;
          color: ${colour};
          width: ${width};
          ${css}
        `;

    return `<p class="f2h__text" style="${styleText}">${characters}</p>`;
  });

  const textContainer = `
    <div class="f2h__text_container">
      ${textStrings.join('\n')}
    </div>
  `;

  const svg = await getFrameSvgAsString(frame);

  return `
    <div class="f2h__render" style="width: ${frameWidth}px;">
      ${svg}
      ${textContainer}
      <style>
        ${embedCss}
      </style>
    </div>
  `;
}

// (async () => {
//   try {
//     // Collect all boards
//     const boards = await Promise.all(artBoards.map(getBoardAsSvg));

//     // Send boards to UI DOM for render and download
//     figma.ui.postMessage({
//       type: 'EXPORT',
//       data: boards,
//       textNodes: textStuff,
//     });

// const frame = artBoards[0];

// const textNodes = frame.findAll((node) => {
//   const { type, name } = node;
//   console.log(type);
//   return type === 'TEXT';
// });

// const frameWidth = frame?.width || 1;
// const frameHeight = frame?.height || 1;

// console.log(frameWidth, frameHeight);

// const textStuff = textNodes.map((tNode) => {
//   if (tNode.type !== 'TEXT') {
//     return;
//   }

//   const {
//     characters,
//     x,
//     y,
//     constraints,
//     width,
//     height,
//     fontSize,
//     fontName,
//     fills,
//   } = tNode;

//   const decoration = tNode.getRangeTextDecoration(0, characters.length);
//   const style = tNode.getRangeTextStyleId(0, characters.length);

//   const position = {
//     left: `${((x + width / 2) / frameWidth) * 100}%`,
//     top: `${((y + height / 2) / frameHeight) * 100}%`,
//   };

//   const [fill] = fills;
//   const { r = 0, g = 0, b = 0 } = fill?.color || {};
//   const { opacity = 1 } = fill;
//   console.log(r, g, b, fill?.color);
//   const colour = `rgba(${Math.round(r * 255)}, ${Math.round(
//     g * 255
//   )}, ${Math.round(b * 255)}, ${opacity})`;

//   return {
//     text: characters,
//     constraints,
//     position,
//     fontSize,
//     decoration,
//     style,
//     fontName,
//     fills,
//     colour,
//     width: `${(width / frameWidth) * 100}%`,
//   };
// });

// // Register postMessage handler
// function handleReceivedMsg(msg: MessageEvent) {
//   console.log(msg);
// }
// figma.ui.on('message', handleReceivedMsg);

// // Render UI for postMessage communication with DOM
// figma.showUI(__html__);

// (async () => {
//   try {
//     // Collect all boards
//     const boards = await Promise.all(artBoards.map(getBoardAsSvg));

//     // Send boards to UI DOM for render and download
//     figma.ui.postMessage({
//       type: 'EXPORT',
//       data: boards,
//       textNodes: textStuff,
//     });
//   } catch (err) {
//     console.error('Figma2HTML failed :(', err);
//     figma.closePlugin();
//   }
// })();
