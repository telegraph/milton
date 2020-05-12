(() => {
  let __hasOwnProperty = Object.hasOwnProperty;
  let __modules = {};
  let __commonjs;
  let __require = (id) => {
    let module = __modules[id];
    if (!module) {
      module = __modules[id] = {
        exports: {}
      };
      __commonjs[id](module.exports, module);
    }
    return module.exports;
  };
  let __toModule = (module) => {
    if (module && module.__esModule) {
      return module;
    }
    let result = {};
    for (let key in module) {
      if (__hasOwnProperty.call(module, key)) {
        result[key] = module[key];
      }
    }
    result.default = module;
    return result;
  };
  let __import = (id) => {
    return __toModule(__require(id));
  };
  __commonjs = {
    0() {
      // src/index.tsx
      async function getBoardAsSvg(frame) {
        const svgBuff = await frame.exportAsync({
          format: "SVG",
          svgOutlineText: false,
          svgSimplifyStroke: true
        });
        return {
          id: frame.name.replace(/\W/g, "_"),
          width: frame.width,
          buffer: svgBuff
        };
      }
      const {currentPage} = figma;
      const artBoards = currentPage.findChildren((node) => {
        const {type, name} = node;
        return type === "FRAME" && ["mobile", "tablet", "desktop"].includes(name);
      });
      if (artBoards.length === 0) {
        console.warn("Missing frames with names xxx");
        figma.closePlugin();
      }
      function handleReceivedMsg(msg) {
        console.log(msg);
      }
      figma.ui.on("message", handleReceivedMsg);
      figma.showUI(__html__);
      (async () => {
        try {
          const boards = await Promise.all(artBoards.map(getBoardAsSvg));
          figma.ui.postMessage({
            type: "EXPORT",
            data: boards
          });
        } catch (err) {
          console.error("Figma2HTML failed :(", err);
          figma.closePlugin();
        }
      })();
    }
  };
  return __require(0);
})();
