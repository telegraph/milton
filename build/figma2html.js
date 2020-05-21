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
            return {
              name,
              width,
              height,
              id,
              textNodes
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL2NvbnN0YW50cy50cyIsICJzcmMvaW5kZXgudHN4Il0sCiAgInNvdXJjZXNDb250ZW50IjogWyJleHBvcnQgdHlwZSBib2FyZCA9IHtcbiAgaWQ6IHN0cmluZztcbiAgd2lkdGg6IG51bWJlcjtcbiAgYnVmZmVyOiBVaW50OEFycmF5O1xufTtcblxuZXhwb3J0IGVudW0gU1RBR0VTIHtcbiAgQ0hPT1NFX0ZSQU1FUyxcbiAgUFJFVklFV19PVVRQVVQsXG4gIFNBVkVfT1VUUFVULFxufVxuXG5leHBvcnQgZW51bSBNU0dfRVZFTlRTIHtcbiAgRE9NX1JFQURZLFxuICBOT19GUkFNRVMsXG4gIEZPVU5EX0ZSQU1FUyxcbiAgUkVTSVpFLFxuICBSRU5ERVIsXG4gIENMT1NFLFxuICBFUlJPUixcbn1cblxuZXhwb3J0IGVudW0gQlJFQUtQT0lOVFMge1xuICBNb2JpbGUgPSAzNDAsXG4gIFRhYmxldCA9IDUyMCxcbiAgRGVza3RvcCA9IDEwMjQsXG59XG5cbmV4cG9ydCBlbnVtIE9VVFBVVF9GT1JNQVRTIHtcbiAgSU5MSU5FLFxuICBJRlJBTUUsXG59XG5cbmV4cG9ydCBjb25zdCBVSV9URVhUID0ge1xuICBFUlJPUl9VTkVYUEVDVEVEOiAnVW5leHBlY3RlZCBlcnJvcicsXG4gIEVSUk9SX01JU1NJTkdfRlJBTUVTOiAnTm8gZnJhbWVzIGZvdW5kLiBQbGVhc2UgYWRkIHNvbWUgZnJhbWVzIHRvIHRoZSBwYWdlLicsXG4gIFdBUk5fTk9fVEFSR0VUUzogJ1N0YW5kYXJkIGZyYW1lcyBub3QgZm91bmQuIFBsZWFzZSBzZWxlY3QgdGFyZ2V0IGZyYW1lcy4nLFxuICBXQVJOX1RPT19NQU5ZX1RBUkdFVFM6ICdQbGVhc2Ugc2VsZWN0IHRocmVlIHRhcmdldCBmcmFtZXMnLFxuICBJTkZPX1BSRVZJRVc6ICdQcmV2aWV3IGVhY2ggZnJhbWUgb3V0cHV0JyxcbiAgVElUTEVfQ0hPT1NFX0ZSQU1FOiAnQ2hvb3NlIHdoaWNoIGZyYW1lcyB0byBleHBvcnQnLFxuICBUSVRMRV9QUkVWSUVXOiAnUHJldmlldycsXG4gIFRJTEVfT1VUUFVUOiAnRXhwb3J0JyxcbiAgQlVUVE9OX05FWFQ6ICdOZXh0JyxcbiAgQlVUVE9OX0RPV05MT0FEOiAnRG93bmxvYWQnLFxuICBCVVRUT05fUFJFVklPVVM6ICdCYWNrJyxcbn07XG4iLCAiaW1wb3J0IHsgQlJFQUtQT0lOVFMsIE1TR19FVkVOVFMgfSBmcm9tICcuL2NvbnN0YW50cyc7XG5cbmFzeW5jIGZ1bmN0aW9uIGdldEZyYW1lU3ZnQXNTdHJpbmcoZnJhbWU6IFNjZW5lTm9kZSk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IHN2Z0J1ZmYgPSBhd2FpdCBmcmFtZS5leHBvcnRBc3luYyh7XG4gICAgZm9ybWF0OiAnU1ZHJyxcbiAgICBzdmdPdXRsaW5lVGV4dDogZmFsc2UsXG4gICAgc3ZnU2ltcGxpZnlTdHJva2U6IHRydWUsXG4gIH0pO1xuXG4gIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KG51bGwsIEFycmF5LmZyb20oc3ZnQnVmZikpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBvc3RNc2cge1xuICB0eXBlOiBNU0dfRVZFTlRTO1xuICBmcmFtZUlkOiBzdHJpbmc7XG4gIHVpV2lkdGg6IG51bWJlcjtcbn1cbi8vIEhhbmRsZSBtZXNzYWdlcyBmcm9tIHRoZSBVSVxuY29uc3QgaGFuZGxlUmVjZWl2ZWRNc2cgPSAobXNnOiBQb3N0TXNnKSA9PiB7XG4gIGNvbnN0IHsgdHlwZSwgdWlXaWR0aCwgZnJhbWVJZCB9ID0gbXNnO1xuXG4gIHN3aXRjaCAodHlwZSkge1xuICAgIGNhc2UgTVNHX0VWRU5UUy5FUlJPUjpcbiAgICAgIGNvbnNvbGUubG9nKCdwbHVnaW4gbXNnOiBlcnJvcicpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIE1TR19FVkVOVFMuQ0xPU0U6XG4gICAgICBjb25zb2xlLmxvZygncGx1Z2luIG1zZzogY2xvc2UnKTtcbiAgICAgIGZpZ21hLmNsb3NlUGx1Z2luKCk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgTVNHX0VWRU5UUy5ET01fUkVBRFk6XG4gICAgICBjb25zb2xlLmxvZygncGx1Z2luIG1zZzogRE9NIFJFQURZJyk7XG4gICAgICBtYWluKCk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgTVNHX0VWRU5UUy5SRU5ERVI6XG4gICAgICBjb25zb2xlLmxvZygncGx1Z2luIG1zZzogcmVuZGVyJywgZnJhbWVJZCk7XG4gICAgICByZW5kZXJGcmFtZShmcmFtZUlkKVxuICAgICAgICAudGhlbigoc3ZnU3RyKSA9PiB7XG4gICAgICAgICAgZmlnbWEudWkucG9zdE1lc3NhZ2Uoe1xuICAgICAgICAgICAgdHlwZTogTVNHX0VWRU5UUy5SRU5ERVIsXG4gICAgICAgICAgICBmcmFtZUlkLFxuICAgICAgICAgICAgc3ZnU3RyLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgIGZpZ21hLnVpLnBvc3RNZXNzYWdlKHtcbiAgICAgICAgICAgIHR5cGU6IE1TR19FVkVOVFMuRVJST1IsXG4gICAgICAgICAgICBlcnJvclRleHQ6IGBSZW5kZXIgZmFpbGVkOiAke2VyciA/PyBlcnIubWVzc2FnZX1gLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSBNU0dfRVZFTlRTLlJFU0laRTpcbiAgICAgIGNvbnNvbGUubG9nKCdwbHVnaW4gbXNnOiByZXNpemUnKTtcbiAgICAgIGZpZ21hLnVpLnJlc2l6ZSh1aVdpZHRoLCA0MDApO1xuICAgICAgYnJlYWs7XG5cbiAgICBkZWZhdWx0OlxuICAgICAgY29uc29sZS5lcnJvcignVW5rbm93biBwb3N0IG1lc3NhZ2UnLCBtc2cpO1xuICB9XG59O1xuXG4vLyBMaXN0ZW4gZm9yIG1lc3NhZ2VzIGZyb20gdGhlIFVJXG5maWdtYS51aS5vbignbWVzc2FnZScsIChlKSA9PiBoYW5kbGVSZWNlaXZlZE1zZyhlKSk7XG5cbmNvbnN0IG1haW4gPSAoKSA9PiB7XG4gIGNvbnN0IHsgY3VycmVudFBhZ2UgfSA9IGZpZ21hO1xuXG4gIC8vIEdldCBkZWZhdWx0IGZyYW1lcyBuYW1lc1xuICBjb25zdCBhbGxGcmFtZXMgPSBjdXJyZW50UGFnZS5jaGlsZHJlbi5maWx0ZXIoXG4gICAgKG5vZGUpID0+IG5vZGUudHlwZSA9PT0gJ0ZSQU1FJ1xuICApIGFzIEZyYW1lTm9kZVtdO1xuXG4gIGNvbnN0IGJyZWFrcG9pbnRzID0gT2JqZWN0LmtleXMoQlJFQUtQT0lOVFMpLm1hcCgobmFtZSkgPT5cbiAgICBuYW1lLnRvTG93ZXJDYXNlKClcbiAgKTtcbiAgY29uc3Qgc2VsZWN0ZWRGcmFtZXMgPSBhbGxGcmFtZXNcbiAgICAuZmlsdGVyKChmcmFtZSkgPT4gYnJlYWtwb2ludHMuaW5jbHVkZXMoZnJhbWUubmFtZS50b0xvd2VyQ2FzZSgpKSlcbiAgICAubWFwKChmcmFtZSkgPT4gZnJhbWUuaWQpO1xuXG4gIGlmIChhbGxGcmFtZXMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IGZyYW1lc0RhdGEgPSBhbGxGcmFtZXMubWFwKChmcmFtZSkgPT4ge1xuICAgICAgY29uc3QgeyBuYW1lLCB3aWR0aCwgaGVpZ2h0LCBpZCB9ID0gZnJhbWU7XG4gICAgICBjb25zdCB0ZXh0Tm9kZXMgPSBnZXRUZXh0Tm9kZXMoZnJhbWUpO1xuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBuYW1lLFxuICAgICAgICB3aWR0aCxcbiAgICAgICAgaGVpZ2h0LFxuICAgICAgICBpZCxcbiAgICAgICAgdGV4dE5vZGVzLFxuICAgICAgfTtcbiAgICB9KTtcblxuICAgIGZpZ21hLnVpLnBvc3RNZXNzYWdlKHtcbiAgICAgIHR5cGU6IE1TR19FVkVOVFMuRk9VTkRfRlJBTUVTLFxuICAgICAgZnJhbWVzOiBmcmFtZXNEYXRhLFxuICAgICAgc2VsZWN0ZWRGcmFtZXMsXG4gICAgfSk7XG5cbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAoYWxsRnJhbWVzLmxlbmd0aCA8IDEpIHtcbiAgICBjb25zb2xlLndhcm4oJ05vIGZyYW1lcycpO1xuICAgIGZpZ21hLnVpLnBvc3RNZXNzYWdlKHsgdHlwZTogTVNHX0VWRU5UUy5OT19GUkFNRVMgfSk7XG4gICAgcmV0dXJuO1xuICB9XG59O1xuXG4vLyBSZW5kZXIgdGhlIERPTVxuZmlnbWEuc2hvd1VJKF9faHRtbF9fKTtcbmZpZ21hLnVpLnJlc2l6ZSg2NDAsIDY0MCk7XG5cbmFzeW5jIGZ1bmN0aW9uIHJlbmRlckZyYW1lKGZyYW1lSWQ6IHN0cmluZykge1xuICBjb25zdCBmcmFtZSA9IGZpZ21hLmdldE5vZGVCeUlkKGZyYW1lSWQpO1xuICBpZiAoIWZyYW1lIHx8IGZyYW1lLnR5cGUgIT09ICdGUkFNRScpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01pc3NpbmcgZnJhbWUnKTtcbiAgfVxuXG4gIGNvbnN0IHN2Z1N0ciA9IGF3YWl0IGdldEZyYW1lU3ZnQXNTdHJpbmcoZnJhbWUpO1xuXG4gIHJldHVybiBzdmdTdHI7XG59XG5cbmV4cG9ydCB0eXBlIHRleHROb2RlU2VsZWN0ZWRQcm9wcyA9IFBpY2s8XG4gIFRleHROb2RlLFxuICAneCcgfCAneScgfCAnd2lkdGgnIHwgJ2hlaWdodCcgfCAnY2hhcmFjdGVycydcbj47XG5cbmV4cG9ydCBpbnRlcmZhY2UgdGV4dERhdGEgZXh0ZW5kcyB0ZXh0Tm9kZVNlbGVjdGVkUHJvcHMge1xuICBjb2xvdXI6IHsgcjogbnVtYmVyOyBnOiBudW1iZXI7IGI6IG51bWJlcjsgYTogbnVtYmVyIH07XG4gIGZvbnRTaXplOiBudW1iZXI7XG4gIGZvbnRGYW1pbHk6IHN0cmluZztcbn1cblxuLy8gRXh0cmFjdCBvYmplY3QgcHJvcGVydGllcyBmcm9tIHRleHROb2RlIGZvciBwYXNzaW5nIHZpYSBwb3N0TWVzc2FnZVxuZnVuY3Rpb24gZ2V0VGV4dE5vZGVzKGZyYW1lOiBGcmFtZU5vZGUpOiB0ZXh0RGF0YVtdIHtcbiAgY29uc3QgdGV4dE5vZGVzID0gZnJhbWUuZmluZEFsbCgoeyB0eXBlIH0pID0+IHR5cGUgPT09ICdURVhUJykgYXMgVGV4dE5vZGVbXTtcblxuICByZXR1cm4gdGV4dE5vZGVzLm1hcChcbiAgICAobm9kZSk6IHRleHREYXRhID0+IHtcbiAgICAgIGNvbnN0IHtcbiAgICAgICAgeCxcbiAgICAgICAgeSxcbiAgICAgICAgd2lkdGgsXG4gICAgICAgIGhlaWdodCxcbiAgICAgICAgZm9udFNpemU6IGZvbnRTaXplRGF0YSxcbiAgICAgICAgZm9udE5hbWUsXG4gICAgICAgIGZpbGxzLFxuICAgICAgICBjaGFyYWN0ZXJzLFxuICAgICAgfSA9IG5vZGU7XG5cbiAgICAgIC8vIEV4dHJhY3QgYmFzaWMgZmlsbCBjb2xvdXJcbiAgICAgIGNvbnN0IFtmaWxsXSA9IGZpbGxzO1xuICAgICAgbGV0IGNvbG91ciA9IHsgcjogMCwgZzogMCwgYjogMCwgYTogMSB9O1xuICAgICAgaWYgKGZpbGwudHlwZSA9PT0gJ1NPTElEJykge1xuICAgICAgICBjb2xvdXIgPSB7IC4uLmNvbG91ciwgYTogZmlsbC5vcGFjaXR5IHx8IDEgfTtcbiAgICAgIH1cblxuICAgICAgLy8gRXh0cmFjdCBmb250IGZhbWlseVxuICAgICAgbGV0IGZvbnRTaXplID0gMTY7XG4gICAgICBpZiAoZm9udFNpemVEYXRhICE9PSBmaWdtYS5taXhlZCkge1xuICAgICAgICBmb250U2l6ZSA9IGZvbnRTaXplRGF0YTtcbiAgICAgIH1cblxuICAgICAgLy8gRXh0cmFjdCBmb250IGZhbWlseVxuICAgICAgbGV0IGZvbnRGYW1pbHkgPSAnQXJpYWwnO1xuICAgICAgaWYgKGZvbnROYW1lICE9PSBmaWdtYS5taXhlZCkge1xuICAgICAgICBmb250RmFtaWx5ID0gZm9udE5hbWUuZmFtaWx5O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4geyB4LCB5LCB3aWR0aCwgaGVpZ2h0LCBmb250U2l6ZSwgZm9udEZhbWlseSwgY29sb3VyLCBjaGFyYWN0ZXJzIH07XG4gICAgfVxuICApO1xufVxuIl0sCiAgIm1h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
