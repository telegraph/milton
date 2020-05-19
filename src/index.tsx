import { BREAKPOINTS, MSG_EVENTS } from './constants';
import type { board } from './constants';

async function getBoardAsSvg(frame: SceneNode): Promise<board> {
  const svgBuff = await frame.exportAsync({
    format: 'SVG',
    svgOutlineText: false,
    svgSimplifyStroke: true,
  });

  return {
    id: frame.name.replace(/\W/g, '_'),
    width: frame.width,
    buffer: svgBuff,
  };
}

const handleReceivedMsg = (msg: MSG_EVENTS) => {
  const { type, data } = msg;

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
      console.log('plugin msg: render');
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

// figma.ui.resize(500, 500);
