export type board = {
  id: string;
  width: number;
  buffer: Uint8Array;
};

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

// Extract frames from current page
const { currentPage } = figma;
const artBoards = currentPage.findChildren((node) => {
  const { type, name } = node;
  return type === 'FRAME' && ['mobile', 'tablet', 'desktop'].includes(name);
});

// Close if no valid frames are found
if (artBoards.length === 0) {
  console.warn('Missing frames with names xxx');
  figma.closePlugin();
}

// Register postMessage handler
function handleReceivedMsg(msg: MessageEvent) {
  console.log(msg);
}
figma.ui.on('message', handleReceivedMsg);

// Render UI for postMessage communication with DOM
figma.showUI(__html__);

(async () => {
  try {
    // Collect all boards
    const boards = await Promise.all(artBoards.map(getBoardAsSvg));

    // Send boards to UI DOM for render and download
    figma.ui.postMessage({
      type: 'EXPORT',
      data: boards,
    });
  } catch (err) {
    console.error('Figma2HTML failed :(', err);
    figma.closePlugin();
  }
})();
