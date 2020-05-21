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
        height: 500,
        maxWidth: 1200,
        maxHeight: 900,
        minWidth: 420,
        minHeight: 480
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL2NvbnN0YW50cy50cyIsICJzcmMvaW5kZXgudHN4Il0sCiAgInNvdXJjZXNDb250ZW50IjogWyJleHBvcnQgdHlwZSBib2FyZCA9IHtcbiAgaWQ6IHN0cmluZztcbiAgd2lkdGg6IG51bWJlcjtcbiAgYnVmZmVyOiBVaW50OEFycmF5O1xufTtcblxuZXhwb3J0IGVudW0gU1RBR0VTIHtcbiAgQ0hPT1NFX0ZSQU1FUyxcbiAgUFJFVklFV19PVVRQVVQsXG4gIFNBVkVfT1VUUFVULFxufVxuXG5leHBvcnQgZW51bSBNU0dfRVZFTlRTIHtcbiAgRE9NX1JFQURZLFxuICBOT19GUkFNRVMsXG4gIEZPVU5EX0ZSQU1FUyxcbiAgUkVTSVpFLFxuICBSRU5ERVIsXG4gIENMT1NFLFxuICBFUlJPUixcbn1cblxuZXhwb3J0IGVudW0gQlJFQUtQT0lOVFMge1xuICBNb2JpbGUgPSAzNDAsXG4gIFRhYmxldCA9IDUyMCxcbiAgRGVza3RvcCA9IDEwMjQsXG59XG5cbmV4cG9ydCBlbnVtIE9VVFBVVF9GT1JNQVRTIHtcbiAgSU5MSU5FLFxuICBJRlJBTUUsXG59XG5cbmV4cG9ydCBjb25zdCBVSV9URVhUID0ge1xuICBFUlJPUl9VTkVYUEVDVEVEOiAnVW5leHBlY3RlZCBlcnJvcicsXG4gIEVSUk9SX01JU1NJTkdfRlJBTUVTOiAnTm8gZnJhbWVzIGZvdW5kLiBQbGVhc2UgYWRkIHNvbWUgZnJhbWVzIHRvIHRoZSBwYWdlLicsXG4gIFdBUk5fTk9fVEFSR0VUUzogJ1N0YW5kYXJkIGZyYW1lcyBub3QgZm91bmQuIFBsZWFzZSBzZWxlY3QgdGFyZ2V0IGZyYW1lcy4nLFxuICBXQVJOX1RPT19NQU5ZX1RBUkdFVFM6ICdQbGVhc2Ugc2VsZWN0IHRocmVlIHRhcmdldCBmcmFtZXMnLFxuICBJTkZPX1BSRVZJRVc6ICdQcmV2aWV3IGVhY2ggZnJhbWUgb3V0cHV0JyxcbiAgVElUTEVfQ0hPT1NFX0ZSQU1FOiAnQ2hvb3NlIHdoaWNoIGZyYW1lcyB0byBleHBvcnQnLFxuICBUSVRMRV9QUkVWSUVXOiAnUHJldmlldycsXG4gIFRJTEVfT1VUUFVUOiAnRXhwb3J0JyxcbiAgQlVUVE9OX05FWFQ6ICdOZXh0JyxcbiAgQlVUVE9OX0RPV05MT0FEOiAnRG93bmxvYWQnLFxuICBCVVRUT05fUFJFVklPVVM6ICdCYWNrJyxcbn07XG5cbmV4cG9ydCBjb25zdCBJTklUSUFMX1VJX1NJWkUgPSB7XG4gIHdpZHRoOiA0ODAsXG4gIGhlaWdodDogNTAwLFxuICBtYXhXaWR0aDogMTIwMCxcbiAgbWF4SGVpZ2h0OiA5MDAsXG4gIG1pbldpZHRoOiA0MjAsXG4gIG1pbkhlaWdodDogNDgwLFxufTtcbiIsICJpbXBvcnQgeyBCUkVBS1BPSU5UUywgTVNHX0VWRU5UUywgSU5JVElBTF9VSV9TSVpFIH0gZnJvbSAnLi9jb25zdGFudHMnO1xuXG4vLyBHZW5lcmF0ZSBhIHVuaXF1ZSBpZCBwcmVmaXhlZCB3aXRoIGlkZW50aWZlciBzdHJpbmcgZm9yIHNhZmUgdXNlIGFzIEhUTUwgSURcbi8vIE5vdGU6IEZpZ21hIHNlZW1zIHRvIHN0dWIgLnRvU3RyaW5nIGZvciBzZWN1cml0eT9cbmZ1bmN0aW9uIGdlblJhbmRvbVVpZCgpIHtcbiAgY29uc3Qgcm5kID0gTWF0aC5yYW5kb20oKTtcbiAgY29uc3QgdWlkID0gcm5kLnRvU3RyaW5nKCkuc3Vic3RyKDIpO1xuICByZXR1cm4gYGYyaC0ke3VpZH1gO1xufVxuXG5hc3luYyBmdW5jdGlvbiBnZXRGcmFtZVN2Z0FzU3RyaW5nKGZyYW1lOiBTY2VuZU5vZGUpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBzdmdCdWZmID0gYXdhaXQgZnJhbWUuZXhwb3J0QXN5bmMoe1xuICAgIGZvcm1hdDogJ1NWRycsXG4gICAgc3ZnT3V0bGluZVRleHQ6IGZhbHNlLFxuICAgIHN2Z1NpbXBsaWZ5U3Ryb2tlOiB0cnVlLFxuICB9KTtcblxuICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShudWxsLCBBcnJheS5mcm9tKHN2Z0J1ZmYpKTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQb3N0TXNnIHtcbiAgdHlwZTogTVNHX0VWRU5UUztcbiAgZnJhbWVJZDogc3RyaW5nO1xuICB3aWR0aDogbnVtYmVyO1xuICBoZWlnaHQ6IG51bWJlcjtcbn1cbi8vIEhhbmRsZSBtZXNzYWdlcyBmcm9tIHRoZSBVSVxuY29uc3QgaGFuZGxlUmVjZWl2ZWRNc2cgPSAobXNnOiBQb3N0TXNnKSA9PiB7XG4gIGNvbnN0IHsgdHlwZSwgd2lkdGgsIGhlaWdodCwgZnJhbWVJZCB9ID0gbXNnO1xuXG4gIHN3aXRjaCAodHlwZSkge1xuICAgIGNhc2UgTVNHX0VWRU5UUy5FUlJPUjpcbiAgICAgIGNvbnNvbGUubG9nKCdwbHVnaW4gbXNnOiBlcnJvcicpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIE1TR19FVkVOVFMuQ0xPU0U6XG4gICAgICBjb25zb2xlLmxvZygncGx1Z2luIG1zZzogY2xvc2UnKTtcbiAgICAgIGZpZ21hLmNsb3NlUGx1Z2luKCk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgTVNHX0VWRU5UUy5ET01fUkVBRFk6XG4gICAgICBjb25zb2xlLmxvZygncGx1Z2luIG1zZzogRE9NIFJFQURZJyk7XG4gICAgICBtYWluKCk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgTVNHX0VWRU5UUy5SRU5ERVI6XG4gICAgICBjb25zb2xlLmxvZygncGx1Z2luIG1zZzogcmVuZGVyJywgZnJhbWVJZCk7XG4gICAgICByZW5kZXJGcmFtZShmcmFtZUlkKVxuICAgICAgICAudGhlbigoc3ZnU3RyKSA9PiB7XG4gICAgICAgICAgZmlnbWEudWkucG9zdE1lc3NhZ2Uoe1xuICAgICAgICAgICAgdHlwZTogTVNHX0VWRU5UUy5SRU5ERVIsXG4gICAgICAgICAgICBmcmFtZUlkLFxuICAgICAgICAgICAgc3ZnU3RyLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgIGZpZ21hLnVpLnBvc3RNZXNzYWdlKHtcbiAgICAgICAgICAgIHR5cGU6IE1TR19FVkVOVFMuRVJST1IsXG4gICAgICAgICAgICBlcnJvclRleHQ6IGBSZW5kZXIgZmFpbGVkOiAke2VyciA/PyBlcnIubWVzc2FnZX1gLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSBNU0dfRVZFTlRTLlJFU0laRTpcbiAgICAgIGNvbnNvbGUubG9nKCdwbHVnaW4gbXNnOiByZXNpemUnKTtcbiAgICAgIGZpZ21hLnVpLnJlc2l6ZSh3aWR0aCwgaGVpZ2h0KTtcbiAgICAgIGJyZWFrO1xuXG4gICAgZGVmYXVsdDpcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1Vua25vd24gcG9zdCBtZXNzYWdlJywgbXNnKTtcbiAgfVxufTtcblxuLy8gTGlzdGVuIGZvciBtZXNzYWdlcyBmcm9tIHRoZSBVSVxuZmlnbWEudWkub24oJ21lc3NhZ2UnLCAoZSkgPT4gaGFuZGxlUmVjZWl2ZWRNc2coZSkpO1xuXG5jb25zdCBtYWluID0gKCkgPT4ge1xuICBjb25zdCB7IGN1cnJlbnRQYWdlIH0gPSBmaWdtYTtcblxuICAvLyBHZXQgZGVmYXVsdCBmcmFtZXMgbmFtZXNcbiAgY29uc3QgYWxsRnJhbWVzID0gY3VycmVudFBhZ2UuY2hpbGRyZW4uZmlsdGVyKFxuICAgIChub2RlKSA9PiBub2RlLnR5cGUgPT09ICdGUkFNRSdcbiAgKSBhcyBGcmFtZU5vZGVbXTtcblxuICBjb25zdCBicmVha3BvaW50cyA9IE9iamVjdC5rZXlzKEJSRUFLUE9JTlRTKS5tYXAoKG5hbWUpID0+XG4gICAgbmFtZS50b0xvd2VyQ2FzZSgpXG4gICk7XG4gIGNvbnN0IHNlbGVjdGVkRnJhbWVzID0gYWxsRnJhbWVzXG4gICAgLmZpbHRlcigoZnJhbWUpID0+IGJyZWFrcG9pbnRzLmluY2x1ZGVzKGZyYW1lLm5hbWUudG9Mb3dlckNhc2UoKSkpXG4gICAgLm1hcCgoZnJhbWUpID0+IGZyYW1lLmlkKTtcblxuICBpZiAoYWxsRnJhbWVzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBmcmFtZXNEYXRhID0gYWxsRnJhbWVzLm1hcCgoZnJhbWUpID0+IHtcbiAgICAgIGNvbnN0IHsgbmFtZSwgd2lkdGgsIGhlaWdodCwgaWQgfSA9IGZyYW1lO1xuICAgICAgY29uc3QgdGV4dE5vZGVzID0gZ2V0VGV4dE5vZGVzKGZyYW1lKTtcbiAgICAgIGNvbnN0IHVpZCA9IGdlblJhbmRvbVVpZCgpO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbmFtZSxcbiAgICAgICAgd2lkdGgsXG4gICAgICAgIGhlaWdodCxcbiAgICAgICAgaWQsXG4gICAgICAgIHRleHROb2RlcyxcbiAgICAgICAgdWlkLFxuICAgICAgfTtcbiAgICB9KTtcblxuICAgIGZpZ21hLnVpLnBvc3RNZXNzYWdlKHtcbiAgICAgIHR5cGU6IE1TR19FVkVOVFMuRk9VTkRfRlJBTUVTLFxuICAgICAgZnJhbWVzOiBmcmFtZXNEYXRhLFxuICAgICAgc2VsZWN0ZWRGcmFtZXMsXG4gICAgfSk7XG5cbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAoYWxsRnJhbWVzLmxlbmd0aCA8IDEpIHtcbiAgICBjb25zb2xlLndhcm4oJ05vIGZyYW1lcycpO1xuICAgIGZpZ21hLnVpLnBvc3RNZXNzYWdlKHsgdHlwZTogTVNHX0VWRU5UUy5OT19GUkFNRVMgfSk7XG4gICAgcmV0dXJuO1xuICB9XG59O1xuXG4vLyBSZW5kZXIgdGhlIERPTVxuZmlnbWEuc2hvd1VJKF9faHRtbF9fKTtcbmZpZ21hLnVpLnJlc2l6ZShJTklUSUFMX1VJX1NJWkUud2lkdGgsIElOSVRJQUxfVUlfU0laRS5oZWlnaHQpO1xuXG5hc3luYyBmdW5jdGlvbiByZW5kZXJGcmFtZShmcmFtZUlkOiBzdHJpbmcpIHtcbiAgY29uc3QgZnJhbWUgPSBmaWdtYS5nZXROb2RlQnlJZChmcmFtZUlkKTtcbiAgaWYgKCFmcmFtZSB8fCBmcmFtZS50eXBlICE9PSAnRlJBTUUnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIGZyYW1lJyk7XG4gIH1cblxuICBjb25zdCBzdmdTdHIgPSBhd2FpdCBnZXRGcmFtZVN2Z0FzU3RyaW5nKGZyYW1lKTtcblxuICByZXR1cm4gc3ZnU3RyO1xufVxuXG5leHBvcnQgdHlwZSB0ZXh0Tm9kZVNlbGVjdGVkUHJvcHMgPSBQaWNrPFxuICBUZXh0Tm9kZSxcbiAgJ3gnIHwgJ3knIHwgJ3dpZHRoJyB8ICdoZWlnaHQnIHwgJ2NoYXJhY3RlcnMnXG4+O1xuXG5leHBvcnQgaW50ZXJmYWNlIHRleHREYXRhIGV4dGVuZHMgdGV4dE5vZGVTZWxlY3RlZFByb3BzIHtcbiAgY29sb3VyOiB7IHI6IG51bWJlcjsgZzogbnVtYmVyOyBiOiBudW1iZXI7IGE6IG51bWJlciB9O1xuICBmb250U2l6ZTogbnVtYmVyO1xuICBmb250RmFtaWx5OiBzdHJpbmc7XG59XG5cbi8vIEV4dHJhY3Qgb2JqZWN0IHByb3BlcnRpZXMgZnJvbSB0ZXh0Tm9kZSBmb3IgcGFzc2luZyB2aWEgcG9zdE1lc3NhZ2VcbmZ1bmN0aW9uIGdldFRleHROb2RlcyhmcmFtZTogRnJhbWVOb2RlKTogdGV4dERhdGFbXSB7XG4gIGNvbnN0IHRleHROb2RlcyA9IGZyYW1lLmZpbmRBbGwoKHsgdHlwZSB9KSA9PiB0eXBlID09PSAnVEVYVCcpIGFzIFRleHROb2RlW107XG5cbiAgcmV0dXJuIHRleHROb2Rlcy5tYXAoXG4gICAgKG5vZGUpOiB0ZXh0RGF0YSA9PiB7XG4gICAgICBjb25zdCB7XG4gICAgICAgIHgsXG4gICAgICAgIHksXG4gICAgICAgIHdpZHRoLFxuICAgICAgICBoZWlnaHQsXG4gICAgICAgIGZvbnRTaXplOiBmb250U2l6ZURhdGEsXG4gICAgICAgIGZvbnROYW1lLFxuICAgICAgICBmaWxscyxcbiAgICAgICAgY2hhcmFjdGVycyxcbiAgICAgIH0gPSBub2RlO1xuXG4gICAgICAvLyBFeHRyYWN0IGJhc2ljIGZpbGwgY29sb3VyXG4gICAgICBjb25zdCBbZmlsbF0gPSBmaWxscztcbiAgICAgIGxldCBjb2xvdXIgPSB7IHI6IDAsIGc6IDAsIGI6IDAsIGE6IDEgfTtcbiAgICAgIGlmIChmaWxsLnR5cGUgPT09ICdTT0xJRCcpIHtcbiAgICAgICAgY29sb3VyID0geyAuLi5jb2xvdXIsIGE6IGZpbGwub3BhY2l0eSB8fCAxIH07XG4gICAgICB9XG5cbiAgICAgIC8vIEV4dHJhY3QgZm9udCBmYW1pbHlcbiAgICAgIGxldCBmb250U2l6ZSA9IDE2O1xuICAgICAgaWYgKGZvbnRTaXplRGF0YSAhPT0gZmlnbWEubWl4ZWQpIHtcbiAgICAgICAgZm9udFNpemUgPSBmb250U2l6ZURhdGE7XG4gICAgICB9XG5cbiAgICAgIC8vIEV4dHJhY3QgZm9udCBmYW1pbHlcbiAgICAgIGxldCBmb250RmFtaWx5ID0gJ0FyaWFsJztcbiAgICAgIGlmIChmb250TmFtZSAhPT0gZmlnbWEubWl4ZWQpIHtcbiAgICAgICAgZm9udEZhbWlseSA9IGZvbnROYW1lLmZhbWlseTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHsgeCwgeSwgd2lkdGgsIGhlaWdodCwgZm9udFNpemUsIGZvbnRGYW1pbHksIGNvbG91ciwgY2hhcmFjdGVycyB9O1xuICAgIH1cbiAgKTtcbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxBQU1PLFVBQUs7QUFBTCxnQkFBSztBQUNWO0FBQ0E7QUFDQTtTQUhVO0FBTUwsVUFBSztBQUFMLGdCQUFLO0FBQ1Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7U0FQVTtBQVVMLFVBQUs7QUFBTCxnQkFBSztBQUNWLDhDQUFTLE9BQVQ7QUFDQSw4Q0FBUyxPQUFUO0FBQ0EsK0NBQVUsUUFBVjtTQUhVO0FBTUwsVUFBSztBQUFMLGdCQUFLO0FBQ1Y7QUFDQTtTQUZVO0FBS0wsWUFBTSxVQUFVOzBCQUNIOzhCQUNJO3lCQUNMOytCQUNNO3NCQUNUOzRCQUNNO3VCQUNMO3FCQUNGO3FCQUNBO3lCQUNJO3lCQUNBOztBQUdaLFlBQU0sa0JBQWtCO2VBQ3RCO2dC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
