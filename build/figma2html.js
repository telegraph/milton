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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL2luZGV4LnRzeCIsICJzcmMvY29uc3RhbnRzLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgeyBCUkVBS1BPSU5UUywgTVNHX0VWRU5UUywgSU5JVElBTF9VSV9TSVpFIH0gZnJvbSBcIi4vY29uc3RhbnRzXCI7XG5pbXBvcnQgeyBNc2dGcmFtZXNUeXBlLCBNc2dOb0ZyYW1lc1R5cGUsIE1zZ1JlbmRlclR5cGUsIE1zZ0Vycm9yVHlwZSwgRnJhbWVEYXRhVHlwZSB9IGZyb20gXCIuL3VpXCI7XG5cbi8vIEdlbmVyYXRlIGEgdW5pcXVlIGlkIHByZWZpeGVkIHdpdGggaWRlbnRpZmVyIHN0cmluZyBmb3Igc2FmZSB1c2UgYXMgSFRNTCBJRFxuLy8gTm90ZTogRmlnbWEgc2VlbXMgdG8gc3R1YiAudG9TdHJpbmcgZm9yIHNlY3VyaXR5P1xuZnVuY3Rpb24gZ2VuUmFuZG9tVWlkKCkge1xuICBjb25zdCBybmQgPSBNYXRoLnJhbmRvbSgpO1xuICBjb25zdCB1aWQgPSBybmQudG9TdHJpbmcoKS5zdWJzdHIoMik7XG4gIHJldHVybiBgZjJoLSR7dWlkfWA7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGdldEZyYW1lU3ZnQXNTdHJpbmcoZnJhbWU6IFNjZW5lTm9kZSk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IHN2Z0J1ZmYgPSBhd2FpdCBmcmFtZS5leHBvcnRBc3luYyh7XG4gICAgZm9ybWF0OiBcIlNWR1wiLFxuICAgIHN2Z091dGxpbmVUZXh0OiBmYWxzZSxcbiAgICBzdmdTaW1wbGlmeVN0cm9rZTogdHJ1ZSxcbiAgfSk7XG5cbiAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkobnVsbCwgQXJyYXkuZnJvbShzdmdCdWZmKSk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUG9zdE1zZyB7XG4gIHR5cGU6IE1TR19FVkVOVFM7XG4gIGZyYW1lSWQ6IHN0cmluZztcbiAgd2lkdGg6IG51bWJlcjtcbiAgaGVpZ2h0OiBudW1iZXI7XG59XG4vLyBIYW5kbGUgbWVzc2FnZXMgZnJvbSB0aGUgVUlcbmNvbnN0IGhhbmRsZVJlY2VpdmVkTXNnID0gKG1zZzogUG9zdE1zZykgPT4ge1xuICBjb25zdCB7IHR5cGUsIHdpZHRoLCBoZWlnaHQsIGZyYW1lSWQgfSA9IG1zZztcblxuICBzd2l0Y2ggKHR5cGUpIHtcbiAgICBjYXNlIE1TR19FVkVOVFMuRVJST1I6XG4gICAgICBjb25zb2xlLmxvZyhcInBsdWdpbiBtc2c6IGVycm9yXCIpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIE1TR19FVkVOVFMuQ0xPU0U6XG4gICAgICBjb25zb2xlLmxvZyhcInBsdWdpbiBtc2c6IGNsb3NlXCIpO1xuICAgICAgZmlnbWEuY2xvc2VQbHVnaW4oKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSBNU0dfRVZFTlRTLkRPTV9SRUFEWTpcbiAgICAgIGNvbnNvbGUubG9nKFwicGx1Z2luIG1zZzogRE9NIFJFQURZXCIpO1xuICAgICAgbWFpbigpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIE1TR19FVkVOVFMuUkVOREVSOlxuICAgICAgY29uc29sZS5sb2coXCJwbHVnaW4gbXNnOiByZW5kZXJcIiwgZnJhbWVJZCk7XG4gICAgICByZW5kZXJGcmFtZShmcmFtZUlkKVxuICAgICAgICAudGhlbigoc3ZnU3RyKSA9PiB7XG4gICAgICAgICAgZmlnbWEudWkucG9zdE1lc3NhZ2Uoe1xuICAgICAgICAgICAgdHlwZTogTVNHX0VWRU5UUy5SRU5ERVIsXG4gICAgICAgICAgICBmcmFtZUlkLFxuICAgICAgICAgICAgc3ZnU3RyLFxuICAgICAgICAgIH0gYXMgTXNnUmVuZGVyVHlwZSk7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgZmlnbWEudWkucG9zdE1lc3NhZ2Uoe1xuICAgICAgICAgICAgdHlwZTogTVNHX0VWRU5UUy5FUlJPUixcbiAgICAgICAgICAgIGVycm9yVGV4dDogYFJlbmRlciBmYWlsZWQ6ICR7ZXJyID8/IGVyci5tZXNzYWdlfWAsXG4gICAgICAgICAgfSBhcyBNc2dFcnJvclR5cGUpO1xuICAgICAgICB9KTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSBNU0dfRVZFTlRTLlJFU0laRTpcbiAgICAgIGNvbnNvbGUubG9nKFwicGx1Z2luIG1zZzogcmVzaXplXCIpO1xuICAgICAgZmlnbWEudWkucmVzaXplKHdpZHRoLCBoZWlnaHQpO1xuICAgICAgYnJlYWs7XG5cbiAgICBkZWZhdWx0OlxuICAgICAgY29uc29sZS5lcnJvcihcIlVua25vd24gcG9zdCBtZXNzYWdlXCIsIG1zZyk7XG4gIH1cbn07XG5cbi8vIExpc3RlbiBmb3IgbWVzc2FnZXMgZnJvbSB0aGUgVUlcbmZpZ21hLnVpLm9uKFwibWVzc2FnZVwiLCAoZSkgPT4gaGFuZGxlUmVjZWl2ZWRNc2coZSkpO1xuXG5jb25zdCBtYWluID0gKCkgPT4ge1xuICBjb25zdCB7IGN1cnJlbnRQYWdlIH0gPSBmaWdtYTtcblxuICAvLyBHZXQgZGVmYXVsdCBmcmFtZXMgbmFtZXNcbiAgY29uc3QgYWxsRnJhbWVzID0gY3VycmVudFBhZ2UuY2hpbGRyZW4uZmlsdGVyKChub2RlKSA9PiBub2RlLnR5cGUgPT09IFwiRlJBTUVcIikgYXMgRnJhbWVOb2RlW107XG5cbiAgaWYgKGFsbEZyYW1lcy5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgZnJhbWVzRGF0YTogeyBbaWQ6IHN0cmluZ106IEZyYW1lRGF0YVR5cGUgfSA9IHt9O1xuXG4gICAgYWxsRnJhbWVzLmZvckVhY2goKGZyYW1lKSA9PiB7XG4gICAgICBjb25zdCB7IG5hbWUsIHdpZHRoLCBoZWlnaHQsIGlkIH0gPSBmcmFtZTtcbiAgICAgIGNvbnN0IHRleHROb2RlcyA9IGdldFRleHROb2RlcyhmcmFtZSk7XG4gICAgICBjb25zdCB1aWQgPSBnZW5SYW5kb21VaWQoKTtcblxuICAgICAgZnJhbWVzRGF0YVtpZF0gPSB7XG4gICAgICAgIG5hbWUsXG4gICAgICAgIHdpZHRoLFxuICAgICAgICBoZWlnaHQsXG4gICAgICAgIGlkLFxuICAgICAgICB0ZXh0Tm9kZXMsXG4gICAgICAgIHVpZCxcbiAgICAgICAgcmVzcG9uc2l2ZTogZmFsc2UsXG4gICAgICAgIHNlbGVjdGVkOiB0cnVlLFxuICAgICAgfTtcbiAgICB9KTtcblxuICAgIGZpZ21hLnVpLnBvc3RNZXNzYWdlKHtcbiAgICAgIHR5cGU6IE1TR19FVkVOVFMuRk9VTkRfRlJBTUVTLFxuICAgICAgZnJhbWVzOiBmcmFtZXNEYXRhLFxuICAgIH0gYXMgTXNnRnJhbWVzVHlwZSk7XG5cbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAoYWxsRnJhbWVzLmxlbmd0aCA8IDEpIHtcbiAgICBjb25zb2xlLndhcm4oXCJObyBmcmFtZXNcIik7XG4gICAgZmlnbWEudWkucG9zdE1lc3NhZ2UoeyB0eXBlOiBNU0dfRVZFTlRTLk5PX0ZSQU1FUyB9IGFzIE1zZ05vRnJhbWVzVHlwZSk7XG4gICAgcmV0dXJuO1xuICB9XG59O1xuXG4vLyBSZW5kZXIgdGhlIERPTVxuZmlnbWEuc2hvd1VJKF9faHRtbF9fKTtcbmZpZ21hLnVpLnJlc2l6ZShJTklUSUFMX1VJX1NJWkUud2lkdGgsIElOSVRJQUxfVUlfU0laRS5oZWlnaHQpO1xuXG5hc3luYyBmdW5jdGlvbiByZW5kZXJGcmFtZShmcmFtZUlkOiBzdHJpbmcpIHtcbiAgY29uc3QgZnJhbWUgPSBmaWdtYS5nZXROb2RlQnlJZChmcmFtZUlkKTtcbiAgaWYgKCFmcmFtZSB8fCBmcmFtZS50eXBlICE9PSBcIkZSQU1FXCIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIGZyYW1lXCIpO1xuICB9XG5cbiAgY29uc3Qgc3ZnU3RyID0gYXdhaXQgZ2V0RnJhbWVTdmdBc1N0cmluZyhmcmFtZSk7XG5cbiAgcmV0dXJuIHN2Z1N0cjtcbn1cblxuZXhwb3J0IHR5cGUgdGV4dE5vZGVTZWxlY3RlZFByb3BzID0gUGljazxUZXh0Tm9kZSwgXCJ4XCIgfCBcInlcIiB8IFwid2lkdGhcIiB8IFwiaGVpZ2h0XCIgfCBcImNoYXJhY3RlcnNcIj47XG5cbmV4cG9ydCBpbnRlcmZhY2UgdGV4dERhdGEgZXh0ZW5kcyB0ZXh0Tm9kZVNlbGVjdGVkUHJvcHMge1xuICBjb2xvdXI6IHsgcjogbnVtYmVyOyBnOiBudW1iZXI7IGI6IG51bWJlcjsgYTogbnVtYmVyIH07XG4gIGZvbnRTaXplOiBudW1iZXI7XG4gIGZvbnRGYW1pbHk6IHN0cmluZztcbn1cblxuLy8gRXh0cmFjdCBvYmplY3QgcHJvcGVydGllcyBmcm9tIHRleHROb2RlIGZvciBwYXNzaW5nIHZpYSBwb3N0TWVzc2FnZVxuZnVuY3Rpb24gZ2V0VGV4dE5vZGVzKGZyYW1lOiBGcmFtZU5vZGUpOiB0ZXh0RGF0YVtdIHtcbiAgY29uc3QgdGV4dE5vZGVzID0gZnJhbWUuZmluZEFsbCgoeyB0eXBlIH0pID0+IHR5cGUgPT09IFwiVEVYVFwiKSBhcyBUZXh0Tm9kZVtdO1xuXG4gIHJldHVybiB0ZXh0Tm9kZXMubWFwKFxuICAgIChub2RlKTogdGV4dERhdGEgPT4ge1xuICAgICAgY29uc3QgeyB4LCB5LCB3aWR0aCwgaGVpZ2h0LCBmb250U2l6ZTogZm9udFNpemVEYXRhLCBmb250TmFtZSwgZmlsbHMsIGNoYXJhY3RlcnMgfSA9IG5vZGU7XG5cbiAgICAgIC8vIEV4dHJhY3QgYmFzaWMgZmlsbCBjb2xvdXJcbiAgICAgIGNvbnN0IFtmaWxsXSA9IGZpbGxzO1xuICAgICAgbGV0IGNvbG91ciA9IHsgcjogMCwgZzogMCwgYjogMCwgYTogMSB9O1xuICAgICAgaWYgKGZpbGwudHlwZSA9PT0gXCJTT0xJRFwiKSB7XG4gICAgICAgIGNvbG91ciA9IHsgLi4uY29sb3VyLCBhOiBmaWxsLm9wYWNpdHkgfHwgMSB9O1xuICAgICAgfVxuXG4gICAgICAvLyBFeHRyYWN0IGZvbnQgZmFtaWx5XG4gICAgICBsZXQgZm9udFNpemUgPSAxNjtcbiAgICAgIGlmIChmb250U2l6ZURhdGEgIT09IGZpZ21hLm1peGVkKSB7XG4gICAgICAgIGZvbnRTaXplID0gZm9udFNpemVEYXRhO1xuICAgICAgfVxuXG4gICAgICAvLyBFeHRyYWN0IGZvbnQgZmFtaWx5XG4gICAgICBsZXQgZm9udEZhbWlseSA9IFwiQXJpYWxcIjtcbiAgICAgIGlmIChmb250TmFtZSAhPT0gZmlnbWEubWl4ZWQpIHtcbiAgICAgICAgZm9udEZhbWlseSA9IGZvbnROYW1lLmZhbWlseTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHsgeCwgeSwgd2lkdGgsIGhlaWdodCwgZm9udFNpemUsIGZvbnRGYW1pbHksIGNvbG91ciwgY2hhcmFjdGVycyB9O1xuICAgIH1cbiAgKTtcbn1cbiIsICJleHBvcnQgdHlwZSBib2FyZCA9IHtcbiAgaWQ6IHN0cmluZztcbiAgd2lkdGg6IG51bWJlcjtcbiAgYnVmZmVyOiBVaW50OEFycmF5O1xufTtcblxuZXhwb3J0IGVudW0gU1RBR0VTIHtcbiAgQ0hPT1NFX0ZSQU1FUyxcbiAgUFJFVklFV19PVVRQVVQsXG4gIFJFU1BPTlNJVkVfUFJFVklFVyxcbiAgU0FWRV9PVVRQVVQsXG59XG5cbmV4cG9ydCBlbnVtIE1TR19FVkVOVFMge1xuICBET01fUkVBRFksXG4gIE5PX0ZSQU1FUyxcbiAgRk9VTkRfRlJBTUVTLFxuICBSRVNJWkUsXG4gIFJFTkRFUixcbiAgQ0xPU0UsXG4gIEVSUk9SLFxufVxuXG5leHBvcnQgZW51bSBCUkVBS1BPSU5UUyB7XG4gIE1vYmlsZSA9IDM0MCxcbiAgVGFibGV0ID0gNTIwLFxuICBEZXNrdG9wID0gMTAyNCxcbn1cblxuZXhwb3J0IGVudW0gT1VUUFVUX0ZPUk1BVFMge1xuICBJTkxJTkUsXG4gIElGUkFNRSxcbn1cblxuZXhwb3J0IGNvbnN0IFVJX1RFWFQgPSB7XG4gIEVSUk9SX1VORVhQRUNURUQ6ICdVbmV4cGVjdGVkIGVycm9yJyxcbiAgRVJST1JfTUlTU0lOR19GUkFNRVM6ICdObyBmcmFtZXMgZm91bmQuIFBsZWFzZSBhZGQgc29tZSBmcmFtZXMgdG8gdGhlIHBhZ2UuJyxcbiAgV0FSTl9OT19UQVJHRVRTOiAnU3RhbmRhcmQgZnJhbWVzIG5vdCBmb3VuZC4gUGxlYXNlIHNlbGVjdCB0YXJnZXQgZnJhbWVzLicsXG4gIFdBUk5fVE9PX01BTllfVEFSR0VUUzogJ1BsZWFzZSBzZWxlY3QgdGhyZWUgdGFyZ2V0IGZyYW1lcycsXG4gIElORk9fUFJFVklFVzogJ1ByZXZpZXcgZWFjaCBmcmFtZSBvdXRwdXQnLFxuICBUSVRMRV9DSE9PU0VfRlJBTUU6ICdDaG9vc2Ugd2hpY2ggZnJhbWVzIHRvIGV4cG9ydCcsXG4gIFRJVExFX1BSRVZJRVc6ICdQcmV2aWV3JyxcbiAgVElUTEVfUkVTUE9OU0lWRV9QUkVWSUVXOiAnUmVzcG9uc2l2ZSBwcmV2aWV3JyxcbiAgVElMRV9PVVRQVVQ6ICdFeHBvcnQnLFxuICBCVVRUT05fTkVYVDogJ05leHQnLFxuICBCVVRUT05fRE9XTkxPQUQ6ICdEb3dubG9hZCcsXG4gIEJVVFRPTl9QUkVWSU9VUzogJ0JhY2snLFxufTtcblxuZXhwb3J0IGNvbnN0IElOSVRJQUxfVUlfU0laRSA9IHtcbiAgd2lkdGg6IDQ4MCxcbiAgaGVpZ2h0OiA1MDAsXG4gIG1heFdpZHRoOiAxMjAwLFxuICBtYXhIZWlnaHQ6IDkwMCxcbiAgbWluV2lkdGg6IDQyMCxcbiAgbWluSGVpZ2h0OiA0ODAsXG59O1xuXG5leHBvcnQgY29uc3QgRlJBTUVfV0FSTklOR19TSVpFID0gMzAwO1xuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUtBO0FBQ0UsWUFBTSxNQUFNLEtBQUs7QUFDakIsWUFBTSxNQUFNLElBQUksV0FBVyxPQUFPO0FBQ2xDLGFBQU8sT0FBTzs7QUFHaEIsdUNBQW1DO0FBQ2pDLFlBQU0sVUFBVSxNQUFNLE1BQU0sWUFBWTtRQUN0QyxRQUFRO1FBQ1IsZ0JBQWdCO1FBQ2hCLG1CQUFtQjs7QUFHckIsYUFBTyxPQUFPLGFBQWEsTUFBTSxNQUFNLE1BQU0sS0FBSzs7QUFVcEQsVUFBTSxvQkFBb0IsQ0FBQztBQUN6QixZQUFNLENBQUUsTUFBTSxPQUFPLFFBQVEsV0FBWTtBQUV6QyxjQUFRO2FBQ0QsV0FBVztBQUNkLGtCQUFRLElBQUk7QUFDWjthQUVHLFdBQVc7QUFDZCxrQkFBUSxJQUFJO0FBQ1osZ0JBQU07QUFDTjthQUVHLFdBQVc7QUFDZCxrQkFBUSxJQUFJO0FBQ1o7QUFDQTthQUVHLFdBQVc7QUFDZCxrQkFBUSxJQUFJLHNCQUFzQjtBQUNsQyxzQkFBWSxTQUNULEtBQUssQ0FBQztBQUNMLGtCQUFNLEdBQUcsWUFBWTtjQUNuQixNQUFNLFdBQVc7Y0FDakI7Y0FDQTs7YUFHSCxNQUFNLENBQUM7QUFDTixrQkFBTSxHQUFHLFlBQVk7Y0FDbkIsTUFBTSxXQUFXO2NBQ2pCLFdBQVcsa0JBQXlCLEFBQVAsb0JBQU8sSUFBSTs7O0FBRzlDO2FBRUcsV0FBVztBQUNkLGtCQUFRLElBQUk7QUFDWixnQkFBTSxHQUFHLE9BQU8sT0FBTztBQUN2Qjs7QUFHQSxrQkFBUSxNQUFNLHdCQUF3Qjs7O0FBSzVDLFVBQU0sR0FBRyxHQUFHLFdBQVcsQ0FBQyxNQUFNLGtCQUFrQjtBQUVoRCxVQUFNLE9BQU87QUFDWCxZQUFNLENBQUUsZUFBZ0I7QUFHeEIsWUFBTSxZQUFZLFlBQVksU0FBUyxPQUFPLENBQUMsU0FBUyxLQUFLLFNBQVM7QUFFdEUsVUFBSSxVQUFVLFNBQVM7QUFDckIsY0FBTSxhQUE4QztBQUVwRCxrQkFBVSxRQUFRLENBQUM7QUFDakIsZ0JBQU0sQ0FBRSxNQUFNLE9BQU8sUUFBUSxNQUFPO0FBQ3BDLGdCQUFNLFlBQVksYUFBYTtBQUMvQixnQkFBTSxNQUFNO0FBRVoscUJBQVcsTUFBTTtZQUNmO1lBQ0E7WUFDQTtZQUNBO1lBQ0E7WUFDQTtZQUNBLFlBQVk7WUFDWixVQUFVOzs7QUFJZCxjQUFNLEdBQUcsWUFBWTtVQUNuQixNQUFNLFdBQVc7VUFDakIsUUFBUTs7QUFHVjs7QUFHRixVQUFJLFVBQVUsU0FBUztBQUNyQixnQkFBUSxLQUFLO0FBQ2IsY0FBTSxHQUFHLFlBQVk7VUFBRSxNQUFNLFdBQVc7O0FBQ3hDOzs7QUFLSixVQUFNLE9BQU87QUFDYixVQUFNLEdBQUcsT0FBTyxnQkFBZ0IsT0FBTyxnQkFBZ0I7QUFFdkQsK0JBQTJCO0FBQ3pCLFlBQU0sUUFBUSxNQUFNLFlBQVk7QUFDaEMsVUFBSSxDQUFDLFNBQVMsTUFBTSxTQUFTO0FBQzNCLGNBQU0sSUFBSSxNQUFNOztBQUdsQixZQUFNLFNBQVMsTUFBTSxvQkFBb0I7QUFFekMsYUFBTzs7QUFZVCwwQkFBc0I7QUFDcEIsWUFBTSxZQUFZLE1BQU0sUUFBUSxDQUFDLENBQUUsVUFBVyxTQUFTO0FBRXZELGFBQU8sVUFBVSxJQUNmLENBQUM7QUFDQyxjQUFNLENBQUUsR0FBRyxHQUFHLE9BQU8sUUFBUSxVQUFVLGNBQWMsVUFBVSxPQUFPLGNBQWU7QUFHckYsY0FBTSxDQUFDLFFBQVE7QUFDZixZQUFJLFNBQVM7VUFBRSxHQUFHO1VBQUcsR0FBRztVQUFHLEdBQUc7VUFBRyxHQUFHOztBQUNwQyxZQUFJLEtBQUssU0FBUztBQUNoQixtQkFBUyxzQkFBSyxTQUFMO1lBQWEsR0FBRyxLQUFLLFdBQVc7OztBQUkzQyxZQUFJLFdBQVc7QUFDZixZQUFJLGlCQUFpQixNQUFNO0FBQ3pCLHFCQUFXOztBQUliLFlBQUksYUFBYTtBQUNqQixZQUFJLGFBQWEsTUFBTTtBQUNyQix1QkFBYSxTQUFTOztBQUd4QixlQUFPO1VBQUU7VUFBRztVQUFHO1VBQU87VUFBUTtVQUFVO1VBQVk7VUFBUTs7Ozs7OztBQ3hLbEUsQUFNTyxNQUFLO0FBQUwsWUFBSztBQUNWO0FBQ0E7QUFDQTtBQUNBO0tBSlU7QUFPTCxNQUFLO0FBQUwsWUFBSztBQUNWO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0tBUFU7QUFVTCxNQUFLO0FBQUwsWUFBSztBQUNWLDBDQUFTLE9BQVQ7QUFDQSwwQ0FBUyxPQUFUO0FBQ0EsMkNBQVUsUUFBVjtLQUhVO0FBTUwsTUFBSztBQUFMLFlBQUs7QUFDVjtBQUNBO0tBRlU7QUFvQkwsUUFBTSxrQkFBa0I7SUFDN0IsT0FBTztJQUNQLFFBQVE7SUFDUixVQUFVO0lBQ1YsV0FBVztJQUNYLFVBQVU7SUFDVixXQUFXOzsiLAogICJuYW1lcyI6IFtdCn0K
