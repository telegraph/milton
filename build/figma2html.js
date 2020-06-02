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
    function getRootFrames() {
      const {currentPage} = figma;
      const rootFrames = currentPage.children.filter((node) => node.type === "FRAME");
      if (rootFrames.length < 1) {
        console.warn("No frames");
        figma.ui.postMessage({
          type: MSG_EVENTS.NO_FRAMES
        });
        return;
      }
      const framesData = {};
      rootFrames.forEach((frame) => {
        const {name, width: width2, height: height2, id} = frame;
        const textNodes = getTextNodes(frame);
        const uid = genRandomUid();
        framesData[id] = {
          name,
          width: width2,
          height: height2,
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
    }
    async function handleRender(frameId) {
      try {
        const frame = figma.getNodeById(frameId);
        if (!frame || frame.type !== "FRAME") {
          throw new Error("Missing frame");
        }
        const svg = await frame.exportAsync({
          format: "SVG",
          svgOutlineText: false,
          svgSimplifyStroke: true
        });
        figma.ui.postMessage({
          type: MSG_EVENTS.RENDER,
          frameId,
          svg
        });
      } catch (err) {
        figma.ui.postMessage({
          type: MSG_EVENTS.ERROR,
          errorText: `Render failed: ${err != null ? err : err.message}`
        });
      }
    }
    function getTextNodes(frame) {
      const textNodes = frame.findAll(({type}) => type === "TEXT");
      const {absoluteTransform} = frame;
      const rootX = absoluteTransform[0][2];
      const rootY = absoluteTransform[1][2];
      return textNodes.map((node) => {
        const {absoluteTransform: absoluteTransform2, width: width2, height: height2, fontSize: fontSizeData, fontName, fills, characters} = node;
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
          width: width2,
          height: height2,
          fontSize,
          fontFamily,
          colour,
          characters
        };
      });
    }
    function handleReceivedMsg(msg) {
      const {type, width: width2, height: height2, frameId} = msg;
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
          getRootFrames();
          break;
        case MSG_EVENTS.RENDER:
          console.log("plugin msg: render", frameId);
          handleRender(frameId);
          break;
        case MSG_EVENTS.RESIZE:
          console.log("plugin msg: resize");
          figma.ui.resize(width2, height2);
          break;
        default:
          console.error("Unknown post message", msg);
      }
    }
    figma.ui.on("message", (e) => handleReceivedMsg(e));
    figma.showUI(__html__);
    const {width, height} = figma.viewport.bounds;
    const {zoom} = figma.viewport;
    const initialWindowWidth = Math.round(width * zoom);
    const initialWindowHeight = Math.round(height * zoom);
    figma.ui.resize(initialWindowWidth, initialWindowHeight);
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
  var OUTPUT_FORMATS;
  (function(OUTPUT_FORMATS2) {
    OUTPUT_FORMATS2[OUTPUT_FORMATS2["INLINE"] = 0] = "INLINE";
    OUTPUT_FORMATS2[OUTPUT_FORMATS2["IFRAME"] = 1] = "IFRAME";
  })(OUTPUT_FORMATS || (OUTPUT_FORMATS = {}));
  require_index();
})();
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL2luZGV4LnRzeCIsICJzcmMvY29uc3RhbnRzLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgeyBNU0dfRVZFTlRTIH0gZnJvbSBcIi4vY29uc3RhbnRzXCI7XG5pbXBvcnQgeyBNc2dGcmFtZXNUeXBlLCBNc2dOb0ZyYW1lc1R5cGUsIE1zZ1JlbmRlclR5cGUsIE1zZ0Vycm9yVHlwZSwgRnJhbWVEYXRhVHlwZSB9IGZyb20gXCIuL3VpXCI7XG5cbi8vIEdlbmVyYXRlIGEgdW5pcXVlIGlkIHByZWZpeGVkIHdpdGggaWRlbnRpZmVyIHN0cmluZyBmb3Igc2FmZSB1c2UgYXMgSFRNTCBJRFxuLy8gTm90ZTogRmlnbWEgc2VlbXMgdG8gc3R1YiAudG9TdHJpbmcgZm9yIHNlY3VyaXR5P1xuZnVuY3Rpb24gZ2VuUmFuZG9tVWlkKCkge1xuICBjb25zdCBybmQgPSBNYXRoLnJhbmRvbSgpO1xuICBjb25zdCB1aWQgPSBybmQudG9TdHJpbmcoKS5zdWJzdHIoMik7XG4gIHJldHVybiBgZjJoLSR7dWlkfWA7XG59XG5cbmZ1bmN0aW9uIGdldFJvb3RGcmFtZXMoKSB7XG4gIGNvbnN0IHsgY3VycmVudFBhZ2UgfSA9IGZpZ21hO1xuICBjb25zdCByb290RnJhbWVzID0gY3VycmVudFBhZ2UuY2hpbGRyZW4uZmlsdGVyKChub2RlKSA9PiBub2RlLnR5cGUgPT09IFwiRlJBTUVcIikgYXMgRnJhbWVOb2RlW107XG5cbiAgLy8gUmV0dXJuIGVycm9yIGlmIHRoZXJlJ3Mgbm8gZnJhbWVzIG9uIHRoZSBjdXJyZW50IHBhZ2VcbiAgaWYgKHJvb3RGcmFtZXMubGVuZ3RoIDwgMSkge1xuICAgIGNvbnNvbGUud2FybihcIk5vIGZyYW1lc1wiKTtcbiAgICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7IHR5cGU6IE1TR19FVkVOVFMuTk9fRlJBTUVTIH0gYXMgTXNnTm9GcmFtZXNUeXBlKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBmcmFtZXNEYXRhOiB7IFtpZDogc3RyaW5nXTogRnJhbWVEYXRhVHlwZSB9ID0ge307XG5cbiAgcm9vdEZyYW1lcy5mb3JFYWNoKChmcmFtZSkgPT4ge1xuICAgIGNvbnN0IHsgbmFtZSwgd2lkdGgsIGhlaWdodCwgaWQgfSA9IGZyYW1lO1xuICAgIGNvbnN0IHRleHROb2RlcyA9IGdldFRleHROb2RlcyhmcmFtZSk7XG4gICAgY29uc3QgdWlkID0gZ2VuUmFuZG9tVWlkKCk7XG5cbiAgICBmcmFtZXNEYXRhW2lkXSA9IHtcbiAgICAgIG5hbWUsXG4gICAgICB3aWR0aCxcbiAgICAgIGhlaWdodCxcbiAgICAgIGlkLFxuICAgICAgdGV4dE5vZGVzLFxuICAgICAgdWlkLFxuICAgICAgcmVzcG9uc2l2ZTogZmFsc2UsXG4gICAgICBzZWxlY3RlZDogdHJ1ZSxcbiAgICB9O1xuICB9KTtcblxuICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7XG4gICAgdHlwZTogTVNHX0VWRU5UUy5GT1VORF9GUkFNRVMsXG4gICAgZnJhbWVzOiBmcmFtZXNEYXRhLFxuICB9IGFzIE1zZ0ZyYW1lc1R5cGUpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVSZW5kZXIoZnJhbWVJZDogc3RyaW5nKSB7XG4gIHRyeSB7XG4gICAgY29uc3QgZnJhbWUgPSBmaWdtYS5nZXROb2RlQnlJZChmcmFtZUlkKTtcbiAgICBpZiAoIWZyYW1lIHx8IGZyYW1lLnR5cGUgIT09IFwiRlJBTUVcIikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyBmcmFtZVwiKTtcbiAgICB9XG5cbiAgICBjb25zdCBzdmcgPSBhd2FpdCBmcmFtZS5leHBvcnRBc3luYyh7XG4gICAgICBmb3JtYXQ6IFwiU1ZHXCIsXG4gICAgICBzdmdPdXRsaW5lVGV4dDogZmFsc2UsXG4gICAgICBzdmdTaW1wbGlmeVN0cm9rZTogdHJ1ZSxcbiAgICB9KTtcblxuICAgIGZpZ21hLnVpLnBvc3RNZXNzYWdlKHtcbiAgICAgIHR5cGU6IE1TR19FVkVOVFMuUkVOREVSLFxuICAgICAgZnJhbWVJZCxcbiAgICAgIHN2ZyxcbiAgICB9IGFzIE1zZ1JlbmRlclR5cGUpO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7XG4gICAgICB0eXBlOiBNU0dfRVZFTlRTLkVSUk9SLFxuICAgICAgZXJyb3JUZXh0OiBgUmVuZGVyIGZhaWxlZDogJHtlcnIgPz8gZXJyLm1lc3NhZ2V9YCxcbiAgICB9IGFzIE1zZ0Vycm9yVHlwZSk7XG4gIH1cbn1cblxuZXhwb3J0IHR5cGUgdGV4dE5vZGVTZWxlY3RlZFByb3BzID0gUGljazxUZXh0Tm9kZSwgXCJ4XCIgfCBcInlcIiB8IFwid2lkdGhcIiB8IFwiaGVpZ2h0XCIgfCBcImNoYXJhY3RlcnNcIj47XG5cbmV4cG9ydCBpbnRlcmZhY2UgdGV4dERhdGEgZXh0ZW5kcyB0ZXh0Tm9kZVNlbGVjdGVkUHJvcHMge1xuICBjb2xvdXI6IHsgcjogbnVtYmVyOyBnOiBudW1iZXI7IGI6IG51bWJlcjsgYTogbnVtYmVyIH07XG4gIGZvbnRTaXplOiBudW1iZXI7XG4gIGZvbnRGYW1pbHk6IHN0cmluZztcbn1cblxuLy8gRXh0cmFjdCBvYmplY3QgcHJvcGVydGllcyBmcm9tIHRleHROb2RlIGZvciBwYXNzaW5nIHZpYSBwb3N0TWVzc2FnZVxuZnVuY3Rpb24gZ2V0VGV4dE5vZGVzKGZyYW1lOiBGcmFtZU5vZGUpOiB0ZXh0RGF0YVtdIHtcbiAgY29uc3QgdGV4dE5vZGVzID0gZnJhbWUuZmluZEFsbCgoeyB0eXBlIH0pID0+IHR5cGUgPT09IFwiVEVYVFwiKSBhcyBUZXh0Tm9kZVtdO1xuICBjb25zdCB7IGFic29sdXRlVHJhbnNmb3JtIH0gPSBmcmFtZTtcbiAgY29uc3Qgcm9vdFggPSBhYnNvbHV0ZVRyYW5zZm9ybVswXVsyXTtcbiAgY29uc3Qgcm9vdFkgPSBhYnNvbHV0ZVRyYW5zZm9ybVsxXVsyXTtcblxuICByZXR1cm4gdGV4dE5vZGVzLm1hcChcbiAgICAobm9kZSk6IHRleHREYXRhID0+IHtcbiAgICAgIGNvbnN0IHsgYWJzb2x1dGVUcmFuc2Zvcm0sIHdpZHRoLCBoZWlnaHQsIGZvbnRTaXplOiBmb250U2l6ZURhdGEsIGZvbnROYW1lLCBmaWxscywgY2hhcmFjdGVycyB9ID0gbm9kZTtcblxuICAgICAgLy8gTk9URTogRmlnbWEgbm9kZSB4LCB5IGFyZSByZWxhdGl2ZSB0byBmaXJzdCBwYXJlbnQsIHdlIHdhbnQgdGhlbVxuICAgICAgLy8gcmVsYXRpdmUgdG8gdGhlIHJvb3QgZnJhbWVcbiAgICAgIGNvbnN0IHRleHRYID0gYWJzb2x1dGVUcmFuc2Zvcm1bMF1bMl07XG4gICAgICBjb25zdCB0ZXh0WSA9IGFic29sdXRlVHJhbnNmb3JtWzFdWzJdO1xuICAgICAgY29uc3QgeCA9IHRleHRYIC0gcm9vdFg7XG4gICAgICBjb25zdCB5ID0gdGV4dFkgLSByb290WTtcblxuICAgICAgLy8gRXh0cmFjdCBiYXNpYyBmaWxsIGNvbG91clxuICAgICAgY29uc3QgW2ZpbGxdID0gZmlsbHM7XG4gICAgICBsZXQgY29sb3VyID0geyByOiAwLCBnOiAwLCBiOiAwLCBhOiAxIH07XG4gICAgICBpZiAoZmlsbC50eXBlID09PSBcIlNPTElEXCIpIHtcbiAgICAgICAgY29sb3VyID0geyAuLi5jb2xvdXIsIGE6IGZpbGwub3BhY2l0eSB8fCAxIH07XG4gICAgICB9XG5cbiAgICAgIC8vIEV4dHJhY3QgZm9udCBmYW1pbHlcbiAgICAgIGxldCBmb250U2l6ZSA9IDE2O1xuICAgICAgaWYgKGZvbnRTaXplRGF0YSAhPT0gZmlnbWEubWl4ZWQpIHtcbiAgICAgICAgZm9udFNpemUgPSBmb250U2l6ZURhdGE7XG4gICAgICB9XG5cbiAgICAgIC8vIEV4dHJhY3QgZm9udCBmYW1pbHlcbiAgICAgIGxldCBmb250RmFtaWx5ID0gXCJBcmlhbFwiO1xuICAgICAgaWYgKGZvbnROYW1lICE9PSBmaWdtYS5taXhlZCkge1xuICAgICAgICBmb250RmFtaWx5ID0gZm9udE5hbWUuZmFtaWx5O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4geyB4LCB5LCB3aWR0aCwgaGVpZ2h0LCBmb250U2l6ZSwgZm9udEZhbWlseSwgY29sb3VyLCBjaGFyYWN0ZXJzIH07XG4gICAgfVxuICApO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBvc3RNc2cge1xuICB0eXBlOiBNU0dfRVZFTlRTO1xuICBmcmFtZUlkOiBzdHJpbmc7XG4gIHdpZHRoOiBudW1iZXI7XG4gIGhlaWdodDogbnVtYmVyO1xufVxuLy8gSGFuZGxlIG1lc3NhZ2VzIGZyb20gdGhlIFVJXG5mdW5jdGlvbiBoYW5kbGVSZWNlaXZlZE1zZyhtc2c6IFBvc3RNc2cpIHtcbiAgY29uc3QgeyB0eXBlLCB3aWR0aCwgaGVpZ2h0LCBmcmFtZUlkIH0gPSBtc2c7XG5cbiAgc3dpdGNoICh0eXBlKSB7XG4gICAgY2FzZSBNU0dfRVZFTlRTLkVSUk9SOlxuICAgICAgY29uc29sZS5sb2coXCJwbHVnaW4gbXNnOiBlcnJvclwiKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSBNU0dfRVZFTlRTLkNMT1NFOlxuICAgICAgY29uc29sZS5sb2coXCJwbHVnaW4gbXNnOiBjbG9zZVwiKTtcbiAgICAgIGZpZ21hLmNsb3NlUGx1Z2luKCk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgTVNHX0VWRU5UUy5ET01fUkVBRFk6XG4gICAgICBjb25zb2xlLmxvZyhcInBsdWdpbiBtc2c6IERPTSBSRUFEWVwiKTtcbiAgICAgIGdldFJvb3RGcmFtZXMoKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSBNU0dfRVZFTlRTLlJFTkRFUjpcbiAgICAgIGNvbnNvbGUubG9nKFwicGx1Z2luIG1zZzogcmVuZGVyXCIsIGZyYW1lSWQpO1xuICAgICAgaGFuZGxlUmVuZGVyKGZyYW1lSWQpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIE1TR19FVkVOVFMuUkVTSVpFOlxuICAgICAgY29uc29sZS5sb2coXCJwbHVnaW4gbXNnOiByZXNpemVcIik7XG4gICAgICBmaWdtYS51aS5yZXNpemUod2lkdGgsIGhlaWdodCk7XG4gICAgICBicmVhaztcblxuICAgIGRlZmF1bHQ6XG4gICAgICBjb25zb2xlLmVycm9yKFwiVW5rbm93biBwb3N0IG1lc3NhZ2VcIiwgbXNnKTtcbiAgfVxufVxuXG4vLyBMaXN0ZW4gZm9yIG1lc3NhZ2VzIGZyb20gdGhlIFVJXG4vLyBOT1RFOiBMaXN0ZW4gZm9yIERPTV9SRUFEWSBtZXNzYWdlIHRvIGtpY2stb2ZmIG1haW4gZnVuY3Rpb25cbmZpZ21hLnVpLm9uKFwibWVzc2FnZVwiLCAoZSkgPT4gaGFuZGxlUmVjZWl2ZWRNc2coZSkpO1xuXG4vLyBSZW5kZXIgdGhlIERPTVxuLy8gTk9URTogb24gc3VjY2Vzc2Z1bCBVSSByZW5kZXIgYSBwb3N0IG1lc3NhZ2UgaXMgc2VuZCBiYWNrIG9mIERPTV9SRUFEWVxuZmlnbWEuc2hvd1VJKF9faHRtbF9fKTtcblxuLy8gUmVzaXplIFVJIHRvIG1heCB2aWV3cG9ydCBkaW1lbnNpb25zXG5jb25zdCB7IHdpZHRoLCBoZWlnaHQgfSA9IGZpZ21hLnZpZXdwb3J0LmJvdW5kcztcbmNvbnN0IHsgem9vbSB9ID0gZmlnbWEudmlld3BvcnQ7XG5jb25zdCBpbml0aWFsV2luZG93V2lkdGggPSBNYXRoLnJvdW5kKHdpZHRoICogem9vbSk7XG5jb25zdCBpbml0aWFsV2luZG93SGVpZ2h0ID0gTWF0aC5yb3VuZChoZWlnaHQgKiB6b29tKTtcbmZpZ21hLnVpLnJlc2l6ZShpbml0aWFsV2luZG93V2lkdGgsIGluaXRpYWxXaW5kb3dIZWlnaHQpO1xuIiwgImV4cG9ydCBlbnVtIFNUQUdFUyB7XG4gIENIT09TRV9GUkFNRVMsXG4gIFBSRVZJRVdfT1VUUFVULFxuICBSRVNQT05TSVZFX1BSRVZJRVcsXG4gIFNBVkVfT1VUUFVULFxufVxuXG5leHBvcnQgZW51bSBNU0dfRVZFTlRTIHtcbiAgRE9NX1JFQURZLFxuICBOT19GUkFNRVMsXG4gIEZPVU5EX0ZSQU1FUyxcbiAgUkVTSVpFLFxuICBSRU5ERVIsXG4gIENMT1NFLFxuICBFUlJPUixcbn1cblxuZXhwb3J0IGVudW0gT1VUUFVUX0ZPUk1BVFMge1xuICBJTkxJTkUsXG4gIElGUkFNRSxcbn1cblxuZXhwb3J0IGNvbnN0IFVJX1RFWFQgPSB7XG4gIEVSUk9SX1VORVhQRUNURUQ6IFwiVW5leHBlY3RlZCBlcnJvclwiLFxuICBFUlJPUl9NSVNTSU5HX0ZSQU1FUzogXCJObyBmcmFtZXMgZm91bmQuIFBsZWFzZSBhZGQgc29tZSBmcmFtZXMgdG8gdGhlIHBhZ2UuXCIsXG4gIFdBUk5fTk9fVEFSR0VUUzogXCJTdGFuZGFyZCBmcmFtZXMgbm90IGZvdW5kLiBQbGVhc2Ugc2VsZWN0IHRhcmdldCBmcmFtZXMuXCIsXG4gIFdBUk5fVE9PX01BTllfVEFSR0VUUzogXCJQbGVhc2Ugc2VsZWN0IHRocmVlIHRhcmdldCBmcmFtZXNcIixcbiAgSU5GT19QUkVWSUVXOiBcIlByZXZpZXcgZWFjaCBmcmFtZSBvdXRwdXRcIixcbiAgVElUTEVfQ0hPT1NFX0ZSQU1FOiBcIkNob29zZSB3aGljaCBmcmFtZXMgdG8gZXhwb3J0XCIsXG4gIFRJVExFX1BSRVZJRVc6IFwiUHJldmlld1wiLFxuICBUSVRMRV9SRVNQT05TSVZFX1BSRVZJRVc6IFwiUmVzcG9uc2l2ZSBwcmV2aWV3XCIsXG4gIFRJTEVfT1VUUFVUOiBcIkV4cG9ydFwiLFxuICBCVVRUT05fTkVYVDogXCJOZXh0XCIsXG4gIEJVVFRPTl9ET1dOTE9BRDogXCJEb3dubG9hZFwiLFxuICBCVVRUT05fUFJFVklPVVM6IFwiQmFja1wiLFxufTtcblxuZXhwb3J0IGNvbnN0IElOSVRJQUxfVUlfU0laRSA9IHtcbiAgd2lkdGg6IDQ4MCxcbiAgaGVpZ2h0OiA1MDAsXG4gIG1heFdpZHRoOiAxMjAwLFxuICBtYXhIZWlnaHQ6IDkwMCxcbiAgbWluV2lkdGg6IDQyMCxcbiAgbWluSGVpZ2h0OiA0ODAsXG59O1xuXG5leHBvcnQgY29uc3QgRlJBTUVfV0FSTklOR19TSVpFID0gMzAwO1xuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtB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
