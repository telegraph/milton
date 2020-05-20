import { BREAKPOINTS, MSG_EVENTS } from './constants';

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
        .then(({ frameId, svgStr }) => {
          figma.ui.postMessage({
            type: MSG_EVENTS.RENDER,
            frameId,
            svgStr,
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

  // Get default frames names
  const allFrames = currentPage.findAll(
    (node) => node.type === 'FRAME'
  ) as FrameNode[];

  const breakpoints = Object.keys(BREAKPOINTS).map((name) =>
    name.toLowerCase()
  );
  const selectedFrames = allFrames
    .filter((frame) => breakpoints.includes(frame.name.toLowerCase()))
    .map((frame) => frame.id);

  if (allFrames.length > 0) {
    const framesData = allFrames.map((frame) => {
      const { name, width, height, id } = frame;
      const textNodes = getTextNodes(frame);

      return {
        name,
        width,
        height,
        id,
        textNodes,
      };
    });

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
figma.ui.resize(640, 640);

async function renderFrame(frameId: string) {
  const frame = figma.getNodeById(frameId);
  if (!frame || frame.type !== 'FRAME') {
    throw new Error('Missing frame');
  }

  const svgStr = await getFrameSvgAsString(frame);

  return { frameId, svgStr };
}

function getTextNodes(frame: FrameNode) {
  return frame
    .findAll(({ type }) => type === 'TEXT')
    .map((node) => {
      if (node.type !== 'TEXT') {
        return;
      }

      const {
        x,
        y,
        width,
        height,
        fontSize,
        fontName,
        fills,
        characters,
      } = node;

      return { x, y, width, height, fontSize, fontName, fills, characters };
    });
}
