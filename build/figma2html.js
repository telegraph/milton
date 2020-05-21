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
        const {type, uiWidth, frameId} = msg;
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
            figma.ui.resize(uiWidth, 400);
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
            console.log(uid);
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
      figma.ui.resize(640, 640);
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL2NvbnN0YW50cy50cyIsICJzcmMvaW5kZXgudHN4Il0sCiAgInNvdXJjZXNDb250ZW50IjogWyJleHBvcnQgdHlwZSBib2FyZCA9IHtcbiAgaWQ6IHN0cmluZztcbiAgd2lkdGg6IG51bWJlcjtcbiAgYnVmZmVyOiBVaW50OEFycmF5O1xufTtcblxuZXhwb3J0IGVudW0gU1RBR0VTIHtcbiAgQ0hPT1NFX0ZSQU1FUyxcbiAgUFJFVklFV19PVVRQVVQsXG4gIFNBVkVfT1VUUFVULFxufVxuXG5leHBvcnQgZW51bSBNU0dfRVZFTlRTIHtcbiAgRE9NX1JFQURZLFxuICBOT19GUkFNRVMsXG4gIEZPVU5EX0ZSQU1FUyxcbiAgUkVTSVpFLFxuICBSRU5ERVIsXG4gIENMT1NFLFxuICBFUlJPUixcbn1cblxuZXhwb3J0IGVudW0gQlJFQUtQT0lOVFMge1xuICBNb2JpbGUgPSAzNDAsXG4gIFRhYmxldCA9IDUyMCxcbiAgRGVza3RvcCA9IDEwMjQsXG59XG5cbmV4cG9ydCBlbnVtIE9VVFBVVF9GT1JNQVRTIHtcbiAgSU5MSU5FLFxuICBJRlJBTUUsXG59XG5cbmV4cG9ydCBjb25zdCBVSV9URVhUID0ge1xuICBFUlJPUl9VTkVYUEVDVEVEOiAnVW5leHBlY3RlZCBlcnJvcicsXG4gIEVSUk9SX01JU1NJTkdfRlJBTUVTOiAnTm8gZnJhbWVzIGZvdW5kLiBQbGVhc2UgYWRkIHNvbWUgZnJhbWVzIHRvIHRoZSBwYWdlLicsXG4gIFdBUk5fTk9fVEFSR0VUUzogJ1N0YW5kYXJkIGZyYW1lcyBub3QgZm91bmQuIFBsZWFzZSBzZWxlY3QgdGFyZ2V0IGZyYW1lcy4nLFxuICBXQVJOX1RPT19NQU5ZX1RBUkdFVFM6ICdQbGVhc2Ugc2VsZWN0IHRocmVlIHRhcmdldCBmcmFtZXMnLFxuICBJTkZPX1BSRVZJRVc6ICdQcmV2aWV3IGVhY2ggZnJhbWUgb3V0cHV0JyxcbiAgVElUTEVfQ0hPT1NFX0ZSQU1FOiAnQ2hvb3NlIHdoaWNoIGZyYW1lcyB0byBleHBvcnQnLFxuICBUSVRMRV9QUkVWSUVXOiAnUHJldmlldycsXG4gIFRJTEVfT1VUUFVUOiAnRXhwb3J0JyxcbiAgQlVUVE9OX05FWFQ6ICdOZXh0JyxcbiAgQlVUVE9OX0RPV05MT0FEOiAnRG93bmxvYWQnLFxuICBCVVRUT05fUFJFVklPVVM6ICdCYWNrJyxcbn07XG4iLCAiaW1wb3J0IHsgQlJFQUtQT0lOVFMsIE1TR19FVkVOVFMgfSBmcm9tICcuL2NvbnN0YW50cyc7XG5cbi8vIEdlbmVyYXRlIGEgdW5pcXVlIGlkIHByZWZpeGVkIHdpdGggaWRlbnRpZmVyIHN0cmluZyBmb3Igc2FmZSB1c2UgYXMgSFRNTCBJRFxuLy8gTm90ZTogRmlnbWEgc2VlbXMgdG8gc3R1YiAudG9TdHJpbmcgZm9yIHNlY3VyaXR5P1xuZnVuY3Rpb24gZ2VuUmFuZG9tVWlkKCkge1xuICBjb25zdCBybmQgPSBNYXRoLnJhbmRvbSgpO1xuICBjb25zdCB1aWQgPSBybmQudG9TdHJpbmcoKS5zdWJzdHIoMik7XG4gIHJldHVybiBgZjJoLSR7dWlkfWA7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGdldEZyYW1lU3ZnQXNTdHJpbmcoZnJhbWU6IFNjZW5lTm9kZSk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IHN2Z0J1ZmYgPSBhd2FpdCBmcmFtZS5leHBvcnRBc3luYyh7XG4gICAgZm9ybWF0OiAnU1ZHJyxcbiAgICBzdmdPdXRsaW5lVGV4dDogZmFsc2UsXG4gICAgc3ZnU2ltcGxpZnlTdHJva2U6IHRydWUsXG4gIH0pO1xuXG4gIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KG51bGwsIEFycmF5LmZyb20oc3ZnQnVmZikpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBvc3RNc2cge1xuICB0eXBlOiBNU0dfRVZFTlRTO1xuICBmcmFtZUlkOiBzdHJpbmc7XG4gIHVpV2lkdGg6IG51bWJlcjtcbn1cbi8vIEhhbmRsZSBtZXNzYWdlcyBmcm9tIHRoZSBVSVxuY29uc3QgaGFuZGxlUmVjZWl2ZWRNc2cgPSAobXNnOiBQb3N0TXNnKSA9PiB7XG4gIGNvbnN0IHsgdHlwZSwgdWlXaWR0aCwgZnJhbWVJZCB9ID0gbXNnO1xuXG4gIHN3aXRjaCAodHlwZSkge1xuICAgIGNhc2UgTVNHX0VWRU5UUy5FUlJPUjpcbiAgICAgIGNvbnNvbGUubG9nKCdwbHVnaW4gbXNnOiBlcnJvcicpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIE1TR19FVkVOVFMuQ0xPU0U6XG4gICAgICBjb25zb2xlLmxvZygncGx1Z2luIG1zZzogY2xvc2UnKTtcbiAgICAgIGZpZ21hLmNsb3NlUGx1Z2luKCk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgTVNHX0VWRU5UUy5ET01fUkVBRFk6XG4gICAgICBjb25zb2xlLmxvZygncGx1Z2luIG1zZzogRE9NIFJFQURZJyk7XG4gICAgICBtYWluKCk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgTVNHX0VWRU5UUy5SRU5ERVI6XG4gICAgICBjb25zb2xlLmxvZygncGx1Z2luIG1zZzogcmVuZGVyJywgZnJhbWVJZCk7XG4gICAgICByZW5kZXJGcmFtZShmcmFtZUlkKVxuICAgICAgICAudGhlbigoc3ZnU3RyKSA9PiB7XG4gICAgICAgICAgZmlnbWEudWkucG9zdE1lc3NhZ2Uoe1xuICAgICAgICAgICAgdHlwZTogTVNHX0VWRU5UUy5SRU5ERVIsXG4gICAgICAgICAgICBmcmFtZUlkLFxuICAgICAgICAgICAgc3ZnU3RyLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgIGZpZ21hLnVpLnBvc3RNZXNzYWdlKHtcbiAgICAgICAgICAgIHR5cGU6IE1TR19FVkVOVFMuRVJST1IsXG4gICAgICAgICAgICBlcnJvclRleHQ6IGBSZW5kZXIgZmFpbGVkOiAke2VyciA/PyBlcnIubWVzc2FnZX1gLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSBNU0dfRVZFTlRTLlJFU0laRTpcbiAgICAgIGNvbnNvbGUubG9nKCdwbHVnaW4gbXNnOiByZXNpemUnKTtcbiAgICAgIGZpZ21hLnVpLnJlc2l6ZSh1aVdpZHRoLCA0MDApO1xuICAgICAgYnJlYWs7XG5cbiAgICBkZWZhdWx0OlxuICAgICAgY29uc29sZS5lcnJvcignVW5rbm93biBwb3N0IG1lc3NhZ2UnLCBtc2cpO1xuICB9XG59O1xuXG4vLyBMaXN0ZW4gZm9yIG1lc3NhZ2VzIGZyb20gdGhlIFVJXG5maWdtYS51aS5vbignbWVzc2FnZScsIChlKSA9PiBoYW5kbGVSZWNlaXZlZE1zZyhlKSk7XG5cbmNvbnN0IG1haW4gPSAoKSA9PiB7XG4gIGNvbnN0IHsgY3VycmVudFBhZ2UgfSA9IGZpZ21hO1xuXG4gIC8vIEdldCBkZWZhdWx0IGZyYW1lcyBuYW1lc1xuICBjb25zdCBhbGxGcmFtZXMgPSBjdXJyZW50UGFnZS5jaGlsZHJlbi5maWx0ZXIoXG4gICAgKG5vZGUpID0+IG5vZGUudHlwZSA9PT0gJ0ZSQU1FJ1xuICApIGFzIEZyYW1lTm9kZVtdO1xuXG4gIGNvbnN0IGJyZWFrcG9pbnRzID0gT2JqZWN0LmtleXMoQlJFQUtQT0lOVFMpLm1hcCgobmFtZSkgPT5cbiAgICBuYW1lLnRvTG93ZXJDYXNlKClcbiAgKTtcbiAgY29uc3Qgc2VsZWN0ZWRGcmFtZXMgPSBhbGxGcmFtZXNcbiAgICAuZmlsdGVyKChmcmFtZSkgPT4gYnJlYWtwb2ludHMuaW5jbHVkZXMoZnJhbWUubmFtZS50b0xvd2VyQ2FzZSgpKSlcbiAgICAubWFwKChmcmFtZSkgPT4gZnJhbWUuaWQpO1xuXG4gIGlmIChhbGxGcmFtZXMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IGZyYW1lc0RhdGEgPSBhbGxGcmFtZXMubWFwKChmcmFtZSkgPT4ge1xuICAgICAgY29uc3QgeyBuYW1lLCB3aWR0aCwgaGVpZ2h0LCBpZCB9ID0gZnJhbWU7XG4gICAgICBjb25zdCB0ZXh0Tm9kZXMgPSBnZXRUZXh0Tm9kZXMoZnJhbWUpO1xuICAgICAgY29uc3QgdWlkID0gZ2VuUmFuZG9tVWlkKCk7XG4gICAgICBjb25zb2xlLmxvZyh1aWQpO1xuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBuYW1lLFxuICAgICAgICB3aWR0aCxcbiAgICAgICAgaGVpZ2h0LFxuICAgICAgICBpZCxcbiAgICAgICAgdGV4dE5vZGVzLFxuICAgICAgICB1aWQsXG4gICAgICB9O1xuICAgIH0pO1xuXG4gICAgZmlnbWEudWkucG9zdE1lc3NhZ2Uoe1xuICAgICAgdHlwZTogTVNHX0VWRU5UUy5GT1VORF9GUkFNRVMsXG4gICAgICBmcmFtZXM6IGZyYW1lc0RhdGEsXG4gICAgICBzZWxlY3RlZEZyYW1lcyxcbiAgICB9KTtcblxuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmIChhbGxGcmFtZXMubGVuZ3RoIDwgMSkge1xuICAgIGNvbnNvbGUud2FybignTm8gZnJhbWVzJyk7XG4gICAgZmlnbWEudWkucG9zdE1lc3NhZ2UoeyB0eXBlOiBNU0dfRVZFTlRTLk5PX0ZSQU1FUyB9KTtcbiAgICByZXR1cm47XG4gIH1cbn07XG5cbi8vIFJlbmRlciB0aGUgRE9NXG5maWdtYS5zaG93VUkoX19odG1sX18pO1xuZmlnbWEudWkucmVzaXplKDY0MCwgNjQwKTtcblxuYXN5bmMgZnVuY3Rpb24gcmVuZGVyRnJhbWUoZnJhbWVJZDogc3RyaW5nKSB7XG4gIGNvbnN0IGZyYW1lID0gZmlnbWEuZ2V0Tm9kZUJ5SWQoZnJhbWVJZCk7XG4gIGlmICghZnJhbWUgfHwgZnJhbWUudHlwZSAhPT0gJ0ZSQU1FJykge1xuICAgIHRocm93IG5ldyBFcnJvcignTWlzc2luZyBmcmFtZScpO1xuICB9XG5cbiAgY29uc3Qgc3ZnU3RyID0gYXdhaXQgZ2V0RnJhbWVTdmdBc1N0cmluZyhmcmFtZSk7XG5cbiAgcmV0dXJuIHN2Z1N0cjtcbn1cblxuZXhwb3J0IHR5cGUgdGV4dE5vZGVTZWxlY3RlZFByb3BzID0gUGljazxcbiAgVGV4dE5vZGUsXG4gICd4JyB8ICd5JyB8ICd3aWR0aCcgfCAnaGVpZ2h0JyB8ICdjaGFyYWN0ZXJzJ1xuPjtcblxuZXhwb3J0IGludGVyZmFjZSB0ZXh0RGF0YSBleHRlbmRzIHRleHROb2RlU2VsZWN0ZWRQcm9wcyB7XG4gIGNvbG91cjogeyByOiBudW1iZXI7IGc6IG51bWJlcjsgYjogbnVtYmVyOyBhOiBudW1iZXIgfTtcbiAgZm9udFNpemU6IG51bWJlcjtcbiAgZm9udEZhbWlseTogc3RyaW5nO1xufVxuXG4vLyBFeHRyYWN0IG9iamVjdCBwcm9wZXJ0aWVzIGZyb20gdGV4dE5vZGUgZm9yIHBhc3NpbmcgdmlhIHBvc3RNZXNzYWdlXG5mdW5jdGlvbiBnZXRUZXh0Tm9kZXMoZnJhbWU6IEZyYW1lTm9kZSk6IHRleHREYXRhW10ge1xuICBjb25zdCB0ZXh0Tm9kZXMgPSBmcmFtZS5maW5kQWxsKCh7IHR5cGUgfSkgPT4gdHlwZSA9PT0gJ1RFWFQnKSBhcyBUZXh0Tm9kZVtdO1xuXG4gIHJldHVybiB0ZXh0Tm9kZXMubWFwKFxuICAgIChub2RlKTogdGV4dERhdGEgPT4ge1xuICAgICAgY29uc3Qge1xuICAgICAgICB4LFxuICAgICAgICB5LFxuICAgICAgICB3aWR0aCxcbiAgICAgICAgaGVpZ2h0LFxuICAgICAgICBmb250U2l6ZTogZm9udFNpemVEYXRhLFxuICAgICAgICBmb250TmFtZSxcbiAgICAgICAgZmlsbHMsXG4gICAgICAgIGNoYXJhY3RlcnMsXG4gICAgICB9ID0gbm9kZTtcblxuICAgICAgLy8gRXh0cmFjdCBiYXNpYyBmaWxsIGNvbG91clxuICAgICAgY29uc3QgW2ZpbGxdID0gZmlsbHM7XG4gICAgICBsZXQgY29sb3VyID0geyByOiAwLCBnOiAwLCBiOiAwLCBhOiAxIH07XG4gICAgICBpZiAoZmlsbC50eXBlID09PSAnU09MSUQnKSB7XG4gICAgICAgIGNvbG91ciA9IHsgLi4uY29sb3VyLCBhOiBmaWxsLm9wYWNpdHkgfHwgMSB9O1xuICAgICAgfVxuXG4gICAgICAvLyBFeHRyYWN0IGZvbnQgZmFtaWx5XG4gICAgICBsZXQgZm9udFNpemUgPSAxNjtcbiAgICAgIGlmIChmb250U2l6ZURhdGEgIT09IGZpZ21hLm1peGVkKSB7XG4gICAgICAgIGZvbnRTaXplID0gZm9udFNpemVEYXRhO1xuICAgICAgfVxuXG4gICAgICAvLyBFeHRyYWN0IGZvbnQgZmFtaWx5XG4gICAgICBsZXQgZm9udEZhbWlseSA9ICdBcmlhbCc7XG4gICAgICBpZiAoZm9udE5hbWUgIT09IGZpZ21hLm1peGVkKSB7XG4gICAgICAgIGZvbnRGYW1pbHkgPSBmb250TmFtZS5mYW1pbHk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7IHgsIHksIHdpZHRoLCBoZWlnaHQsIGZvbnRTaXplLCBmb250RmFtaWx5LCBjb2xvdXIsIGNoYXJhY3RlcnMgfTtcbiAgICB9XG4gICk7XG59XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsQUFNTyxVQUFLO0FBQUwsZ0JBQUs7QUFDVjtBQUNBO0FBQ0E7U0FIVTtBQU1MLFVBQUs7QUFBTCxnQkFBSztBQUNWO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO1NBUFU7QUFVTCxVQUFLO0FBQUwsZ0JBQUs7QUFDViw4Q0FBUyxPQUFUO0FBQ0EsOENBQVMsT0FBVDtBQUNBLCtDQUFVLFFBQVY7U0FIVTtBQU1MLFVBQUs7QUFBTCxnQkFBSztBQUNWO0FBQ0E7U0FGVTtBQUtMLFlBQU0sVUFBVTswQkFDSDs4QkFDSTt5QkFDTDsrQkFDTTtzQkFDVDs0QkFDTTt1QkFDTDtxQkFDRjtxQkFDQTt5QkFDSTt5QkFDQTs7OztBQzVDbkIsQUFJQTtBQUNFLGNBQU0sTUFBTSxLQUFLO0FBQ2pCLGNBQU0sTUFBTSxJQUFJLFdBQVcsT0FBTztBQUNsQyxlQUFPLE9BQU87O0FBR2hCLHlDQUFtQztBQUNqQyxjQUFNLFVBQVUsTUFBTSxNQUFNLFlBQVk7a0JBQzlCOzBCQUNROzZCQUNHOztBQUdyQixlQUFPLE9BQU8sYUFBYSxNQUFNLE1BQU0sTUFBTSxLQUFLOztBQVNwRCxZQUFNLG9CQUFvQixDQUFDO0FBQ3pCLGNBQU0sMkJBQTZCO0FBRW5DLGdCQUFRO2VBQ0QsV0FBVztBQUNkLG9CQUFRLElBQUk7QUFDWjtlQUVHLFdBQVc7QUFDZCxvQkFBUSxJQUFJO0FBQ1osa0JBQU07QUFDTjtlQUVHLFdBQVc7QUFDZCxvQkFBUSxJQUFJO0FBQ1o7QUFDQTtlQUVHLFdBQVc7QUFDZCxvQkFBUSxJQUFJLHNCQUFzQjtBQUNsQyx3QkFBWSxTQUNULEtBQUssQ0FBQztBQUNMLG9CQUFNLEdBQUcsWUFBWTtzQkFDYixXQUFXOzs7O2VBS3BCLE1BQU0sQ0FBQztBQUNOLG9CQUFNLEdBQUcsWUFBWTtzQkFDYixXQUFXOzJCQUNOLGtCQUF5QixBQUFQLG9CQUFPLElBQUk7OztBQUc5QztlQUVHLFdBQVc7QUFDZCxvQkFBUSxJQUFJO0FBQ1osa0JBQU0sR0FBRyxPQUFPLFNBQVM7QUFDekI7O0FBR0Esb0JBQVEsTUFBTSx3QkFBd0I7OztBQUs1QyxZQUFNLEdBQUcsR0FBRyxXQUFXLENBQUMsTUFBTSxrQkFBa0I7QUFFaEQsWUFBTSxPQUFPO0FBQ1gsY0FBTSxnQkFBa0I7QUFHeEIsY0FBTSxZQUFZLFlBQVksU0FBUyxPQUNyQyxDQUFDLFNBQVMsS0FBSyxTQUFTO0FBRzFCLGNBQU0sY0FBYyxPQUFPLEtBQUssYUFBYSxJQUFJLENBQUMsU0FDaEQsS0FBSztBQUVQLGNBQU0saUJBQWlCLFVBQ3BCLE9BQU8sQ0FBQyxVQUFVLFlBQVksU0FBUyxNQUFNLEtBQUssZ0JBQ2xELElBQUksQ0FBQyxVQUFVLE1BQU07QUFFeEIsWUFBSSxVQUFVLFNBQVM7QUFDckIsZ0JBQU0sYUFBYSxVQUFVLElBQUksQ0FBQztBQUNoQyxrQkFBTSw0QkFBOEI7QUFDcEMsa0JBQU0sWUFBWSxhQUFhO0FBQy9CLGtCQUFNLE1BQU07QUFDWixvQkFBUSxJQUFJO0FBRVosbUJBQU87Ozs7Ozs7OztBQVVULGdCQUFNLEdBQUcsWUFBWTtrQkFDYixXQUFXO29CQUNUOzs7QUFJVjs7QUFHRixZQUFJLFVBQVUsU0FBUztBQUNyQixrQkFBUSxLQUFLO0FBQ2IsZ0JBQU0sR0FBRyxZQUFZO2tCQUFRLFdBQVc7O0FBQ3hDOzs7QUFLSixZQUFNLE9BQU87QUFDYixZQUFNLEdBQUcsT0FBTyxLQUFLO0FBRXJCLGlDQUEyQjtBQUN6QixjQUFNLFFBQVEsTUFBTSxZQUFZO0FBQ2hDLFlBQUksQ0FBQyxTQUFTLE1BQU0sU0FBUztBQUMzQixnQkFBTSxJQUFJLE1BQU07O0FBR2xCLGNBQU0sU0FBUyxNQUFNLG9CQUFvQjtBQUV6QyxlQUFPOztBQWVULDRCQUFzQjtBQUNwQixjQUFNLFlBQVksTUFBTSxRQUFRLENBQUMsV0FBYSxTQUFTO0FBRXZELGVBQU8sVUFBVSxJQUNmLENBQUM7QUFDQyxnQkFBTSxnQ0FLTSw2Q0FJUjtBQUdKLGdCQUFNLENBQUMsUUFBUTtBQUNmLGNBQUksU0FBUztlQUFLO2VBQU07ZUFBTTtlQUFNOztBQUNwQyxjQUFJLEtBQUssU0FBUztBQUNoQixxQkFBUyxzQkFBSyxTQUFMO2lCQUFnQixLQUFLLFdBQVc7OztBQUkzQyxjQUFJLFdBQVc7QUFDZixjQUFJLGlCQUFpQixNQUFNO0FBQ3pCLHVCQUFXOztBQUliLGNBQUksYUFBYTtBQUNqQixjQUFJLGFBQWEsTUFBTTtBQUNyQix5QkFBYSxTQUFTOztBQUd4QixpQkFBTzs7Ozs7Ozs7Ozs7OyIsCiAgIm5hbWVzIjogW10KfQo=
