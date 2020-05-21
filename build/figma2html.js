(() => {
  let __assign = Object.assign;
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
      var OUTPUT_FORMATS;
      (function(OUTPUT_FORMATS2) {
        OUTPUT_FORMATS2[OUTPUT_FORMATS2["INLINE"] = 0] = "INLINE";
        OUTPUT_FORMATS2[OUTPUT_FORMATS2["IFRAME"] = 1] = "IFRAME";
      })(OUTPUT_FORMATS || (OUTPUT_FORMATS = {}));
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
      const INITIAL_UI_SIZE = {
        width: 480,
        height: 600
      };

      // src/index.tsx
      function genRandomUid() {
        const rnd = Math.random();
        const uid = rnd.toString().substr(2);
        return `f2h-${uid}`;
      }
      async function getFrameSvgAsString(frame) {
        const svgBuff = await frame.exportAsync({
          format: "SVG",
          svgOutlineText: false,
          svgSimplifyStroke: true
        });
        return String.fromCharCode.apply(null, Array.from(svgBuff));
      }
      const handleReceivedMsg = (msg) => {
        const {type, width, height, frameId} = msg;
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
            console.log("plugin msg: render", frameId);
            renderFrame(frameId).then((svgStr) => {
              figma.ui.postMessage({
                type: MSG_EVENTS.RENDER,
                frameId,
                svgStr
              });
            }).catch((err) => {
              figma.ui.postMessage({
                type: MSG_EVENTS.ERROR,
                errorText: `Render failed: ${err != null ? err : err.message}`
              });
            });
            break;
          case MSG_EVENTS.RESIZE:
            console.log("plugin msg: resize");
            figma.ui.resize(width, height);
            break;
          default:
            console.error("Unknown post message", msg);
        }
      };
      figma.ui.on("message", (e) => handleReceivedMsg(e));
      const main = () => {
        const {currentPage} = figma;
        const allFrames = currentPage.children.filter((node) => node.type === "FRAME");
        const breakpoints = Object.keys(BREAKPOINTS).map((name) => name.toLowerCase());
        const selectedFrames = allFrames.filter((frame) => breakpoints.includes(frame.name.toLowerCase())).map((frame) => frame.id);
        if (allFrames.length > 0) {
          const framesData = allFrames.map((frame) => {
            const {name, width, height, id} = frame;
            const textNodes = getTextNodes(frame);
            const uid = genRandomUid();
            return {
              name,
              width,
              height,
              id,
              textNodes,
              uid
            };
          });
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
      figma.ui.resize(INITIAL_UI_SIZE.width, INITIAL_UI_SIZE.height);
      async function renderFrame(frameId) {
        const frame = figma.getNodeById(frameId);
        if (!frame || frame.type !== "FRAME") {
          throw new Error("Missing frame");
        }
        const svgStr = await getFrameSvgAsString(frame);
        return svgStr;
      }
      function getTextNodes(frame) {
        const textNodes = frame.findAll(({type}) => type === "TEXT");
        return textNodes.map((node) => {
          const {x, y, width, height, fontSize: fontSizeData, fontName, fills, characters} = node;
          const [fill] = fills;
          let colour = {
            r: 0,
            g: 0,
            b: 0,
            a: 1
          };
          if (fill.type === "SOLID") {
            colour = __assign(__assign({}, colour), {
              a: fill.opacity || 1
            });
          }
          let fontSize = 16;
          if (fontSizeData !== figma.mixed) {
            fontSize = fontSizeData;
          }
          let fontFamily = "Arial";
          if (fontName !== figma.mixed) {
            fontFamily = fontName.family;
          }
          return {
            x,
            y,
            width,
            height,
            fontSize,
            fontFamily,
            colour,
            characters
          };
        });
      }
    }
  };
  return __require(1);
})();
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL2NvbnN0YW50cy50cyIsICJzcmMvaW5kZXgudHN4Il0sCiAgInNvdXJjZXNDb250ZW50IjogWyJleHBvcnQgdHlwZSBib2FyZCA9IHtcbiAgaWQ6IHN0cmluZztcbiAgd2lkdGg6IG51bWJlcjtcbiAgYnVmZmVyOiBVaW50OEFycmF5O1xufTtcblxuZXhwb3J0IGVudW0gU1RBR0VTIHtcbiAgQ0hPT1NFX0ZSQU1FUyxcbiAgUFJFVklFV19PVVRQVVQsXG4gIFNBVkVfT1VUUFVULFxufVxuXG5leHBvcnQgZW51bSBNU0dfRVZFTlRTIHtcbiAgRE9NX1JFQURZLFxuICBOT19GUkFNRVMsXG4gIEZPVU5EX0ZSQU1FUyxcbiAgUkVTSVpFLFxuICBSRU5ERVIsXG4gIENMT1NFLFxuICBFUlJPUixcbn1cblxuZXhwb3J0IGVudW0gQlJFQUtQT0lOVFMge1xuICBNb2JpbGUgPSAzNDAsXG4gIFRhYmxldCA9IDUyMCxcbiAgRGVza3RvcCA9IDEwMjQsXG59XG5cbmV4cG9ydCBlbnVtIE9VVFBVVF9GT1JNQVRTIHtcbiAgSU5MSU5FLFxuICBJRlJBTUUsXG59XG5cbmV4cG9ydCBjb25zdCBVSV9URVhUID0ge1xuICBFUlJPUl9VTkVYUEVDVEVEOiAnVW5leHBlY3RlZCBlcnJvcicsXG4gIEVSUk9SX01JU1NJTkdfRlJBTUVTOiAnTm8gZnJhbWVzIGZvdW5kLiBQbGVhc2UgYWRkIHNvbWUgZnJhbWVzIHRvIHRoZSBwYWdlLicsXG4gIFdBUk5fTk9fVEFSR0VUUzogJ1N0YW5kYXJkIGZyYW1lcyBub3QgZm91bmQuIFBsZWFzZSBzZWxlY3QgdGFyZ2V0IGZyYW1lcy4nLFxuICBXQVJOX1RPT19NQU5ZX1RBUkdFVFM6ICdQbGVhc2Ugc2VsZWN0IHRocmVlIHRhcmdldCBmcmFtZXMnLFxuICBJTkZPX1BSRVZJRVc6ICdQcmV2aWV3IGVhY2ggZnJhbWUgb3V0cHV0JyxcbiAgVElUTEVfQ0hPT1NFX0ZSQU1FOiAnQ2hvb3NlIHdoaWNoIGZyYW1lcyB0byBleHBvcnQnLFxuICBUSVRMRV9QUkVWSUVXOiAnUHJldmlldycsXG4gIFRJTEVfT1VUUFVUOiAnRXhwb3J0JyxcbiAgQlVUVE9OX05FWFQ6ICdOZXh0JyxcbiAgQlVUVE9OX0RPV05MT0FEOiAnRG93bmxvYWQnLFxuICBCVVRUT05fUFJFVklPVVM6ICdCYWNrJyxcbn07XG5cbmV4cG9ydCBjb25zdCBJTklUSUFMX1VJX1NJWkUgPSB7IHdpZHRoOiA0ODAsIGhlaWdodDogNjAwIH07XG4iLCAiaW1wb3J0IHsgQlJFQUtQT0lOVFMsIE1TR19FVkVOVFMsIElOSVRJQUxfVUlfU0laRSB9IGZyb20gJy4vY29uc3RhbnRzJztcblxuLy8gR2VuZXJhdGUgYSB1bmlxdWUgaWQgcHJlZml4ZWQgd2l0aCBpZGVudGlmZXIgc3RyaW5nIGZvciBzYWZlIHVzZSBhcyBIVE1MIElEXG4vLyBOb3RlOiBGaWdtYSBzZWVtcyB0byBzdHViIC50b1N0cmluZyBmb3Igc2VjdXJpdHk/XG5mdW5jdGlvbiBnZW5SYW5kb21VaWQoKSB7XG4gIGNvbnN0IHJuZCA9IE1hdGgucmFuZG9tKCk7XG4gIGNvbnN0IHVpZCA9IHJuZC50b1N0cmluZygpLnN1YnN0cigyKTtcbiAgcmV0dXJuIGBmMmgtJHt1aWR9YDtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZ2V0RnJhbWVTdmdBc1N0cmluZyhmcmFtZTogU2NlbmVOb2RlKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3Qgc3ZnQnVmZiA9IGF3YWl0IGZyYW1lLmV4cG9ydEFzeW5jKHtcbiAgICBmb3JtYXQ6ICdTVkcnLFxuICAgIHN2Z091dGxpbmVUZXh0OiBmYWxzZSxcbiAgICBzdmdTaW1wbGlmeVN0cm9rZTogdHJ1ZSxcbiAgfSk7XG5cbiAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkobnVsbCwgQXJyYXkuZnJvbShzdmdCdWZmKSk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUG9zdE1zZyB7XG4gIHR5cGU6IE1TR19FVkVOVFM7XG4gIGZyYW1lSWQ6IHN0cmluZztcbiAgd2lkdGg6IG51bWJlcjtcbiAgaGVpZ2h0OiBudW1iZXI7XG59XG4vLyBIYW5kbGUgbWVzc2FnZXMgZnJvbSB0aGUgVUlcbmNvbnN0IGhhbmRsZVJlY2VpdmVkTXNnID0gKG1zZzogUG9zdE1zZykgPT4ge1xuICBjb25zdCB7IHR5cGUsIHdpZHRoLCBoZWlnaHQsIGZyYW1lSWQgfSA9IG1zZztcblxuICBzd2l0Y2ggKHR5cGUpIHtcbiAgICBjYXNlIE1TR19FVkVOVFMuRVJST1I6XG4gICAgICBjb25zb2xlLmxvZygncGx1Z2luIG1zZzogZXJyb3InKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSBNU0dfRVZFTlRTLkNMT1NFOlxuICAgICAgY29uc29sZS5sb2coJ3BsdWdpbiBtc2c6IGNsb3NlJyk7XG4gICAgICBmaWdtYS5jbG9zZVBsdWdpbigpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIE1TR19FVkVOVFMuRE9NX1JFQURZOlxuICAgICAgY29uc29sZS5sb2coJ3BsdWdpbiBtc2c6IERPTSBSRUFEWScpO1xuICAgICAgbWFpbigpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIE1TR19FVkVOVFMuUkVOREVSOlxuICAgICAgY29uc29sZS5sb2coJ3BsdWdpbiBtc2c6IHJlbmRlcicsIGZyYW1lSWQpO1xuICAgICAgcmVuZGVyRnJhbWUoZnJhbWVJZClcbiAgICAgICAgLnRoZW4oKHN2Z1N0cikgPT4ge1xuICAgICAgICAgIGZpZ21hLnVpLnBvc3RNZXNzYWdlKHtcbiAgICAgICAgICAgIHR5cGU6IE1TR19FVkVOVFMuUkVOREVSLFxuICAgICAgICAgICAgZnJhbWVJZCxcbiAgICAgICAgICAgIHN2Z1N0cixcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7XG4gICAgICAgICAgICB0eXBlOiBNU0dfRVZFTlRTLkVSUk9SLFxuICAgICAgICAgICAgZXJyb3JUZXh0OiBgUmVuZGVyIGZhaWxlZDogJHtlcnIgPz8gZXJyLm1lc3NhZ2V9YCxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgTVNHX0VWRU5UUy5SRVNJWkU6XG4gICAgICBjb25zb2xlLmxvZygncGx1Z2luIG1zZzogcmVzaXplJyk7XG4gICAgICBmaWdtYS51aS5yZXNpemUod2lkdGgsIGhlaWdodCk7XG4gICAgICBicmVhaztcblxuICAgIGRlZmF1bHQ6XG4gICAgICBjb25zb2xlLmVycm9yKCdVbmtub3duIHBvc3QgbWVzc2FnZScsIG1zZyk7XG4gIH1cbn07XG5cbi8vIExpc3RlbiBmb3IgbWVzc2FnZXMgZnJvbSB0aGUgVUlcbmZpZ21hLnVpLm9uKCdtZXNzYWdlJywgKGUpID0+IGhhbmRsZVJlY2VpdmVkTXNnKGUpKTtcblxuY29uc3QgbWFpbiA9ICgpID0+IHtcbiAgY29uc3QgeyBjdXJyZW50UGFnZSB9ID0gZmlnbWE7XG5cbiAgLy8gR2V0IGRlZmF1bHQgZnJhbWVzIG5hbWVzXG4gIGNvbnN0IGFsbEZyYW1lcyA9IGN1cnJlbnRQYWdlLmNoaWxkcmVuLmZpbHRlcihcbiAgICAobm9kZSkgPT4gbm9kZS50eXBlID09PSAnRlJBTUUnXG4gICkgYXMgRnJhbWVOb2RlW107XG5cbiAgY29uc3QgYnJlYWtwb2ludHMgPSBPYmplY3Qua2V5cyhCUkVBS1BPSU5UUykubWFwKChuYW1lKSA9PlxuICAgIG5hbWUudG9Mb3dlckNhc2UoKVxuICApO1xuICBjb25zdCBzZWxlY3RlZEZyYW1lcyA9IGFsbEZyYW1lc1xuICAgIC5maWx0ZXIoKGZyYW1lKSA9PiBicmVha3BvaW50cy5pbmNsdWRlcyhmcmFtZS5uYW1lLnRvTG93ZXJDYXNlKCkpKVxuICAgIC5tYXAoKGZyYW1lKSA9PiBmcmFtZS5pZCk7XG5cbiAgaWYgKGFsbEZyYW1lcy5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgZnJhbWVzRGF0YSA9IGFsbEZyYW1lcy5tYXAoKGZyYW1lKSA9PiB7XG4gICAgICBjb25zdCB7IG5hbWUsIHdpZHRoLCBoZWlnaHQsIGlkIH0gPSBmcmFtZTtcbiAgICAgIGNvbnN0IHRleHROb2RlcyA9IGdldFRleHROb2RlcyhmcmFtZSk7XG4gICAgICBjb25zdCB1aWQgPSBnZW5SYW5kb21VaWQoKTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5hbWUsXG4gICAgICAgIHdpZHRoLFxuICAgICAgICBoZWlnaHQsXG4gICAgICAgIGlkLFxuICAgICAgICB0ZXh0Tm9kZXMsXG4gICAgICAgIHVpZCxcbiAgICAgIH07XG4gICAgfSk7XG5cbiAgICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7XG4gICAgICB0eXBlOiBNU0dfRVZFTlRTLkZPVU5EX0ZSQU1FUyxcbiAgICAgIGZyYW1lczogZnJhbWVzRGF0YSxcbiAgICAgIHNlbGVjdGVkRnJhbWVzLFxuICAgIH0pO1xuXG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKGFsbEZyYW1lcy5sZW5ndGggPCAxKSB7XG4gICAgY29uc29sZS53YXJuKCdObyBmcmFtZXMnKTtcbiAgICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7IHR5cGU6IE1TR19FVkVOVFMuTk9fRlJBTUVTIH0pO1xuICAgIHJldHVybjtcbiAgfVxufTtcblxuLy8gUmVuZGVyIHRoZSBET01cbmZpZ21hLnNob3dVSShfX2h0bWxfXyk7XG5maWdtYS51aS5yZXNpemUoSU5JVElBTF9VSV9TSVpFLndpZHRoLCBJTklUSUFMX1VJX1NJWkUuaGVpZ2h0KTtcblxuYXN5bmMgZnVuY3Rpb24gcmVuZGVyRnJhbWUoZnJhbWVJZDogc3RyaW5nKSB7XG4gIGNvbnN0IGZyYW1lID0gZmlnbWEuZ2V0Tm9kZUJ5SWQoZnJhbWVJZCk7XG4gIGlmICghZnJhbWUgfHwgZnJhbWUudHlwZSAhPT0gJ0ZSQU1FJykge1xuICAgIHRocm93IG5ldyBFcnJvcignTWlzc2luZyBmcmFtZScpO1xuICB9XG5cbiAgY29uc3Qgc3ZnU3RyID0gYXdhaXQgZ2V0RnJhbWVTdmdBc1N0cmluZyhmcmFtZSk7XG5cbiAgcmV0dXJuIHN2Z1N0cjtcbn1cblxuZXhwb3J0IHR5cGUgdGV4dE5vZGVTZWxlY3RlZFByb3BzID0gUGljazxcbiAgVGV4dE5vZGUsXG4gICd4JyB8ICd5JyB8ICd3aWR0aCcgfCAnaGVpZ2h0JyB8ICdjaGFyYWN0ZXJzJ1xuPjtcblxuZXhwb3J0IGludGVyZmFjZSB0ZXh0RGF0YSBleHRlbmRzIHRleHROb2RlU2VsZWN0ZWRQcm9wcyB7XG4gIGNvbG91cjogeyByOiBudW1iZXI7IGc6IG51bWJlcjsgYjogbnVtYmVyOyBhOiBudW1iZXIgfTtcbiAgZm9udFNpemU6IG51bWJlcjtcbiAgZm9udEZhbWlseTogc3RyaW5nO1xufVxuXG4vLyBFeHRyYWN0IG9iamVjdCBwcm9wZXJ0aWVzIGZyb20gdGV4dE5vZGUgZm9yIHBhc3NpbmcgdmlhIHBvc3RNZXNzYWdlXG5mdW5jdGlvbiBnZXRUZXh0Tm9kZXMoZnJhbWU6IEZyYW1lTm9kZSk6IHRleHREYXRhW10ge1xuICBjb25zdCB0ZXh0Tm9kZXMgPSBmcmFtZS5maW5kQWxsKCh7IHR5cGUgfSkgPT4gdHlwZSA9PT0gJ1RFWFQnKSBhcyBUZXh0Tm9kZVtdO1xuXG4gIHJldHVybiB0ZXh0Tm9kZXMubWFwKFxuICAgIChub2RlKTogdGV4dERhdGEgPT4ge1xuICAgICAgY29uc3Qge1xuICAgICAgICB4LFxuICAgICAgICB5LFxuICAgICAgICB3aWR0aCxcbiAgICAgICAgaGVpZ2h0LFxuICAgICAgICBmb250U2l6ZTogZm9udFNpemVEYXRhLFxuICAgICAgICBmb250TmFtZSxcbiAgICAgICAgZmlsbHMsXG4gICAgICAgIGNoYXJhY3RlcnMsXG4gICAgICB9ID0gbm9kZTtcblxuICAgICAgLy8gRXh0cmFjdCBiYXNpYyBmaWxsIGNvbG91clxuICAgICAgY29uc3QgW2ZpbGxdID0gZmlsbHM7XG4gICAgICBsZXQgY29sb3VyID0geyByOiAwLCBnOiAwLCBiOiAwLCBhOiAxIH07XG4gICAgICBpZiAoZmlsbC50eXBlID09PSAnU09MSUQnKSB7XG4gICAgICAgIGNvbG91ciA9IHsgLi4uY29sb3VyLCBhOiBmaWxsLm9wYWNpdHkgfHwgMSB9O1xuICAgICAgfVxuXG4gICAgICAvLyBFeHRyYWN0IGZvbnQgZmFtaWx5XG4gICAgICBsZXQgZm9udFNpemUgPSAxNjtcbiAgICAgIGlmIChmb250U2l6ZURhdGEgIT09IGZpZ21hLm1peGVkKSB7XG4gICAgICAgIGZvbnRTaXplID0gZm9udFNpemVEYXRhO1xuICAgICAgfVxuXG4gICAgICAvLyBFeHRyYWN0IGZvbnQgZmFtaWx5XG4gICAgICBsZXQgZm9udEZhbWlseSA9ICdBcmlhbCc7XG4gICAgICBpZiAoZm9udE5hbWUgIT09IGZpZ21hLm1peGVkKSB7XG4gICAgICAgIGZvbnRGYW1pbHkgPSBmb250TmFtZS5mYW1pbHk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7IHgsIHksIHdpZHRoLCBoZWlnaHQsIGZvbnRTaXplLCBmb250RmFtaWx5LCBjb2xvdXIsIGNoYXJhY3RlcnMgfTtcbiAgICB9XG4gICk7XG59XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsQUFNTyxVQUFLO0FBQUwsZ0JBQUs7QUFDVjtBQUNBO0FBQ0E7U0FIVTtBQU1MLFVBQUs7QUFBTCxnQkFBSztBQUNWO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO1NBUFU7QUFVTCxVQUFLO0FBQUwsZ0JBQUs7QUFDViw4Q0FBUyxPQUFUO0FBQ0EsOENBQVMsT0FBVDtBQUNBLCtDQUFVLFFBQVY7U0FIVTtBQU1MLFVBQUs7QUFBTCxnQkFBSztBQUNWO0FBQ0E7U0FGVTtBQUtMLFlBQU0sVUFBVTswQkFDSDs4QkFDSTt5QkFDTDsrQkFDTTtzQkFDVDs0QkFDTTt1QkFDTDtxQkFDRjtxQkFDQTt5QkFDSTt5QkFDQTs7QUFHWixZQUFNLGtCQUFrQjtlQUFTO2dCQUFhOzs7O0FDL0NyRCxBQUlBO0FBQ0UsY0FBTSxNQUFNLEtBQUs7QUFDakIsY0FBTSxNQUFNLElBQUksV0FBVyxPQUFPO0FBQ2xDLGVBQU8sT0FB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
