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
        const {type, data, frameId} = msg;
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
            renderFrame(frameId).then(({frameId: frameId2, svgStr}) => {
              figma.ui.postMessage({
                type: MSG_EVENTS.RENDER,
                frameId: frameId2,
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
            figma.ui.resize(data, 400);
            break;
          default:
            console.error("Unknown post message", msg);
        }
      };
      figma.ui.on("message", (e) => handleReceivedMsg(e));
      const main = () => {
        const {currentPage} = figma;
        const allFrames = currentPage.findAll((node) => node.type === "FRAME");
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
        return {
          frameId,
          svgStr
        };
      }
      function getTextNodes(frame) {
        return frame.findAll(({type}) => type === "TEXT").map((node) => {
          if (node.type !== "TEXT") {
            return;
          }
          const {x, y, width, height, fontSize, fontName, fills, characters} = node;
          return {
            x,
            y,
            width,
            height,
            fontSize,
            fontName,
            fills,
            characters
          };
        });
      }
    }
  };
  return __require(1);
})();
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL2NvbnN0YW50cy50cyIsICJzcmMvaW5kZXgudHN4Il0sCiAgInNvdXJjZXNDb250ZW50IjogWyJleHBvcnQgdHlwZSBib2FyZCA9IHtcbiAgaWQ6IHN0cmluZztcbiAgd2lkdGg6IG51bWJlcjtcbiAgYnVmZmVyOiBVaW50OEFycmF5O1xufTtcblxuZXhwb3J0IGVudW0gU1RBR0VTIHtcbiAgQ0hPT1NFX0ZSQU1FUyxcbiAgUFJFVklFV19PVVRQVVQsXG4gIFNBVkVfT1VUUFVULFxufVxuXG5leHBvcnQgZW51bSBNU0dfRVZFTlRTIHtcbiAgRE9NX1JFQURZLFxuICBOT19GUkFNRVMsXG4gIEZPVU5EX0ZSQU1FUyxcbiAgUkVTSVpFLFxuICBSRU5ERVIsXG4gIENMT1NFLFxuICBFUlJPUixcbn1cblxuZXhwb3J0IGVudW0gQlJFQUtQT0lOVFMge1xuICBNb2JpbGUgPSAzNDAsXG4gIFRhYmxldCA9IDUyMCxcbiAgRGVza3RvcCA9IDEwMjQsXG59XG5cbmV4cG9ydCBlbnVtIE9VVFBVVF9GT1JNQVRTIHtcbiAgSU5MSU5FLFxuICBJRlJBTUUsXG59XG5cbmV4cG9ydCBjb25zdCBVSV9URVhUID0ge1xuICBFUlJPUl9VTkVYUEVDVEVEOiAnVW5leHBlY3RlZCBlcnJvcicsXG4gIEVSUk9SX01JU1NJTkdfRlJBTUVTOiAnTm8gZnJhbWVzIGZvdW5kLiBQbGVhc2UgYWRkIHNvbWUgZnJhbWVzIHRvIHRoZSBwYWdlLicsXG4gIFdBUk5fTk9fVEFSR0VUUzogJ1N0YW5kYXJkIGZyYW1lcyBub3QgZm91bmQuIFBsZWFzZSBzZWxlY3QgdGFyZ2V0IGZyYW1lcy4nLFxuICBXQVJOX1RPT19NQU5ZX1RBUkdFVFM6ICdQbGVhc2Ugc2VsZWN0IHRocmVlIHRhcmdldCBmcmFtZXMnLFxuICBJTkZPX1BSRVZJRVc6ICdQcmV2aWV3IGVhY2ggZnJhbWUgb3V0cHV0JyxcbiAgVElUTEVfQ0hPT1NFX0ZSQU1FOiAnQ2hvb3NlIHdoaWNoIGZyYW1lcyB0byBleHBvcnQnLFxuICBUSVRMRV9QUkVWSUVXOiAnUHJldmlldycsXG4gIFRJTEVfT1VUUFVUOiAnRXhwb3J0JyxcbiAgQlVUVE9OX05FWFQ6ICdOZXh0JyxcbiAgQlVUVE9OX0RPV05MT0FEOiAnRG93bmxvYWQnLFxuICBCVVRUT05fUFJFVklPVVM6ICdCYWNrJyxcbn07XG4iLCAiaW1wb3J0IHsgQlJFQUtQT0lOVFMsIE1TR19FVkVOVFMgfSBmcm9tICcuL2NvbnN0YW50cyc7XG5cbmFzeW5jIGZ1bmN0aW9uIGdldEZyYW1lU3ZnQXNTdHJpbmcoZnJhbWU6IFNjZW5lTm9kZSk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IHN2Z0J1ZmYgPSBhd2FpdCBmcmFtZS5leHBvcnRBc3luYyh7XG4gICAgZm9ybWF0OiAnU1ZHJyxcbiAgICBzdmdPdXRsaW5lVGV4dDogZmFsc2UsXG4gICAgc3ZnU2ltcGxpZnlTdHJva2U6IHRydWUsXG4gIH0pO1xuXG4gIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KG51bGwsIEFycmF5LmZyb20oc3ZnQnVmZikpO1xufVxuXG5jb25zdCBoYW5kbGVSZWNlaXZlZE1zZyA9IChtc2c6IE1TR19FVkVOVFMpID0+IHtcbiAgY29uc3QgeyB0eXBlLCBkYXRhLCBmcmFtZUlkIH0gPSBtc2c7XG5cbiAgc3dpdGNoICh0eXBlKSB7XG4gICAgY2FzZSBNU0dfRVZFTlRTLkVSUk9SOlxuICAgICAgY29uc29sZS5sb2coJ3BsdWdpbiBtc2c6IGVycm9yJyk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgTVNHX0VWRU5UUy5DTE9TRTpcbiAgICAgIGNvbnNvbGUubG9nKCdwbHVnaW4gbXNnOiBjbG9zZScpO1xuICAgICAgZmlnbWEuY2xvc2VQbHVnaW4oKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSBNU0dfRVZFTlRTLkRPTV9SRUFEWTpcbiAgICAgIGNvbnNvbGUubG9nKCdwbHVnaW4gbXNnOiBET00gUkVBRFknKTtcbiAgICAgIG1haW4oKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSBNU0dfRVZFTlRTLlJFTkRFUjpcbiAgICAgIGNvbnNvbGUubG9nKCdwbHVnaW4gbXNnOiByZW5kZXInLCBmcmFtZUlkKTtcbiAgICAgIHJlbmRlckZyYW1lKGZyYW1lSWQpXG4gICAgICAgIC50aGVuKCh7IGZyYW1lSWQsIHN2Z1N0ciB9KSA9PiB7XG4gICAgICAgICAgZmlnbWEudWkucG9zdE1lc3NhZ2Uoe1xuICAgICAgICAgICAgdHlwZTogTVNHX0VWRU5UUy5SRU5ERVIsXG4gICAgICAgICAgICBmcmFtZUlkLFxuICAgICAgICAgICAgc3ZnU3RyLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgIGZpZ21hLnVpLnBvc3RNZXNzYWdlKHtcbiAgICAgICAgICAgIHR5cGU6IE1TR19FVkVOVFMuRVJST1IsXG4gICAgICAgICAgICBlcnJvclRleHQ6IGBSZW5kZXIgZmFpbGVkOiAke2VyciA/PyBlcnIubWVzc2FnZX1gLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSBNU0dfRVZFTlRTLlJFU0laRTpcbiAgICAgIGNvbnNvbGUubG9nKCdwbHVnaW4gbXNnOiByZXNpemUnKTtcbiAgICAgIGZpZ21hLnVpLnJlc2l6ZShkYXRhLCA0MDApO1xuICAgICAgYnJlYWs7XG5cbiAgICBkZWZhdWx0OlxuICAgICAgY29uc29sZS5lcnJvcignVW5rbm93biBwb3N0IG1lc3NhZ2UnLCBtc2cpO1xuICB9XG59O1xuXG5maWdtYS51aS5vbignbWVzc2FnZScsIChlKSA9PiBoYW5kbGVSZWNlaXZlZE1zZyhlKSk7XG5cbmNvbnN0IG1haW4gPSAoKSA9PiB7XG4gIGNvbnN0IHsgY3VycmVudFBhZ2UgfSA9IGZpZ21hO1xuXG4gIC8vIEdldCBkZWZhdWx0IGZyYW1lcyBuYW1lc1xuICBjb25zdCBhbGxGcmFtZXMgPSBjdXJyZW50UGFnZS5maW5kQWxsKFxuICAgIChub2RlKSA9PiBub2RlLnR5cGUgPT09ICdGUkFNRSdcbiAgKSBhcyBGcmFtZU5vZGVbXTtcblxuICBjb25zdCBicmVha3BvaW50cyA9IE9iamVjdC5rZXlzKEJSRUFLUE9JTlRTKS5tYXAoKG5hbWUpID0+XG4gICAgbmFtZS50b0xvd2VyQ2FzZSgpXG4gICk7XG4gIGNvbnN0IHNlbGVjdGVkRnJhbWVzID0gYWxsRnJhbWVzXG4gICAgLmZpbHRlcigoZnJhbWUpID0+IGJyZWFrcG9pbnRzLmluY2x1ZGVzKGZyYW1lLm5hbWUudG9Mb3dlckNhc2UoKSkpXG4gICAgLm1hcCgoZnJhbWUpID0+IGZyYW1lLmlkKTtcblxuICBpZiAoYWxsRnJhbWVzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBmcmFtZXNEYXRhID0gYWxsRnJhbWVzLm1hcCgoZnJhbWUpID0+IHtcbiAgICAgIGNvbnN0IHsgbmFtZSwgd2lkdGgsIGhlaWdodCwgaWQgfSA9IGZyYW1lO1xuICAgICAgY29uc3QgdGV4dE5vZGVzID0gZ2V0VGV4dE5vZGVzKGZyYW1lKTtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbmFtZSxcbiAgICAgICAgd2lkdGgsXG4gICAgICAgIGhlaWdodCxcbiAgICAgICAgaWQsXG4gICAgICAgIHRleHROb2RlcyxcbiAgICAgIH07XG4gICAgfSk7XG5cbiAgICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7XG4gICAgICB0eXBlOiBNU0dfRVZFTlRTLkZPVU5EX0ZSQU1FUyxcbiAgICAgIGZyYW1lczogZnJhbWVzRGF0YSxcbiAgICAgIHNlbGVjdGVkRnJhbWVzLFxuICAgIH0pO1xuXG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKGFsbEZyYW1lcy5sZW5ndGggPCAxKSB7XG4gICAgY29uc29sZS53YXJuKCdObyBmcmFtZXMnKTtcbiAgICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7IHR5cGU6IE1TR19FVkVOVFMuTk9fRlJBTUVTIH0pO1xuICAgIHJldHVybjtcbiAgfVxufTtcblxuLy8gUmVuZGVyIHRoZSBET01cbmZpZ21hLnNob3dVSShfX2h0bWxfXyk7XG5maWdtYS51aS5yZXNpemUoNjQwLCA2NDApO1xuXG5hc3luYyBmdW5jdGlvbiByZW5kZXJGcmFtZShmcmFtZUlkOiBzdHJpbmcpIHtcbiAgY29uc3QgZnJhbWUgPSBmaWdtYS5nZXROb2RlQnlJZChmcmFtZUlkKTtcbiAgaWYgKCFmcmFtZSB8fCBmcmFtZS50eXBlICE9PSAnRlJBTUUnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIGZyYW1lJyk7XG4gIH1cblxuICBjb25zdCBzdmdTdHIgPSBhd2FpdCBnZXRGcmFtZVN2Z0FzU3RyaW5nKGZyYW1lKTtcblxuICByZXR1cm4geyBmcmFtZUlkLCBzdmdTdHIgfTtcbn1cblxuZnVuY3Rpb24gZ2V0VGV4dE5vZGVzKGZyYW1lOiBGcmFtZU5vZGUpIHtcbiAgcmV0dXJuIGZyYW1lXG4gICAgLmZpbmRBbGwoKHsgdHlwZSB9KSA9PiB0eXBlID09PSAnVEVYVCcpXG4gICAgLm1hcCgobm9kZSkgPT4ge1xuICAgICAgaWYgKG5vZGUudHlwZSAhPT0gJ1RFWFQnKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgY29uc3Qge1xuICAgICAgICB4LFxuICAgICAgICB5LFxuICAgICAgICB3aWR0aCxcbiAgICAgICAgaGVpZ2h0LFxuICAgICAgICBmb250U2l6ZSxcbiAgICAgICAgZm9udE5hbWUsXG4gICAgICAgIGZpbGxzLFxuICAgICAgICBjaGFyYWN0ZXJzLFxuICAgICAgfSA9IG5vZGU7XG5cbiAgICAgIHJldHVybiB7IHgsIHksIHdpZHRoLCBoZWlnaHQsIGZvbnRTaXplLCBmb250TmFtZSwgZmlsbHMsIGNoYXJhY3RlcnMgfTtcbiAgICB9KTtcbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLEFBTU8sVUFBSztBQUFMLGdCQUFLO0FBQ1Y7QUFDQTtBQUNBO1NBSFU7QUFNTCxVQUFLO0FBQUwsZ0JBQUs7QUFDVjtBQUNBO0FBQ0E7QUFD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
