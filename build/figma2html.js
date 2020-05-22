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
        if (allFrames.length > 0) {
          const framesData = {};
          allFrames.forEach((frame) => {
            const {name, width, height, id} = frame;
            const textNodes = getTextNodes(frame);
            const isSelected = breakpoints.includes(id);
            const uid = genRandomUid();
            framesData[id] = {
              name,
              width,
              height,
              id,
              textNodes,
              uid,
              responsive: false,
              selected: isSelected
            };
          });
          figma.ui.postMessage({
            type: MSG_EVENTS.FOUND_FRAMES,
            frames: framesData
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL2NvbnN0YW50cy50cyIsICJzcmMvaW5kZXgudHN4Il0sCiAgInNvdXJjZXNDb250ZW50IjogWyJleHBvcnQgdHlwZSBib2FyZCA9IHtcbiAgaWQ6IHN0cmluZztcbiAgd2lkdGg6IG51bWJlcjtcbiAgYnVmZmVyOiBVaW50OEFycmF5O1xufTtcblxuZXhwb3J0IGVudW0gU1RBR0VTIHtcbiAgQ0hPT1NFX0ZSQU1FUyxcbiAgUFJFVklFV19PVVRQVVQsXG4gIFJFU1BPTlNJVkVfUFJFVklFVyxcbiAgU0FWRV9PVVRQVVQsXG59XG5cbmV4cG9ydCBlbnVtIE1TR19FVkVOVFMge1xuICBET01fUkVBRFksXG4gIE5PX0ZSQU1FUyxcbiAgRk9VTkRfRlJBTUVTLFxuICBSRVNJWkUsXG4gIFJFTkRFUixcbiAgQ0xPU0UsXG4gIEVSUk9SLFxufVxuXG5leHBvcnQgZW51bSBCUkVBS1BPSU5UUyB7XG4gIE1vYmlsZSA9IDM0MCxcbiAgVGFibGV0ID0gNTIwLFxuICBEZXNrdG9wID0gMTAyNCxcbn1cblxuZXhwb3J0IGVudW0gT1VUUFVUX0ZPUk1BVFMge1xuICBJTkxJTkUsXG4gIElGUkFNRSxcbn1cblxuZXhwb3J0IGNvbnN0IFVJX1RFWFQgPSB7XG4gIEVSUk9SX1VORVhQRUNURUQ6ICdVbmV4cGVjdGVkIGVycm9yJyxcbiAgRVJST1JfTUlTU0lOR19GUkFNRVM6ICdObyBmcmFtZXMgZm91bmQuIFBsZWFzZSBhZGQgc29tZSBmcmFtZXMgdG8gdGhlIHBhZ2UuJyxcbiAgV0FSTl9OT19UQVJHRVRTOiAnU3RhbmRhcmQgZnJhbWVzIG5vdCBmb3VuZC4gUGxlYXNlIHNlbGVjdCB0YXJnZXQgZnJhbWVzLicsXG4gIFdBUk5fVE9PX01BTllfVEFSR0VUUzogJ1BsZWFzZSBzZWxlY3QgdGhyZWUgdGFyZ2V0IGZyYW1lcycsXG4gIElORk9fUFJFVklFVzogJ1ByZXZpZXcgZWFjaCBmcmFtZSBvdXRwdXQnLFxuICBUSVRMRV9DSE9PU0VfRlJBTUU6ICdDaG9vc2Ugd2hpY2ggZnJhbWVzIHRvIGV4cG9ydCcsXG4gIFRJVExFX1BSRVZJRVc6ICdQcmV2aWV3JyxcbiAgVElUTEVfUkVTUE9OU0lWRV9QUkVWSUVXOiAnUmVzcG9uc2l2ZSBwcmV2aWV3JyxcbiAgVElMRV9PVVRQVVQ6ICdFeHBvcnQnLFxuICBCVVRUT05fTkVYVDogJ05leHQnLFxuICBCVVRUT05fRE9XTkxPQUQ6ICdEb3dubG9hZCcsXG4gIEJVVFRPTl9QUkVWSU9VUzogJ0JhY2snLFxufTtcblxuZXhwb3J0IGNvbnN0IElOSVRJQUxfVUlfU0laRSA9IHtcbiAgd2lkdGg6IDQ4MCxcbiAgaGVpZ2h0OiA1MDAsXG4gIG1heFdpZHRoOiAxMjAwLFxuICBtYXhIZWlnaHQ6IDkwMCxcbiAgbWluV2lkdGg6IDQyMCxcbiAgbWluSGVpZ2h0OiA0ODAsXG59O1xuXG5leHBvcnQgY29uc3QgRlJBTUVfV0FSTklOR19TSVpFID0gMzAwO1xuIiwgImltcG9ydCB7IEJSRUFLUE9JTlRTLCBNU0dfRVZFTlRTLCBJTklUSUFMX1VJX1NJWkUgfSBmcm9tICcuL2NvbnN0YW50cyc7XG5pbXBvcnQge1xuICBNc2dGcmFtZXNUeXBlLFxuICBNc2dOb0ZyYW1lc1R5cGUsXG4gIE1zZ1JlbmRlclR5cGUsXG4gIE1zZ0Vycm9yVHlwZSxcbiAgRnJhbWVEYXRhVHlwZSxcbn0gZnJvbSAnLi91aSc7XG5cbi8vIEdlbmVyYXRlIGEgdW5pcXVlIGlkIHByZWZpeGVkIHdpdGggaWRlbnRpZmVyIHN0cmluZyBmb3Igc2FmZSB1c2UgYXMgSFRNTCBJRFxuLy8gTm90ZTogRmlnbWEgc2VlbXMgdG8gc3R1YiAudG9TdHJpbmcgZm9yIHNlY3VyaXR5P1xuZnVuY3Rpb24gZ2VuUmFuZG9tVWlkKCkge1xuICBjb25zdCBybmQgPSBNYXRoLnJhbmRvbSgpO1xuICBjb25zdCB1aWQgPSBybmQudG9TdHJpbmcoKS5zdWJzdHIoMik7XG4gIHJldHVybiBgZjJoLSR7dWlkfWA7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGdldEZyYW1lU3ZnQXNTdHJpbmcoZnJhbWU6IFNjZW5lTm9kZSk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IHN2Z0J1ZmYgPSBhd2FpdCBmcmFtZS5leHBvcnRBc3luYyh7XG4gICAgZm9ybWF0OiAnU1ZHJyxcbiAgICBzdmdPdXRsaW5lVGV4dDogZmFsc2UsXG4gICAgc3ZnU2ltcGxpZnlTdHJva2U6IHRydWUsXG4gIH0pO1xuXG4gIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KG51bGwsIEFycmF5LmZyb20oc3ZnQnVmZikpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBvc3RNc2cge1xuICB0eXBlOiBNU0dfRVZFTlRTO1xuICBmcmFtZUlkOiBzdHJpbmc7XG4gIHdpZHRoOiBudW1iZXI7XG4gIGhlaWdodDogbnVtYmVyO1xufVxuLy8gSGFuZGxlIG1lc3NhZ2VzIGZyb20gdGhlIFVJXG5jb25zdCBoYW5kbGVSZWNlaXZlZE1zZyA9IChtc2c6IFBvc3RNc2cpID0+IHtcbiAgY29uc3QgeyB0eXBlLCB3aWR0aCwgaGVpZ2h0LCBmcmFtZUlkIH0gPSBtc2c7XG5cbiAgc3dpdGNoICh0eXBlKSB7XG4gICAgY2FzZSBNU0dfRVZFTlRTLkVSUk9SOlxuICAgICAgY29uc29sZS5sb2coJ3BsdWdpbiBtc2c6IGVycm9yJyk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgTVNHX0VWRU5UUy5DTE9TRTpcbiAgICAgIGNvbnNvbGUubG9nKCdwbHVnaW4gbXNnOiBjbG9zZScpO1xuICAgICAgZmlnbWEuY2xvc2VQbHVnaW4oKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSBNU0dfRVZFTlRTLkRPTV9SRUFEWTpcbiAgICAgIGNvbnNvbGUubG9nKCdwbHVnaW4gbXNnOiBET00gUkVBRFknKTtcbiAgICAgIG1haW4oKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSBNU0dfRVZFTlRTLlJFTkRFUjpcbiAgICAgIGNvbnNvbGUubG9nKCdwbHVnaW4gbXNnOiByZW5kZXInLCBmcmFtZUlkKTtcbiAgICAgIHJlbmRlckZyYW1lKGZyYW1lSWQpXG4gICAgICAgIC50aGVuKChzdmdTdHIpID0+IHtcbiAgICAgICAgICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7XG4gICAgICAgICAgICB0eXBlOiBNU0dfRVZFTlRTLlJFTkRFUixcbiAgICAgICAgICAgIGZyYW1lSWQsXG4gICAgICAgICAgICBzdmdTdHIsXG4gICAgICAgICAgfSBhcyBNc2dSZW5kZXJUeXBlKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7XG4gICAgICAgICAgICB0eXBlOiBNU0dfRVZFTlRTLkVSUk9SLFxuICAgICAgICAgICAgZXJyb3JUZXh0OiBgUmVuZGVyIGZhaWxlZDogJHtlcnIgPz8gZXJyLm1lc3NhZ2V9YCxcbiAgICAgICAgICB9IGFzIE1zZ0Vycm9yVHlwZSk7XG4gICAgICAgIH0pO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIE1TR19FVkVOVFMuUkVTSVpFOlxuICAgICAgY29uc29sZS5sb2coJ3BsdWdpbiBtc2c6IHJlc2l6ZScpO1xuICAgICAgZmlnbWEudWkucmVzaXplKHdpZHRoLCBoZWlnaHQpO1xuICAgICAgYnJlYWs7XG5cbiAgICBkZWZhdWx0OlxuICAgICAgY29uc29sZS5lcnJvcignVW5rbm93biBwb3N0IG1lc3NhZ2UnLCBtc2cpO1xuICB9XG59O1xuXG4vLyBMaXN0ZW4gZm9yIG1lc3NhZ2VzIGZyb20gdGhlIFVJXG5maWdtYS51aS5vbignbWVzc2FnZScsIChlKSA9PiBoYW5kbGVSZWNlaXZlZE1zZyhlKSk7XG5cbmNvbnN0IG1haW4gPSAoKSA9PiB7XG4gIGNvbnN0IHsgY3VycmVudFBhZ2UgfSA9IGZpZ21hO1xuXG4gIC8vIEdldCBkZWZhdWx0IGZyYW1lcyBuYW1lc1xuICBjb25zdCBhbGxGcmFtZXMgPSBjdXJyZW50UGFnZS5jaGlsZHJlbi5maWx0ZXIoXG4gICAgKG5vZGUpID0+IG5vZGUudHlwZSA9PT0gJ0ZSQU1FJ1xuICApIGFzIEZyYW1lTm9kZVtdO1xuXG4gIGNvbnN0IGJyZWFrcG9pbnRzID0gT2JqZWN0LmtleXMoQlJFQUtQT0lOVFMpLm1hcCgobmFtZSkgPT5cbiAgICBuYW1lLnRvTG93ZXJDYXNlKClcbiAgKTtcblxuICBpZiAoYWxsRnJhbWVzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBmcmFtZXNEYXRhOiB7IFtpZDogc3RyaW5nXTogRnJhbWVEYXRhVHlwZSB9ID0ge307XG5cbiAgICBhbGxGcmFtZXMuZm9yRWFjaCgoZnJhbWUpID0+IHtcbiAgICAgIGNvbnN0IHsgbmFtZSwgd2lkdGgsIGhlaWdodCwgaWQgfSA9IGZyYW1lO1xuICAgICAgY29uc3QgdGV4dE5vZGVzID0gZ2V0VGV4dE5vZGVzKGZyYW1lKTtcbiAgICAgIGNvbnN0IGlzU2VsZWN0ZWQgPSBicmVha3BvaW50cy5pbmNsdWRlcyhpZCk7XG4gICAgICBjb25zdCB1aWQgPSBnZW5SYW5kb21VaWQoKTtcblxuICAgICAgZnJhbWVzRGF0YVtpZF0gPSB7XG4gICAgICAgIG5hbWUsXG4gICAgICAgIHdpZHRoLFxuICAgICAgICBoZWlnaHQsXG4gICAgICAgIGlkLFxuICAgICAgICB0ZXh0Tm9kZXMsXG4gICAgICAgIHVpZCxcbiAgICAgICAgcmVzcG9uc2l2ZTogZmFsc2UsXG4gICAgICAgIHNlbGVjdGVkOiBpc1NlbGVjdGVkLFxuICAgICAgfTtcbiAgICB9KTtcblxuICAgIGZpZ21hLnVpLnBvc3RNZXNzYWdlKHtcbiAgICAgIHR5cGU6IE1TR19FVkVOVFMuRk9VTkRfRlJBTUVTLFxuICAgICAgZnJhbWVzOiBmcmFtZXNEYXRhLFxuICAgIH0gYXMgTXNnRnJhbWVzVHlwZSk7XG5cbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAoYWxsRnJhbWVzLmxlbmd0aCA8IDEpIHtcbiAgICBjb25zb2xlLndhcm4oJ05vIGZyYW1lcycpO1xuICAgIGZpZ21hLnVpLnBvc3RNZXNzYWdlKHsgdHlwZTogTVNHX0VWRU5UUy5OT19GUkFNRVMgfSBhcyBNc2dOb0ZyYW1lc1R5cGUpO1xuICAgIHJldHVybjtcbiAgfVxufTtcblxuLy8gUmVuZGVyIHRoZSBET01cbmZpZ21hLnNob3dVSShfX2h0bWxfXyk7XG5maWdtYS51aS5yZXNpemUoSU5JVElBTF9VSV9TSVpFLndpZHRoLCBJTklUSUFMX1VJX1NJWkUuaGVpZ2h0KTtcblxuYXN5bmMgZnVuY3Rpb24gcmVuZGVyRnJhbWUoZnJhbWVJZDogc3RyaW5nKSB7XG4gIGNvbnN0IGZyYW1lID0gZmlnbWEuZ2V0Tm9kZUJ5SWQoZnJhbWVJZCk7XG4gIGlmICghZnJhbWUgfHwgZnJhbWUudHlwZSAhPT0gJ0ZSQU1FJykge1xuICAgIHRocm93IG5ldyBFcnJvcignTWlzc2luZyBmcmFtZScpO1xuICB9XG5cbiAgY29uc3Qgc3ZnU3RyID0gYXdhaXQgZ2V0RnJhbWVTdmdBc1N0cmluZyhmcmFtZSk7XG5cbiAgcmV0dXJuIHN2Z1N0cjtcbn1cblxuZXhwb3J0IHR5cGUgdGV4dE5vZGVTZWxlY3RlZFByb3BzID0gUGljazxcbiAgVGV4dE5vZGUsXG4gICd4JyB8ICd5JyB8ICd3aWR0aCcgfCAnaGVpZ2h0JyB8ICdjaGFyYWN0ZXJzJ1xuPjtcblxuZXhwb3J0IGludGVyZmFjZSB0ZXh0RGF0YSBleHRlbmRzIHRleHROb2RlU2VsZWN0ZWRQcm9wcyB7XG4gIGNvbG91cjogeyByOiBudW1iZXI7IGc6IG51bWJlcjsgYjogbnVtYmVyOyBhOiBudW1iZXIgfTtcbiAgZm9udFNpemU6IG51bWJlcjtcbiAgZm9udEZhbWlseTogc3RyaW5nO1xufVxuXG4vLyBFeHRyYWN0IG9iamVjdCBwcm9wZXJ0aWVzIGZyb20gdGV4dE5vZGUgZm9yIHBhc3NpbmcgdmlhIHBvc3RNZXNzYWdlXG5mdW5jdGlvbiBnZXRUZXh0Tm9kZXMoZnJhbWU6IEZyYW1lTm9kZSk6IHRleHREYXRhW10ge1xuICBjb25zdCB0ZXh0Tm9kZXMgPSBmcmFtZS5maW5kQWxsKCh7IHR5cGUgfSkgPT4gdHlwZSA9PT0gJ1RFWFQnKSBhcyBUZXh0Tm9kZVtdO1xuXG4gIHJldHVybiB0ZXh0Tm9kZXMubWFwKFxuICAgIChub2RlKTogdGV4dERhdGEgPT4ge1xuICAgICAgY29uc3Qge1xuICAgICAgICB4LFxuICAgICAgICB5LFxuICAgICAgICB3aWR0aCxcbiAgICAgICAgaGVpZ2h0LFxuICAgICAgICBmb250U2l6ZTogZm9udFNpemVEYXRhLFxuICAgICAgICBmb250TmFtZSxcbiAgICAgICAgZmlsbHMsXG4gICAgICAgIGNoYXJhY3RlcnMsXG4gICAgICB9ID0gbm9kZTtcblxuICAgICAgLy8gRXh0cmFjdCBiYXNpYyBmaWxsIGNvbG91clxuICAgICAgY29uc3QgW2ZpbGxdID0gZmlsbHM7XG4gICAgICBsZXQgY29sb3VyID0geyByOiAwLCBnOiAwLCBiOiAwLCBhOiAxIH07XG4gICAgICBpZiAoZmlsbC50eXBlID09PSAnU09MSUQnKSB7XG4gICAgICAgIGNvbG91ciA9IHsgLi4uY29sb3VyLCBhOiBmaWxsLm9wYWNpdHkgfHwgMSB9O1xuICAgICAgfVxuXG4gICAgICAvLyBFeHRyYWN0IGZvbnQgZmFtaWx5XG4gICAgICBsZXQgZm9udFNpemUgPSAxNjtcbiAgICAgIGlmIChmb250U2l6ZURhdGEgIT09IGZpZ21hLm1peGVkKSB7XG4gICAgICAgIGZvbnRTaXplID0gZm9udFNpemVEYXRhO1xuICAgICAgfVxuXG4gICAgICAvLyBFeHRyYWN0IGZvbnQgZmFtaWx5XG4gICAgICBsZXQgZm9udEZhbWlseSA9ICdBcmlhbCc7XG4gICAgICBpZiAoZm9udE5hbWUgIT09IGZpZ21hLm1peGVkKSB7XG4gICAgICAgIGZvbnRGYW1pbHkgPSBmb250TmFtZS5mYW1pbHk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7IHgsIHksIHdpZHRoLCBoZWlnaHQsIGZvbnRTaXplLCBmb250RmFtaWx5LCBjb2xvdXIsIGNoYXJhY3RlcnMgfTtcbiAgICB9XG4gICk7XG59XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsQUFNTyxVQUFL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
