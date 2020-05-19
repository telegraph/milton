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
    1() {
      // src/constants.ts
      var STAGES;
      (function(STAGES2) {
        STAGES2[STAGES2["CHOOSE_FRAMES"] = 0] = "CHOOSE_FRAMES";
        STAGES2[STAGES2["PREVIEW_OUTPUT"] = 1] = "PREVIEW_OUTPUT";
        STAGES2[STAGES2["SAVE_OUTPUT"] = 2] = "SAVE_OUTPUT";
      })(STAGES || (STAGES = {}));
      var MSG_EVENTS;
      (function(MSG_EVENTS2) {
        MSG_EVENTS2[MSG_EVENTS2["DOM_READY"] = 0] = "DOM_READY";
        MSG_EVENTS2[MSG_EVENTS2["NO_FRAMES"] = 1] = "NO_FRAMES";
        MSG_EVENTS2[MSG_EVENTS2["FOUND_FRAMES"] = 2] = "FOUND_FRAMES";
        MSG_EVENTS2[MSG_EVENTS2["RESIZE"] = 3] = "RESIZE";
        MSG_EVENTS2[MSG_EVENTS2["RENDER"] = 4] = "RENDER";
        MSG_EVENTS2[MSG_EVENTS2["CLOSE"] = 5] = "CLOSE";
        MSG_EVENTS2[MSG_EVENTS2["ERROR"] = 6] = "ERROR";
      })(MSG_EVENTS || (MSG_EVENTS = {}));
      var BREAKPOINTS;
      (function(BREAKPOINTS2) {
        BREAKPOINTS2[BREAKPOINTS2["Mobile"] = 340] = "Mobile";
        BREAKPOINTS2[BREAKPOINTS2["Tablet"] = 520] = "Tablet";
        BREAKPOINTS2[BREAKPOINTS2["Desktop"] = 1024] = "Desktop";
      })(BREAKPOINTS || (BREAKPOINTS = {}));
      const UI_TEXT = {
        ERROR_UNEXPECTED: "Unexpected error",
        ERROR_MISSING_FRAMES: "No frames found. Please add some frames to the page.",
        WARN_NO_TARGETS: "Standard frames not found. Please select target frames.",
        WARN_TOO_MANY_TARGETS: "Please select three target frames",
        INFO_PREVIEW: "Preview each frame output",
        TITLE_CHOOSE_FRAME: "Choose which frames to export",
        TITLE_PREVIEW: "Preview",
        TILE_OUTPUT: "Export",
        BUTTON_NEXT: "Next",
        BUTTON_DOWNLOAD: "Download",
        BUTTON_PREVIOUS: "Back"
      };

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
      const handleReceivedMsg = (msg) => {
        const {type, data} = msg;
        switch (type) {
          case MSG_EVENTS.ERROR:
            console.log("plugin msg: error");
            break;
          case MSG_EVENTS.CLOSE:
            console.log("plugin msg: close");
            figma.closePlugin();
            break;
          case MSG_EVENTS.DOM_READY:
            console.log("plugin msg: DOM READY");
            main();
            break;
          case MSG_EVENTS.RENDER:
            console.log("plugin msg: render");
            break;
          case MSG_EVENTS.RESIZE:
            console.log("plugin msg: resize");
            figma.ui.resize(data, 400);
            break;
          default:
            console.error("Unknown post message", msg);
        }
      };
      figma.ui.on("message", (e) => handleReceivedMsg(e));
      const main = () => {
        const {currentPage} = figma;
        console.log(MSG_EVENTS);
        const allFrames = currentPage.findAll((node) => node.type === "FRAME");
        const breakpoints = Object.keys(BREAKPOINTS).map((name) => name.toLowerCase());
        const selectedFrames = allFrames.filter((frame) => breakpoints.includes(frame.name.toLowerCase())).map((frame) => frame.id);
        if (allFrames.length > 0) {
          const framesData = allFrames.map(({name, width, id}) => ({
            name,
            width,
            id
          }));
          figma.ui.postMessage({
            type: MSG_EVENTS.FOUND_FRAMES,
            frames: framesData,
            selectedFrames
          });
          return;
        }
        if (allFrames.length < 1) {
          console.warn("No frames");
          figma.ui.postMessage({
            type: MSG_EVENTS.NO_FRAMES
          });
          return;
        }
      };
      figma.showUI(__html__);
      figma.ui.resize(640, 500);
    }
  };
  return __require(1);
})();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL2luZGV4LnRzeCJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc29sZS5sb2coJ0hlbGxvIFdvcmxkJyk7XG5jb25zb2xlLmxvZyhfX2h0bWxfXyk7XG5cbi8vIGZpZ21hLnNob3dVSShfX2h0bWxfXyk7XG5jb25zb2xlLmxvZyhkb2N1bWVudCk7XG5cbmZpZ21hLnVpLm9uKCdtZXNzYWdlJywgKG1zZykgPT4ge1xuICBjb25zb2xlLmxvZyhtc2cpO1xufSk7XG5cbi8vIGZpZ21hLmNsb3NlUGx1Z2luKCk7XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxjQUFRLElBQUk7QUFDWixjQUFRLElBQUk7QUFHWixjQUFRLElBQUk7QUFFWixZQUFNLEdBQUcsR0FBRyxXQUFXLENBQUM7QUFDdEIsZ0JBQVEsSUFBSTs7IiwKICAibmFtZXMiOiBbXQp9Cg==
