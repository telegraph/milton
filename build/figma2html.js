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
        STAGES2[STAGES2["RESPONSIVE_PREVIEW"] = 2] = "RESPONSIVE_PREVIEW";
        STAGES2[STAGES2["SAVE_OUTPUT"] = 3] = "SAVE_OUTPUT";
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
        TITLE_RESPONSIVE_PREVIEW: "Responsive preview",
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
      const FRAME_WARNING_SIZE = 300;

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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL2NvbnN0YW50cy50cyIsICJzcmMvaW5kZXgudHN4Il0sCiAgInNvdXJjZXNDb250ZW50IjogWyJleHBvcnQgdHlwZSBib2FyZCA9IHtcbiAgaWQ6IHN0cmluZztcbiAgd2lkdGg6IG51bWJlcjtcbiAgYnVmZmVyOiBVaW50OEFycmF5O1xufTtcblxuZXhwb3J0IGVudW0gU1RBR0VTIHtcbiAgQ0hPT1NFX0ZSQU1FUyxcbiAgUFJFVklFV19PVVRQVVQsXG4gIFJFU1BPTlNJVkVfUFJFVklFVyxcbiAgU0FWRV9PVVRQVVQsXG59XG5cbmV4cG9ydCBlbnVtIE1TR19FVkVOVFMge1xuICBET01fUkVBRFksXG4gIE5PX0ZSQU1FUyxcbiAgRk9VTkRfRlJBTUVTLFxuICBSRVNJWkUsXG4gIFJFTkRFUixcbiAgQ0xPU0UsXG4gIEVSUk9SLFxufVxuXG5leHBvcnQgZW51bSBCUkVBS1BPSU5UUyB7XG4gIE1vYmlsZSA9IDM0MCxcbiAgVGFibGV0ID0gNTIwLFxuICBEZXNrdG9wID0gMTAyNCxcbn1cblxuZXhwb3J0IGVudW0gT1VUUFVUX0ZPUk1BVFMge1xuICBJTkxJTkUsXG4gIElGUkFNRSxcbn1cblxuZXhwb3J0IGNvbnN0IFVJX1RFWFQgPSB7XG4gIEVSUk9SX1VORVhQRUNURUQ6ICdVbmV4cGVjdGVkIGVycm9yJyxcbiAgRVJST1JfTUlTU0lOR19GUkFNRVM6ICdObyBmcmFtZXMgZm91bmQuIFBsZWFzZSBhZGQgc29tZSBmcmFtZXMgdG8gdGhlIHBhZ2UuJyxcbiAgV0FSTl9OT19UQVJHRVRTOiAnU3RhbmRhcmQgZnJhbWVzIG5vdCBmb3VuZC4gUGxlYXNlIHNlbGVjdCB0YXJnZXQgZnJhbWVzLicsXG4gIFdBUk5fVE9PX01BTllfVEFSR0VUUzogJ1BsZWFzZSBzZWxlY3QgdGhyZWUgdGFyZ2V0IGZyYW1lcycsXG4gIElORk9fUFJFVklFVzogJ1ByZXZpZXcgZWFjaCBmcmFtZSBvdXRwdXQnLFxuICBUSVRMRV9DSE9PU0VfRlJBTUU6ICdDaG9vc2Ugd2hpY2ggZnJhbWVzIHRvIGV4cG9ydCcsXG4gIFRJVExFX1BSRVZJRVc6ICdQcmV2aWV3JyxcbiAgVElUTEVfUkVTUE9OU0lWRV9QUkVWSUVXOiAnUmVzcG9uc2l2ZSBwcmV2aWV3JyxcbiAgVElMRV9PVVRQVVQ6ICdFeHBvcnQnLFxuICBCVVRUT05fTkVYVDogJ05leHQnLFxuICBCVVRUT05fRE9XTkxPQUQ6ICdEb3dubG9hZCcsXG4gIEJVVFRPTl9QUkVWSU9VUzogJ0JhY2snLFxufTtcblxuZXhwb3J0IGNvbnN0IElOSVRJQUxfVUlfU0laRSA9IHtcbiAgd2lkdGg6IDQ4MCxcbiAgaGVpZ2h0OiA1MDAsXG4gIG1heFdpZHRoOiAxMjAwLFxuICBtYXhIZWlnaHQ6IDkwMCxcbiAgbWluV2lkdGg6IDQyMCxcbiAgbWluSGVpZ2h0OiA0ODAsXG59O1xuXG5leHBvcnQgY29uc3QgRlJBTUVfV0FSTklOR19TSVpFID0gMzAwO1xuIiwgImltcG9ydCB7IEJSRUFLUE9JTlRTLCBNU0dfRVZFTlRTLCBJTklUSUFMX1VJX1NJWkUgfSBmcm9tICcuL2NvbnN0YW50cyc7XG5cbi8vIEdlbmVyYXRlIGEgdW5pcXVlIGlkIHByZWZpeGVkIHdpdGggaWRlbnRpZmVyIHN0cmluZyBmb3Igc2FmZSB1c2UgYXMgSFRNTCBJRFxuLy8gTm90ZTogRmlnbWEgc2VlbXMgdG8gc3R1YiAudG9TdHJpbmcgZm9yIHNlY3VyaXR5P1xuZnVuY3Rpb24gZ2VuUmFuZG9tVWlkKCkge1xuICBjb25zdCBybmQgPSBNYXRoLnJhbmRvbSgpO1xuICBjb25zdCB1aWQgPSBybmQudG9TdHJpbmcoKS5zdWJzdHIoMik7XG4gIHJldHVybiBgZjJoLSR7dWlkfWA7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGdldEZyYW1lU3ZnQXNTdHJpbmcoZnJhbWU6IFNjZW5lTm9kZSk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IHN2Z0J1ZmYgPSBhd2FpdCBmcmFtZS5leHBvcnRBc3luYyh7XG4gICAgZm9ybWF0OiAnU1ZHJyxcbiAgICBzdmdPdXRsaW5lVGV4dDogZmFsc2UsXG4gICAgc3ZnU2ltcGxpZnlTdHJva2U6IHRydWUsXG4gIH0pO1xuXG4gIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KG51bGwsIEFycmF5LmZyb20oc3ZnQnVmZikpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBvc3RNc2cge1xuICB0eXBlOiBNU0dfRVZFTlRTO1xuICBmcmFtZUlkOiBzdHJpbmc7XG4gIHdpZHRoOiBudW1iZXI7XG4gIGhlaWdodDogbnVtYmVyO1xufVxuLy8gSGFuZGxlIG1lc3NhZ2VzIGZyb20gdGhlIFVJXG5jb25zdCBoYW5kbGVSZWNlaXZlZE1zZyA9IChtc2c6IFBvc3RNc2cpID0+IHtcbiAgY29uc3QgeyB0eXBlLCB3aWR0aCwgaGVpZ2h0LCBmcmFtZUlkIH0gPSBtc2c7XG5cbiAgc3dpdGNoICh0eXBlKSB7XG4gICAgY2FzZSBNU0dfRVZFTlRTLkVSUk9SOlxuICAgICAgY29uc29sZS5sb2coJ3BsdWdpbiBtc2c6IGVycm9yJyk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgTVNHX0VWRU5UUy5DTE9TRTpcbiAgICAgIGNvbnNvbGUubG9nKCdwbHVnaW4gbXNnOiBjbG9zZScpO1xuICAgICAgZmlnbWEuY2xvc2VQbHVnaW4oKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSBNU0dfRVZFTlRTLkRPTV9SRUFEWTpcbiAgICAgIGNvbnNvbGUubG9nKCdwbHVnaW4gbXNnOiBET00gUkVBRFknKTtcbiAgICAgIG1haW4oKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSBNU0dfRVZFTlRTLlJFTkRFUjpcbiAgICAgIGNvbnNvbGUubG9nKCdwbHVnaW4gbXNnOiByZW5kZXInLCBmcmFtZUlkKTtcbiAgICAgIHJlbmRlckZyYW1lKGZyYW1lSWQpXG4gICAgICAgIC50aGVuKChzdmdTdHIpID0+IHtcbiAgICAgICAgICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7XG4gICAgICAgICAgICB0eXBlOiBNU0dfRVZFTlRTLlJFTkRFUixcbiAgICAgICAgICAgIGZyYW1lSWQsXG4gICAgICAgICAgICBzdmdTdHIsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgZmlnbWEudWkucG9zdE1lc3NhZ2Uoe1xuICAgICAgICAgICAgdHlwZTogTVNHX0VWRU5UUy5FUlJPUixcbiAgICAgICAgICAgIGVycm9yVGV4dDogYFJlbmRlciBmYWlsZWQ6ICR7ZXJyID8/IGVyci5tZXNzYWdlfWAsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIE1TR19FVkVOVFMuUkVTSVpFOlxuICAgICAgY29uc29sZS5sb2coJ3BsdWdpbiBtc2c6IHJlc2l6ZScpO1xuICAgICAgZmlnbWEudWkucmVzaXplKHdpZHRoLCBoZWlnaHQpO1xuICAgICAgYnJlYWs7XG5cbiAgICBkZWZhdWx0OlxuICAgICAgY29uc29sZS5lcnJvcignVW5rbm93biBwb3N0IG1lc3NhZ2UnLCBtc2cpO1xuICB9XG59O1xuXG4vLyBMaXN0ZW4gZm9yIG1lc3NhZ2VzIGZyb20gdGhlIFVJXG5maWdtYS51aS5vbignbWVzc2FnZScsIChlKSA9PiBoYW5kbGVSZWNlaXZlZE1zZyhlKSk7XG5cbmNvbnN0IG1haW4gPSAoKSA9PiB7XG4gIGNvbnN0IHsgY3VycmVudFBhZ2UgfSA9IGZpZ21hO1xuXG4gIC8vIEdldCBkZWZhdWx0IGZyYW1lcyBuYW1lc1xuICBjb25zdCBhbGxGcmFtZXMgPSBjdXJyZW50UGFnZS5jaGlsZHJlbi5maWx0ZXIoXG4gICAgKG5vZGUpID0+IG5vZGUudHlwZSA9PT0gJ0ZSQU1FJ1xuICApIGFzIEZyYW1lTm9kZVtdO1xuXG4gIGNvbnN0IGJyZWFrcG9pbnRzID0gT2JqZWN0LmtleXMoQlJFQUtQT0lOVFMpLm1hcCgobmFtZSkgPT5cbiAgICBuYW1lLnRvTG93ZXJDYXNlKClcbiAgKTtcbiAgY29uc3Qgc2VsZWN0ZWRGcmFtZXMgPSBhbGxGcmFtZXNcbiAgICAuZmlsdGVyKChmcmFtZSkgPT4gYnJlYWtwb2ludHMuaW5jbHVkZXMoZnJhbWUubmFtZS50b0xvd2VyQ2FzZSgpKSlcbiAgICAubWFwKChmcmFtZSkgPT4gZnJhbWUuaWQpO1xuXG4gIGlmIChhbGxGcmFtZXMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IGZyYW1lc0RhdGEgPSBhbGxGcmFtZXMubWFwKChmcmFtZSkgPT4ge1xuICAgICAgY29uc3QgeyBuYW1lLCB3aWR0aCwgaGVpZ2h0LCBpZCB9ID0gZnJhbWU7XG4gICAgICBjb25zdCB0ZXh0Tm9kZXMgPSBnZXRUZXh0Tm9kZXMoZnJhbWUpO1xuICAgICAgY29uc3QgdWlkID0gZ2VuUmFuZG9tVWlkKCk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBuYW1lLFxuICAgICAgICB3aWR0aCxcbiAgICAgICAgaGVpZ2h0LFxuICAgICAgICBpZCxcbiAgICAgICAgdGV4dE5vZGVzLFxuICAgICAgICB1aWQsXG4gICAgICB9O1xuICAgIH0pO1xuXG4gICAgZmlnbWEudWkucG9zdE1lc3NhZ2Uoe1xuICAgICAgdHlwZTogTVNHX0VWRU5UUy5GT1VORF9GUkFNRVMsXG4gICAgICBmcmFtZXM6IGZyYW1lc0RhdGEsXG4gICAgICBzZWxlY3RlZEZyYW1lcyxcbiAgICB9KTtcblxuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmIChhbGxGcmFtZXMubGVuZ3RoIDwgMSkge1xuICAgIGNvbnNvbGUud2FybignTm8gZnJhbWVzJyk7XG4gICAgZmlnbWEudWkucG9zdE1lc3NhZ2UoeyB0eXBlOiBNU0dfRVZFTlRTLk5PX0ZSQU1FUyB9KTtcbiAgICByZXR1cm47XG4gIH1cbn07XG5cbi8vIFJlbmRlciB0aGUgRE9NXG5maWdtYS5zaG93VUkoX19odG1sX18pO1xuZmlnbWEudWkucmVzaXplKElOSVRJQUxfVUlfU0laRS53aWR0aCwgSU5JVElBTF9VSV9TSVpFLmhlaWdodCk7XG5cbmFzeW5jIGZ1bmN0aW9uIHJlbmRlckZyYW1lKGZyYW1lSWQ6IHN0cmluZykge1xuICBjb25zdCBmcmFtZSA9IGZpZ21hLmdldE5vZGVCeUlkKGZyYW1lSWQpO1xuICBpZiAoIWZyYW1lIHx8IGZyYW1lLnR5cGUgIT09ICdGUkFNRScpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01pc3NpbmcgZnJhbWUnKTtcbiAgfVxuXG4gIGNvbnN0IHN2Z1N0ciA9IGF3YWl0IGdldEZyYW1lU3ZnQXNTdHJpbmcoZnJhbWUpO1xuXG4gIHJldHVybiBzdmdTdHI7XG59XG5cbmV4cG9ydCB0eXBlIHRleHROb2RlU2VsZWN0ZWRQcm9wcyA9IFBpY2s8XG4gIFRleHROb2RlLFxuICAneCcgfCAneScgfCAnd2lkdGgnIHwgJ2hlaWdodCcgfCAnY2hhcmFjdGVycydcbj47XG5cbmV4cG9ydCBpbnRlcmZhY2UgdGV4dERhdGEgZXh0ZW5kcyB0ZXh0Tm9kZVNlbGVjdGVkUHJvcHMge1xuICBjb2xvdXI6IHsgcjogbnVtYmVyOyBnOiBudW1iZXI7IGI6IG51bWJlcjsgYTogbnVtYmVyIH07XG4gIGZvbnRTaXplOiBudW1iZXI7XG4gIGZvbnRGYW1pbHk6IHN0cmluZztcbn1cblxuLy8gRXh0cmFjdCBvYmplY3QgcHJvcGVydGllcyBmcm9tIHRleHROb2RlIGZvciBwYXNzaW5nIHZpYSBwb3N0TWVzc2FnZVxuZnVuY3Rpb24gZ2V0VGV4dE5vZGVzKGZyYW1lOiBGcmFtZU5vZGUpOiB0ZXh0RGF0YVtdIHtcbiAgY29uc3QgdGV4dE5vZGVzID0gZnJhbWUuZmluZEFsbCgoeyB0eXBlIH0pID0+IHR5cGUgPT09ICdURVhUJykgYXMgVGV4dE5vZGVbXTtcblxuICByZXR1cm4gdGV4dE5vZGVzLm1hcChcbiAgICAobm9kZSk6IHRleHREYXRhID0+IHtcbiAgICAgIGNvbnN0IHtcbiAgICAgICAgeCxcbiAgICAgICAgeSxcbiAgICAgICAgd2lkdGgsXG4gICAgICAgIGhlaWdodCxcbiAgICAgICAgZm9udFNpemU6IGZvbnRTaXplRGF0YSxcbiAgICAgICAgZm9udE5hbWUsXG4gICAgICAgIGZpbGxzLFxuICAgICAgICBjaGFyYWN0ZXJzLFxuICAgICAgfSA9IG5vZGU7XG5cbiAgICAgIC8vIEV4dHJhY3QgYmFzaWMgZmlsbCBjb2xvdXJcbiAgICAgIGNvbnN0IFtmaWxsXSA9IGZpbGxzO1xuICAgICAgbGV0IGNvbG91ciA9IHsgcjogMCwgZzogMCwgYjogMCwgYTogMSB9O1xuICAgICAgaWYgKGZpbGwudHlwZSA9PT0gJ1NPTElEJykge1xuICAgICAgICBjb2xvdXIgPSB7IC4uLmNvbG91ciwgYTogZmlsbC5vcGFjaXR5IHx8IDEgfTtcbiAgICAgIH1cblxuICAgICAgLy8gRXh0cmFjdCBmb250IGZhbWlseVxuICAgICAgbGV0IGZvbnRTaXplID0gMTY7XG4gICAgICBpZiAoZm9udFNpemVEYXRhICE9PSBmaWdtYS5taXhlZCkge1xuICAgICAgICBmb250U2l6ZSA9IGZvbnRTaXplRGF0YTtcbiAgICAgIH1cblxuICAgICAgLy8gRXh0cmFjdCBmb250IGZhbWlseVxuICAgICAgbGV0IGZvbnRGYW1pbHkgPSAnQXJpYWwnO1xuICAgICAgaWYgKGZvbnROYW1lICE9PSBmaWdtYS5taXhlZCkge1xuICAgICAgICBmb250RmFtaWx5ID0gZm9udE5hbWUuZmFtaWx5O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4geyB4LCB5LCB3aWR0aCwgaGVpZ2h0LCBmb250U2l6ZSwgZm9udEZhbWlseSwgY29sb3VyLCBjaGFyYWN0ZXJzIH07XG4gICAgfVxuICApO1xufVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLEFBTU8sVUFBSztBQUFMLGdCQUFLO0FBQ1Y7QUFDQTtBQUNBO0FBQ0E7U0FKVTtBQU9MLFVBQUs7QUFBTCxnQkFBSztBQUNWO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO1NBUFU7QUFVTCxVQUFLO0FBQUwsZ0JBQUs7QUFDViw4Q0FBUyxPQUFUO0FBQ0EsOENBQVMsT0FBVDtBQUNBLCtDQUFVLFFBQVY7U0FIVTtBQU1MLFVBQUs7QUFBTCxnQkFBSztB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
