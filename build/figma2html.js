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
      const framesData = rootFrames.map((frame) => {
        const {name, width: width2, height: height2, id} = frame;
        const textNodes = getTextNodes(frame);
        return {
          name,
          width: width2,
          height: height2,
          id,
          textNodes,
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL2luZGV4LnRzeCIsICJzcmMvY29uc3RhbnRzLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgeyBNU0dfRVZFTlRTIH0gZnJvbSBcIi4vY29uc3RhbnRzXCI7XG5pbXBvcnQgeyBNc2dGcmFtZXNUeXBlLCBNc2dOb0ZyYW1lc1R5cGUsIE1zZ1JlbmRlclR5cGUsIE1zZ0Vycm9yVHlwZSB9IGZyb20gXCIuL3VpXCI7XG5cbmZ1bmN0aW9uIGdldFJvb3RGcmFtZXMoKSB7XG4gIGNvbnN0IHsgY3VycmVudFBhZ2UgfSA9IGZpZ21hO1xuICBjb25zdCByb290RnJhbWVzID0gY3VycmVudFBhZ2UuY2hpbGRyZW4uZmlsdGVyKChub2RlKSA9PiBub2RlLnR5cGUgPT09IFwiRlJBTUVcIikgYXMgRnJhbWVOb2RlW107XG5cbiAgLy8gUmV0dXJuIGVycm9yIGlmIHRoZXJlJ3Mgbm8gZnJhbWVzIG9uIHRoZSBjdXJyZW50IHBhZ2VcbiAgaWYgKHJvb3RGcmFtZXMubGVuZ3RoIDwgMSkge1xuICAgIGNvbnNvbGUud2FybihcIk5vIGZyYW1lc1wiKTtcbiAgICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7IHR5cGU6IE1TR19FVkVOVFMuTk9fRlJBTUVTIH0gYXMgTXNnTm9GcmFtZXNUeXBlKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBmcmFtZXNEYXRhID0gcm9vdEZyYW1lcy5tYXAoKGZyYW1lKSA9PiB7XG4gICAgY29uc3QgeyBuYW1lLCB3aWR0aCwgaGVpZ2h0LCBpZCB9ID0gZnJhbWU7XG4gICAgY29uc3QgdGV4dE5vZGVzID0gZ2V0VGV4dE5vZGVzKGZyYW1lKTtcblxuICAgIHJldHVybiB7XG4gICAgICBuYW1lLFxuICAgICAgd2lkdGgsXG4gICAgICBoZWlnaHQsXG4gICAgICBpZCxcbiAgICAgIHRleHROb2RlcyxcbiAgICAgIHJlc3BvbnNpdmU6IGZhbHNlLFxuICAgICAgc2VsZWN0ZWQ6IHRydWUsXG4gICAgfTtcbiAgfSk7XG5cbiAgZmlnbWEudWkucG9zdE1lc3NhZ2Uoe1xuICAgIHR5cGU6IE1TR19FVkVOVFMuRk9VTkRfRlJBTUVTLFxuICAgIGZyYW1lczogZnJhbWVzRGF0YSxcbiAgfSBhcyBNc2dGcmFtZXNUeXBlKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlUmVuZGVyKGZyYW1lSWQ6IHN0cmluZykge1xuICB0cnkge1xuICAgIGNvbnN0IGZyYW1lID0gZmlnbWEuZ2V0Tm9kZUJ5SWQoZnJhbWVJZCk7XG4gICAgaWYgKCFmcmFtZSB8fCBmcmFtZS50eXBlICE9PSBcIkZSQU1FXCIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgZnJhbWVcIik7XG4gICAgfVxuXG4gICAgY29uc3Qgc3ZnID0gYXdhaXQgZnJhbWUuZXhwb3J0QXN5bmMoe1xuICAgICAgZm9ybWF0OiBcIlNWR1wiLFxuICAgICAgc3ZnT3V0bGluZVRleHQ6IGZhbHNlLFxuICAgICAgc3ZnU2ltcGxpZnlTdHJva2U6IHRydWUsXG4gICAgfSk7XG5cbiAgICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7XG4gICAgICB0eXBlOiBNU0dfRVZFTlRTLlJFTkRFUixcbiAgICAgIGZyYW1lSWQsXG4gICAgICBzdmcsXG4gICAgfSBhcyBNc2dSZW5kZXJUeXBlKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgZmlnbWEudWkucG9zdE1lc3NhZ2Uoe1xuICAgICAgdHlwZTogTVNHX0VWRU5UUy5FUlJPUixcbiAgICAgIGVycm9yVGV4dDogYFJlbmRlciBmYWlsZWQ6ICR7ZXJyID8/IGVyci5tZXNzYWdlfWAsXG4gICAgfSBhcyBNc2dFcnJvclR5cGUpO1xuICB9XG59XG5cbmV4cG9ydCB0eXBlIHRleHROb2RlU2VsZWN0ZWRQcm9wcyA9IFBpY2s8VGV4dE5vZGUsIFwieFwiIHwgXCJ5XCIgfCBcIndpZHRoXCIgfCBcImhlaWdodFwiIHwgXCJjaGFyYWN0ZXJzXCI+O1xuXG5leHBvcnQgaW50ZXJmYWNlIHRleHREYXRhIGV4dGVuZHMgdGV4dE5vZGVTZWxlY3RlZFByb3BzIHtcbiAgY29sb3VyOiB7IHI6IG51bWJlcjsgZzogbnVtYmVyOyBiOiBudW1iZXI7IGE6IG51bWJlciB9O1xuICBmb250U2l6ZTogbnVtYmVyO1xuICBmb250RmFtaWx5OiBzdHJpbmc7XG59XG5cbi8vIEV4dHJhY3Qgb2JqZWN0IHByb3BlcnRpZXMgZnJvbSB0ZXh0Tm9kZSBmb3IgcGFzc2luZyB2aWEgcG9zdE1lc3NhZ2VcbmZ1bmN0aW9uIGdldFRleHROb2RlcyhmcmFtZTogRnJhbWVOb2RlKTogdGV4dERhdGFbXSB7XG4gIGNvbnN0IHRleHROb2RlcyA9IGZyYW1lLmZpbmRBbGwoKHsgdHlwZSB9KSA9PiB0eXBlID09PSBcIlRFWFRcIikgYXMgVGV4dE5vZGVbXTtcbiAgY29uc3QgeyBhYnNvbHV0ZVRyYW5zZm9ybSB9ID0gZnJhbWU7XG4gIGNvbnN0IHJvb3RYID0gYWJzb2x1dGVUcmFuc2Zvcm1bMF1bMl07XG4gIGNvbnN0IHJvb3RZID0gYWJzb2x1dGVUcmFuc2Zvcm1bMV1bMl07XG5cbiAgcmV0dXJuIHRleHROb2Rlcy5tYXAoXG4gICAgKG5vZGUpOiB0ZXh0RGF0YSA9PiB7XG4gICAgICBjb25zdCB7IGFic29sdXRlVHJhbnNmb3JtLCB3aWR0aCwgaGVpZ2h0LCBmb250U2l6ZTogZm9udFNpemVEYXRhLCBmb250TmFtZSwgZmlsbHMsIGNoYXJhY3RlcnMgfSA9IG5vZGU7XG5cbiAgICAgIC8vIE5PVEU6IEZpZ21hIG5vZGUgeCwgeSBhcmUgcmVsYXRpdmUgdG8gZmlyc3QgcGFyZW50LCB3ZSB3YW50IHRoZW1cbiAgICAgIC8vIHJlbGF0aXZlIHRvIHRoZSByb290IGZyYW1lXG4gICAgICBjb25zdCB0ZXh0WCA9IGFic29sdXRlVHJhbnNmb3JtWzBdWzJdO1xuICAgICAgY29uc3QgdGV4dFkgPSBhYnNvbHV0ZVRyYW5zZm9ybVsxXVsyXTtcbiAgICAgIGNvbnN0IHggPSB0ZXh0WCAtIHJvb3RYO1xuICAgICAgY29uc3QgeSA9IHRleHRZIC0gcm9vdFk7XG5cbiAgICAgIC8vIEV4dHJhY3QgYmFzaWMgZmlsbCBjb2xvdXJcbiAgICAgIGNvbnN0IFtmaWxsXSA9IGZpbGxzO1xuICAgICAgbGV0IGNvbG91ciA9IHsgcjogMCwgZzogMCwgYjogMCwgYTogMSB9O1xuICAgICAgaWYgKGZpbGwudHlwZSA9PT0gXCJTT0xJRFwiKSB7XG4gICAgICAgIGNvbG91ciA9IHsgLi4uY29sb3VyLCBhOiBmaWxsLm9wYWNpdHkgfHwgMSB9O1xuICAgICAgfVxuXG4gICAgICAvLyBFeHRyYWN0IGZvbnQgZmFtaWx5XG4gICAgICBsZXQgZm9udFNpemUgPSAxNjtcbiAgICAgIGlmIChmb250U2l6ZURhdGEgIT09IGZpZ21hLm1peGVkKSB7XG4gICAgICAgIGZvbnRTaXplID0gZm9udFNpemVEYXRhO1xuICAgICAgfVxuXG4gICAgICAvLyBFeHRyYWN0IGZvbnQgZmFtaWx5XG4gICAgICBsZXQgZm9udEZhbWlseSA9IFwiQXJpYWxcIjtcbiAgICAgIGlmIChmb250TmFtZSAhPT0gZmlnbWEubWl4ZWQpIHtcbiAgICAgICAgZm9udEZhbWlseSA9IGZvbnROYW1lLmZhbWlseTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHsgeCwgeSwgd2lkdGgsIGhlaWdodCwgZm9udFNpemUsIGZvbnRGYW1pbHksIGNvbG91ciwgY2hhcmFjdGVycyB9O1xuICAgIH1cbiAgKTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQb3N0TXNnIHtcbiAgdHlwZTogTVNHX0VWRU5UUztcbiAgZnJhbWVJZDogc3RyaW5nO1xuICB3aWR0aDogbnVtYmVyO1xuICBoZWlnaHQ6IG51bWJlcjtcbn1cbi8vIEhhbmRsZSBtZXNzYWdlcyBmcm9tIHRoZSBVSVxuZnVuY3Rpb24gaGFuZGxlUmVjZWl2ZWRNc2cobXNnOiBQb3N0TXNnKSB7XG4gIGNvbnN0IHsgdHlwZSwgd2lkdGgsIGhlaWdodCwgZnJhbWVJZCB9ID0gbXNnO1xuXG4gIHN3aXRjaCAodHlwZSkge1xuICAgIGNhc2UgTVNHX0VWRU5UUy5FUlJPUjpcbiAgICAgIGNvbnNvbGUubG9nKFwicGx1Z2luIG1zZzogZXJyb3JcIik7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgTVNHX0VWRU5UUy5DTE9TRTpcbiAgICAgIGNvbnNvbGUubG9nKFwicGx1Z2luIG1zZzogY2xvc2VcIik7XG4gICAgICBmaWdtYS5jbG9zZVBsdWdpbigpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIE1TR19FVkVOVFMuRE9NX1JFQURZOlxuICAgICAgY29uc29sZS5sb2coXCJwbHVnaW4gbXNnOiBET00gUkVBRFlcIik7XG4gICAgICBnZXRSb290RnJhbWVzKCk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgTVNHX0VWRU5UUy5SRU5ERVI6XG4gICAgICBjb25zb2xlLmxvZyhcInBsdWdpbiBtc2c6IHJlbmRlclwiLCBmcmFtZUlkKTtcbiAgICAgIGhhbmRsZVJlbmRlcihmcmFtZUlkKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSBNU0dfRVZFTlRTLlJFU0laRTpcbiAgICAgIGNvbnNvbGUubG9nKFwicGx1Z2luIG1zZzogcmVzaXplXCIpO1xuICAgICAgZmlnbWEudWkucmVzaXplKHdpZHRoLCBoZWlnaHQpO1xuICAgICAgYnJlYWs7XG5cbiAgICBkZWZhdWx0OlxuICAgICAgY29uc29sZS5lcnJvcihcIlVua25vd24gcG9zdCBtZXNzYWdlXCIsIG1zZyk7XG4gIH1cbn1cblxuLy8gTGlzdGVuIGZvciBtZXNzYWdlcyBmcm9tIHRoZSBVSVxuLy8gTk9URTogTGlzdGVuIGZvciBET01fUkVBRFkgbWVzc2FnZSB0byBraWNrLW9mZiBtYWluIGZ1bmN0aW9uXG5maWdtYS51aS5vbihcIm1lc3NhZ2VcIiwgKGUpID0+IGhhbmRsZVJlY2VpdmVkTXNnKGUpKTtcblxuLy8gUmVuZGVyIHRoZSBET01cbi8vIE5PVEU6IG9uIHN1Y2Nlc3NmdWwgVUkgcmVuZGVyIGEgcG9zdCBtZXNzYWdlIGlzIHNlbmQgYmFjayBvZiBET01fUkVBRFlcbmZpZ21hLnNob3dVSShfX2h0bWxfXyk7XG5cbi8vIFJlc2l6ZSBVSSB0byBtYXggdmlld3BvcnQgZGltZW5zaW9uc1xuY29uc3QgeyB3aWR0aCwgaGVpZ2h0IH0gPSBmaWdtYS52aWV3cG9ydC5ib3VuZHM7XG5jb25zdCB7IHpvb20gfSA9IGZpZ21hLnZpZXdwb3J0O1xuY29uc3QgaW5pdGlhbFdpbmRvd1dpZHRoID0gTWF0aC5yb3VuZCh3aWR0aCAqIHpvb20pO1xuY29uc3QgaW5pdGlhbFdpbmRvd0hlaWdodCA9IE1hdGgucm91bmQoaGVpZ2h0ICogem9vbSk7XG5maWdtYS51aS5yZXNpemUoaW5pdGlhbFdpbmRvd1dpZHRoLCBpbml0aWFsV2luZG93SGVpZ2h0KTtcbiIsICJleHBvcnQgZW51bSBTVEFHRVMge1xuICBDSE9PU0VfRlJBTUVTLFxuICBQUkVWSUVXX09VVFBVVCxcbiAgUkVTUE9OU0lWRV9QUkVWSUVXLFxuICBTQVZFX09VVFBVVCxcbn1cblxuZXhwb3J0IGVudW0gTVNHX0VWRU5UUyB7XG4gIERPTV9SRUFEWSxcbiAgTk9fRlJBTUVTLFxuICBGT1VORF9GUkFNRVMsXG4gIFJFU0laRSxcbiAgUkVOREVSLFxuICBDTE9TRSxcbiAgRVJST1IsXG59XG5cbmV4cG9ydCBlbnVtIE9VVFBVVF9GT1JNQVRTIHtcbiAgSU5MSU5FLFxuICBJRlJBTUUsXG59XG5cbmV4cG9ydCBjb25zdCBVSV9URVhUID0ge1xuICBFUlJPUl9VTkVYUEVDVEVEOiBcIlVuZXhwZWN0ZWQgZXJyb3JcIixcbiAgRVJST1JfTUlTU0lOR19GUkFNRVM6IFwiTm8gZnJhbWVzIGZvdW5kLiBQbGVhc2UgYWRkIHNvbWUgZnJhbWVzIHRvIHRoZSBwYWdlLlwiLFxuICBXQVJOX05PX1RBUkdFVFM6IFwiU3RhbmRhcmQgZnJhbWVzIG5vdCBmb3VuZC4gUGxlYXNlIHNlbGVjdCB0YXJnZXQgZnJhbWVzLlwiLFxuICBXQVJOX1RPT19NQU5ZX1RBUkdFVFM6IFwiUGxlYXNlIHNlbGVjdCB0aHJlZSB0YXJnZXQgZnJhbWVzXCIsXG4gIElORk9fUFJFVklFVzogXCJQcmV2aWV3IGVhY2ggZnJhbWUgb3V0cHV0XCIsXG4gIFRJVExFX0NIT09TRV9GUkFNRTogXCJDaG9vc2Ugd2hpY2ggZnJhbWVzIHRvIGV4cG9ydFwiLFxuICBUSVRMRV9QUkVWSUVXOiBcIlByZXZpZXdcIixcbiAgVElUTEVfUkVTUE9OU0lWRV9QUkVWSUVXOiBcIlJlc3BvbnNpdmUgcHJldmlld1wiLFxuICBUSUxFX09VVFBVVDogXCJFeHBvcnRcIixcbiAgQlVUVE9OX05FWFQ6IFwiTmV4dFwiLFxuICBCVVRUT05fRE9XTkxPQUQ6IFwiRG93bmxvYWRcIixcbiAgQlVUVE9OX1BSRVZJT1VTOiBcIkJhY2tcIixcbn07XG5cbmV4cG9ydCBjb25zdCBJTklUSUFMX1VJX1NJWkUgPSB7XG4gIHdpZHRoOiA0ODAsXG4gIGhlaWdodDogNTAwLFxuICBtYXhXaWR0aDogMTIwMCxcbiAgbWF4SGVpZ2h0OiA5MDAsXG4gIG1pbldpZHRoOiA0MjAsXG4gIG1pbkhlaWdodDogNDgwLFxufTtcblxuZXhwb3J0IGNvbnN0IEZSQU1FX1dBUk5JTkdfU0laRSA9IDMwMDtcbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFHQTtBQUNFLFlBQU0sQ0FBRSxlQUFnQjtBQUN4QixZQUFNLGFBQWEsWUFBWSxTQUFTLE9BQU8sQ0FBQyxTQUFTLEtBQUssU0FBUztBQUd2RSxVQUFJLFdBQVcsU0FBUztBQUN0QixnQkFBUSxLQUFLO0FBQ2IsY0FBTSxHQUFHLFlBQVk7VUFBRSxNQUFNLFdBQVc7O0FBQ3hDOztBQUdGLFlBQU0sYUFBYSxXQUFXLElBQUksQ0FBQztBQUNqQyxjQUFNLENBQUUsTUFBTSxlQUFPLGlCQUFRLE1BQU87QUFDcEMsY0FBTSxZQUFZLGFBQWE7QUFFL0IsZUFBTztVQUNMO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQSxZQUFZO1VBQ1osVUFBVTs7O0FBSWQsWUFBTSxHQUFHLFlBQVk7UUFDbkIsTUFBTSxXQUFXO1FBQ2pCLFFBQVE7OztBQUlaLGdDQUE0QjtBQUMxQjtBQUNFLGNB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
