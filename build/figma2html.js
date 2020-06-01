(() => {
  let __propertyIsEnumerable = Object.propertyIsEnumerable;
  let __assign = Object.assign;
  let __commonJS = (callback) => {
    let module;
    return () => {
      if (!module) {
        module = {
          exports: {}
        };
        callback(module.exports, module);
      }
      return module.exports;
    };
  };

  // src/index.tsx
  var require_index = __commonJS(() => {
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
      if (allFrames.length > 0) {
        const framesData = {};
        allFrames.forEach((frame) => {
          const {name, width, height, id} = frame;
          const textNodes = getTextNodes(frame);
          const uid = genRandomUid();
          framesData[id] = {
            name,
            width,
            height,
            id,
            textNodes,
            uid,
            responsive: false,
            selected: true
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
      const {absoluteTransform} = frame;
      const rootX = absoluteTransform[0][2];
      const rootY = absoluteTransform[1][2];
      return textNodes.map((node) => {
        const {absoluteTransform: absoluteTransform2, width, height, fontSize: fontSizeData, fontName, fills, characters} = node;
        const textX = absoluteTransform2[0][2];
        const textY = absoluteTransform2[1][2];
        const x = textX - rootX;
        const y = textY - rootY;
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
  });

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
  const INITIAL_UI_SIZE = {
    width: 480,
    height: 500,
    maxWidth: 1200,
    maxHeight: 900,
    minWidth: 420,
    minHeight: 480
  };
  require_index();
})();
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL2luZGV4LnRzeCIsICJzcmMvY29uc3RhbnRzLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgeyBCUkVBS1BPSU5UUywgTVNHX0VWRU5UUywgSU5JVElBTF9VSV9TSVpFIH0gZnJvbSBcIi4vY29uc3RhbnRzXCI7XG5pbXBvcnQgeyBNc2dGcmFtZXNUeXBlLCBNc2dOb0ZyYW1lc1R5cGUsIE1zZ1JlbmRlclR5cGUsIE1zZ0Vycm9yVHlwZSwgRnJhbWVEYXRhVHlwZSB9IGZyb20gXCIuL3VpXCI7XG5cbi8vIEdlbmVyYXRlIGEgdW5pcXVlIGlkIHByZWZpeGVkIHdpdGggaWRlbnRpZmVyIHN0cmluZyBmb3Igc2FmZSB1c2UgYXMgSFRNTCBJRFxuLy8gTm90ZTogRmlnbWEgc2VlbXMgdG8gc3R1YiAudG9TdHJpbmcgZm9yIHNlY3VyaXR5P1xuZnVuY3Rpb24gZ2VuUmFuZG9tVWlkKCkge1xuICBjb25zdCBybmQgPSBNYXRoLnJhbmRvbSgpO1xuICBjb25zdCB1aWQgPSBybmQudG9TdHJpbmcoKS5zdWJzdHIoMik7XG4gIHJldHVybiBgZjJoLSR7dWlkfWA7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGdldEZyYW1lU3ZnQXNTdHJpbmcoZnJhbWU6IFNjZW5lTm9kZSk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IHN2Z0J1ZmYgPSBhd2FpdCBmcmFtZS5leHBvcnRBc3luYyh7XG4gICAgZm9ybWF0OiBcIlNWR1wiLFxuICAgIHN2Z091dGxpbmVUZXh0OiBmYWxzZSxcbiAgICBzdmdTaW1wbGlmeVN0cm9rZTogdHJ1ZSxcbiAgfSk7XG5cbiAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkobnVsbCwgQXJyYXkuZnJvbShzdmdCdWZmKSk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUG9zdE1zZyB7XG4gIHR5cGU6IE1TR19FVkVOVFM7XG4gIGZyYW1lSWQ6IHN0cmluZztcbiAgd2lkdGg6IG51bWJlcjtcbiAgaGVpZ2h0OiBudW1iZXI7XG59XG4vLyBIYW5kbGUgbWVzc2FnZXMgZnJvbSB0aGUgVUlcbmNvbnN0IGhhbmRsZVJlY2VpdmVkTXNnID0gKG1zZzogUG9zdE1zZykgPT4ge1xuICBjb25zdCB7IHR5cGUsIHdpZHRoLCBoZWlnaHQsIGZyYW1lSWQgfSA9IG1zZztcblxuICBzd2l0Y2ggKHR5cGUpIHtcbiAgICBjYXNlIE1TR19FVkVOVFMuRVJST1I6XG4gICAgICBjb25zb2xlLmxvZyhcInBsdWdpbiBtc2c6IGVycm9yXCIpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIE1TR19FVkVOVFMuQ0xPU0U6XG4gICAgICBjb25zb2xlLmxvZyhcInBsdWdpbiBtc2c6IGNsb3NlXCIpO1xuICAgICAgZmlnbWEuY2xvc2VQbHVnaW4oKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSBNU0dfRVZFTlRTLkRPTV9SRUFEWTpcbiAgICAgIGNvbnNvbGUubG9nKFwicGx1Z2luIG1zZzogRE9NIFJFQURZXCIpO1xuICAgICAgbWFpbigpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIE1TR19FVkVOVFMuUkVOREVSOlxuICAgICAgY29uc29sZS5sb2coXCJwbHVnaW4gbXNnOiByZW5kZXJcIiwgZnJhbWVJZCk7XG4gICAgICByZW5kZXJGcmFtZShmcmFtZUlkKVxuICAgICAgICAudGhlbigoc3ZnU3RyKSA9PiB7XG4gICAgICAgICAgZmlnbWEudWkucG9zdE1lc3NhZ2Uoe1xuICAgICAgICAgICAgdHlwZTogTVNHX0VWRU5UUy5SRU5ERVIsXG4gICAgICAgICAgICBmcmFtZUlkLFxuICAgICAgICAgICAgc3ZnU3RyLFxuICAgICAgICAgIH0gYXMgTXNnUmVuZGVyVHlwZSk7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgZmlnbWEudWkucG9zdE1lc3NhZ2Uoe1xuICAgICAgICAgICAgdHlwZTogTVNHX0VWRU5UUy5FUlJPUixcbiAgICAgICAgICAgIGVycm9yVGV4dDogYFJlbmRlciBmYWlsZWQ6ICR7ZXJyID8/IGVyci5tZXNzYWdlfWAsXG4gICAgICAgICAgfSBhcyBNc2dFcnJvclR5cGUpO1xuICAgICAgICB9KTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSBNU0dfRVZFTlRTLlJFU0laRTpcbiAgICAgIGNvbnNvbGUubG9nKFwicGx1Z2luIG1zZzogcmVzaXplXCIpO1xuICAgICAgZmlnbWEudWkucmVzaXplKHdpZHRoLCBoZWlnaHQpO1xuICAgICAgYnJlYWs7XG5cbiAgICBkZWZhdWx0OlxuICAgICAgY29uc29sZS5lcnJvcihcIlVua25vd24gcG9zdCBtZXNzYWdlXCIsIG1zZyk7XG4gIH1cbn07XG5cbi8vIExpc3RlbiBmb3IgbWVzc2FnZXMgZnJvbSB0aGUgVUlcbmZpZ21hLnVpLm9uKFwibWVzc2FnZVwiLCAoZSkgPT4gaGFuZGxlUmVjZWl2ZWRNc2coZSkpO1xuXG5jb25zdCBtYWluID0gKCkgPT4ge1xuICBjb25zdCB7IGN1cnJlbnRQYWdlIH0gPSBmaWdtYTtcblxuICAvLyBHZXQgZGVmYXVsdCBmcmFtZXMgbmFtZXNcbiAgY29uc3QgYWxsRnJhbWVzID0gY3VycmVudFBhZ2UuY2hpbGRyZW4uZmlsdGVyKChub2RlKSA9PiBub2RlLnR5cGUgPT09IFwiRlJBTUVcIikgYXMgRnJhbWVOb2RlW107XG5cbiAgaWYgKGFsbEZyYW1lcy5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgZnJhbWVzRGF0YTogeyBbaWQ6IHN0cmluZ106IEZyYW1lRGF0YVR5cGUgfSA9IHt9O1xuXG4gICAgYWxsRnJhbWVzLmZvckVhY2goKGZyYW1lKSA9PiB7XG4gICAgICBjb25zdCB7IG5hbWUsIHdpZHRoLCBoZWlnaHQsIGlkIH0gPSBmcmFtZTtcbiAgICAgIGNvbnN0IHRleHROb2RlcyA9IGdldFRleHROb2RlcyhmcmFtZSk7XG4gICAgICBjb25zdCB1aWQgPSBnZW5SYW5kb21VaWQoKTtcblxuICAgICAgZnJhbWVzRGF0YVtpZF0gPSB7XG4gICAgICAgIG5hbWUsXG4gICAgICAgIHdpZHRoLFxuICAgICAgICBoZWlnaHQsXG4gICAgICAgIGlkLFxuICAgICAgICB0ZXh0Tm9kZXMsXG4gICAgICAgIHVpZCxcbiAgICAgICAgcmVzcG9uc2l2ZTogZmFsc2UsXG4gICAgICAgIHNlbGVjdGVkOiB0cnVlLFxuICAgICAgfTtcbiAgICB9KTtcblxuICAgIGZpZ21hLnVpLnBvc3RNZXNzYWdlKHtcbiAgICAgIHR5cGU6IE1TR19FVkVOVFMuRk9VTkRfRlJBTUVTLFxuICAgICAgZnJhbWVzOiBmcmFtZXNEYXRhLFxuICAgIH0gYXMgTXNnRnJhbWVzVHlwZSk7XG5cbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAoYWxsRnJhbWVzLmxlbmd0aCA8IDEpIHtcbiAgICBjb25zb2xlLndhcm4oXCJObyBmcmFtZXNcIik7XG4gICAgZmlnbWEudWkucG9zdE1lc3NhZ2UoeyB0eXBlOiBNU0dfRVZFTlRTLk5PX0ZSQU1FUyB9IGFzIE1zZ05vRnJhbWVzVHlwZSk7XG4gICAgcmV0dXJuO1xuICB9XG59O1xuXG4vLyBSZW5kZXIgdGhlIERPTVxuZmlnbWEuc2hvd1VJKF9faHRtbF9fKTtcbmZpZ21hLnVpLnJlc2l6ZShJTklUSUFMX1VJX1NJWkUud2lkdGgsIElOSVRJQUxfVUlfU0laRS5oZWlnaHQpO1xuXG5hc3luYyBmdW5jdGlvbiByZW5kZXJGcmFtZShmcmFtZUlkOiBzdHJpbmcpIHtcbiAgY29uc3QgZnJhbWUgPSBmaWdtYS5nZXROb2RlQnlJZChmcmFtZUlkKTtcbiAgaWYgKCFmcmFtZSB8fCBmcmFtZS50eXBlICE9PSBcIkZSQU1FXCIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIGZyYW1lXCIpO1xuICB9XG5cbiAgY29uc3Qgc3ZnU3RyID0gYXdhaXQgZ2V0RnJhbWVTdmdBc1N0cmluZyhmcmFtZSk7XG5cbiAgcmV0dXJuIHN2Z1N0cjtcbn1cblxuZXhwb3J0IHR5cGUgdGV4dE5vZGVTZWxlY3RlZFByb3BzID0gUGljazxUZXh0Tm9kZSwgXCJ4XCIgfCBcInlcIiB8IFwid2lkdGhcIiB8IFwiaGVpZ2h0XCIgfCBcImNoYXJhY3RlcnNcIj47XG5cbmV4cG9ydCBpbnRlcmZhY2UgdGV4dERhdGEgZXh0ZW5kcyB0ZXh0Tm9kZVNlbGVjdGVkUHJvcHMge1xuICBjb2xvdXI6IHsgcjogbnVtYmVyOyBnOiBudW1iZXI7IGI6IG51bWJlcjsgYTogbnVtYmVyIH07XG4gIGZvbnRTaXplOiBudW1iZXI7XG4gIGZvbnRGYW1pbHk6IHN0cmluZztcbn1cblxuLy8gRXh0cmFjdCBvYmplY3QgcHJvcGVydGllcyBmcm9tIHRleHROb2RlIGZvciBwYXNzaW5nIHZpYSBwb3N0TWVzc2FnZVxuZnVuY3Rpb24gZ2V0VGV4dE5vZGVzKGZyYW1lOiBGcmFtZU5vZGUpOiB0ZXh0RGF0YVtdIHtcbiAgY29uc3QgdGV4dE5vZGVzID0gZnJhbWUuZmluZEFsbCgoeyB0eXBlIH0pID0+IHR5cGUgPT09IFwiVEVYVFwiKSBhcyBUZXh0Tm9kZVtdO1xuICBjb25zdCB7IGFic29sdXRlVHJhbnNmb3JtIH0gPSBmcmFtZTtcbiAgY29uc3Qgcm9vdFggPSBhYnNvbHV0ZVRyYW5zZm9ybVswXVsyXTtcbiAgY29uc3Qgcm9vdFkgPSBhYnNvbHV0ZVRyYW5zZm9ybVsxXVsyXTtcblxuICByZXR1cm4gdGV4dE5vZGVzLm1hcChcbiAgICAobm9kZSk6IHRleHREYXRhID0+IHtcbiAgICAgIGNvbnN0IHsgYWJzb2x1dGVUcmFuc2Zvcm0sIHdpZHRoLCBoZWlnaHQsIGZvbnRTaXplOiBmb250U2l6ZURhdGEsIGZvbnROYW1lLCBmaWxscywgY2hhcmFjdGVycyB9ID0gbm9kZTtcblxuICAgICAgLy8gTk9URTogRmlnbWEgbm9kZSB4LCB5IGFyZSByZWxhdGl2ZSB0byBmaXJzdCBwYXJlbnQsIHdlIHdhbnQgdGhlbVxuICAgICAgLy8gcmVsYXRpdmUgdG8gdGhlIHJvb3QgZnJhbWVcbiAgICAgIGNvbnN0IHRleHRYID0gYWJzb2x1dGVUcmFuc2Zvcm1bMF1bMl07XG4gICAgICBjb25zdCB0ZXh0WSA9IGFic29sdXRlVHJhbnNmb3JtWzFdWzJdO1xuICAgICAgY29uc3QgeCA9IHRleHRYIC0gcm9vdFg7XG4gICAgICBjb25zdCB5ID0gdGV4dFkgLSByb290WTtcblxuICAgICAgLy8gRXh0cmFjdCBiYXNpYyBmaWxsIGNvbG91clxuICAgICAgY29uc3QgW2ZpbGxdID0gZmlsbHM7XG4gICAgICBsZXQgY29sb3VyID0geyByOiAwLCBnOiAwLCBiOiAwLCBhOiAxIH07XG4gICAgICBpZiAoZmlsbC50eXBlID09PSBcIlNPTElEXCIpIHtcbiAgICAgICAgY29sb3VyID0geyAuLi5jb2xvdXIsIGE6IGZpbGwub3BhY2l0eSB8fCAxIH07XG4gICAgICB9XG5cbiAgICAgIC8vIEV4dHJhY3QgZm9udCBmYW1pbHlcbiAgICAgIGxldCBmb250U2l6ZSA9IDE2O1xuICAgICAgaWYgKGZvbnRTaXplRGF0YSAhPT0gZmlnbWEubWl4ZWQpIHtcbiAgICAgICAgZm9udFNpemUgPSBmb250U2l6ZURhdGE7XG4gICAgICB9XG5cbiAgICAgIC8vIEV4dHJhY3QgZm9udCBmYW1pbHlcbiAgICAgIGxldCBmb250RmFtaWx5ID0gXCJBcmlhbFwiO1xuICAgICAgaWYgKGZvbnROYW1lICE9PSBmaWdtYS5taXhlZCkge1xuICAgICAgICBmb250RmFtaWx5ID0gZm9udE5hbWUuZmFtaWx5O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4geyB4LCB5LCB3aWR0aCwgaGVpZ2h0LCBmb250U2l6ZSwgZm9udEZhbWlseSwgY29sb3VyLCBjaGFyYWN0ZXJzIH07XG4gICAgfVxuICApO1xufVxuIiwgImV4cG9ydCB0eXBlIGJvYXJkID0ge1xuICBpZDogc3RyaW5nO1xuICB3aWR0aDogbnVtYmVyO1xuICBidWZmZXI6IFVpbnQ4QXJyYXk7XG59O1xuXG5leHBvcnQgZW51bSBTVEFHRVMge1xuICBDSE9PU0VfRlJBTUVTLFxuICBQUkVWSUVXX09VVFBVVCxcbiAgUkVTUE9OU0lWRV9QUkVWSUVXLFxuICBTQVZFX09VVFBVVCxcbn1cblxuZXhwb3J0IGVudW0gTVNHX0VWRU5UUyB7XG4gIERPTV9SRUFEWSxcbiAgTk9fRlJBTUVTLFxuICBGT1VORF9GUkFNRVMsXG4gIFJFU0laRSxcbiAgUkVOREVSLFxuICBDTE9TRSxcbiAgRVJST1IsXG59XG5cbmV4cG9ydCBlbnVtIEJSRUFLUE9JTlRTIHtcbiAgTW9iaWxlID0gMzQwLFxuICBUYWJsZXQgPSA1MjAsXG4gIERlc2t0b3AgPSAxMDI0LFxufVxuXG5leHBvcnQgZW51bSBPVVRQVVRfRk9STUFUUyB7XG4gIElOTElORSxcbiAgSUZSQU1FLFxufVxuXG5leHBvcnQgY29uc3QgVUlfVEVYVCA9IHtcbiAgRVJST1JfVU5FWFBFQ1RFRDogJ1VuZXhwZWN0ZWQgZXJyb3InLFxuICBFUlJPUl9NSVNTSU5HX0ZSQU1FUzogJ05vIGZyYW1lcyBmb3VuZC4gUGxlYXNlIGFkZCBzb21lIGZyYW1lcyB0byB0aGUgcGFnZS4nLFxuICBXQVJOX05PX1RBUkdFVFM6ICdTdGFuZGFyZCBmcmFtZXMgbm90IGZvdW5kLiBQbGVhc2Ugc2VsZWN0IHRhcmdldCBmcmFtZXMuJyxcbiAgV0FSTl9UT09fTUFOWV9UQVJHRVRTOiAnUGxlYXNlIHNlbGVjdCB0aHJlZSB0YXJnZXQgZnJhbWVzJyxcbiAgSU5GT19QUkVWSUVXOiAnUHJldmlldyBlYWNoIGZyYW1lIG91dHB1dCcsXG4gIFRJVExFX0NIT09TRV9GUkFNRTogJ0Nob29zZSB3aGljaCBmcmFtZXMgdG8gZXhwb3J0JyxcbiAgVElUTEVfUFJFVklFVzogJ1ByZXZpZXcnLFxuICBUSVRMRV9SRVNQT05TSVZFX1BSRVZJRVc6ICdSZXNwb25zaXZlIHByZXZpZXcnLFxuICBUSUxFX09VVFBVVDogJ0V4cG9ydCcsXG4gIEJVVFRPTl9ORVhUOiAnTmV4dCcsXG4gIEJVVFRPTl9ET1dOTE9BRDogJ0Rvd25sb2FkJyxcbiAgQlVUVE9OX1BSRVZJT1VTOiAnQmFjaycsXG59O1xuXG5leHBvcnQgY29uc3QgSU5JVElBTF9VSV9TSVpFID0ge1xuICB3aWR0aDogNDgwLFxuICBoZWlnaHQ6IDUwMCxcbiAgbWF4V2lkdGg6IDEyMDAsXG4gIG1heEhlaWdodDogOTAwLFxuICBtaW5XaWR0aDogNDIwLFxuICBtaW5IZWlnaHQ6IDQ4MCxcbn07XG5cbmV4cG9ydCBjb25zdCBGUkFNRV9XQVJOSU5HX1NJWkUgPSAzMDA7XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBS0E7QUFDRSxZQUFNLE1BQU0sS0FBSztBQUNqQixZQUFNLE1BQU0sSUFBSSxXQUFXLE9BQU87QUFDbEMsYUFBTyxPQUFPOztBQUdoQix1Q0FBbUM7QUFDakMsWUFBTSxVQUFVLE1BQU0sTUFBTSxZQUFZO1FBQ3RDLFFBQVE7UUFDUixnQkFBZ0I7UUFDaEIsbUJBQW1COztBQUdyQixhQUFPLE9BQU8sYUFBYSxNQUFNLE1BQU0sTUFBTSxLQUFLOztBQVVwRCxVQUFNLG9CQUFvQixDQUFDO0FBQ3pCLFlBQU0sQ0FBRSxNQUFNLE9BQU8sUUFBUSxXQUFZO0FBRXpDLGNBQVE7YUFDRCxXQUFXO0FBQ2Qsa0JBQVEsSUFBSTtBQUNaO2FBRUcsV0FBVztBQUNkLGtCQUFRLElBQUk7QUFDWixnQkFBTTtBQUNOO2FBRUcsV0FBVztBQUNkLGtCQUFRLElBQUk7QUFDWjtBQUNBO2FBRUcsV0FBVztBQUNkLGtCQUFRLElBQUksc0JBQXNCO0FBQ2xDLHNCQUFZLFNBQ1QsS0FBSyxDQUFDO0FBQ0wsa0JBQU0sR0FBRyxZQUFZO2NBQ25CLE1BQU0sV0FBVztjQUNqQjtjQUNBOzthQUdILE1BQU0sQ0FBQztBQUNOLGtCQUFNLEdBQUcsWUFBWTtjQUNuQixNQUFNLFdBQVc7Y0FDakIsV0FBVyxrQkFBeUIsQUFBUCxvQkFBTyxJQUFJOzs7QUFHOUM7YUFFRyxXQUFXO0FBQ2Qsa0JBQVEsSUFBSTtBQUNaLGdCQUFNLEdBQUcsT0FBTyxPQUFPO0FBQ3ZCOztBQUdBLGtCQUFRLE1BQU0sd0JBQXdCOzs7QUFLNUMsVUFBTSxHQUFHLEdBQUcsV0FBVyxDQUFDLE1BQU0sa0JBQWtCO0FBRWhELFVBQU0sT0FBTztBQUNYLFlBQU0sQ0FBRSxlQUFnQjtB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
