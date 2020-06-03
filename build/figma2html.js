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
    figma.ui.on("message", (e) => handleReceivedMsg(e));
    figma.showUI(__html__);
    const {width, height} = figma.viewport.bounds;
    const {zoom} = figma.viewport;
    const initialWindowWidth = Math.round(width * zoom);
    const initialWindowHeight = Math.round(height * zoom);
    figma.ui.resize(initialWindowWidth, initialWindowHeight);
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
        frames: framesData,
        windowWidth: initialWindowWidth,
        windowHeight: initialWindowHeight
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
        const {absoluteTransform: absoluteTransform2, width: width2, height: height2, fontSize: fontSizeData, fontName, fills, characters, lineHeight, letterSpacing, textAlignHorizontal, textAlignVertical} = node;
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
          characters,
          lineHeight,
          letterSpacing,
          textAlignHorizontal,
          textAlignVertical
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL2luZGV4LnRzeCIsICJzcmMvY29uc3RhbnRzLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgeyBNU0dfRVZFTlRTIH0gZnJvbSBcIi4vY29uc3RhbnRzXCI7XG5pbXBvcnQgeyBNc2dGcmFtZXNUeXBlLCBNc2dOb0ZyYW1lc1R5cGUsIE1zZ1JlbmRlclR5cGUsIE1zZ0Vycm9yVHlwZSB9IGZyb20gXCIuL3VpXCI7XG5cbi8vIExpc3RlbiBmb3IgbWVzc2FnZXMgZnJvbSB0aGUgVUlcbi8vIE5PVEU6IExpc3RlbiBmb3IgRE9NX1JFQURZIG1lc3NhZ2UgdG8ga2ljay1vZmYgbWFpbiBmdW5jdGlvblxuZmlnbWEudWkub24oXCJtZXNzYWdlXCIsIChlKSA9PiBoYW5kbGVSZWNlaXZlZE1zZyhlKSk7XG5cbi8vIFJlbmRlciB0aGUgRE9NXG4vLyBOT1RFOiBvbiBzdWNjZXNzZnVsIFVJIHJlbmRlciBhIHBvc3QgbWVzc2FnZSBpcyBzZW5kIGJhY2sgb2YgRE9NX1JFQURZXG5maWdtYS5zaG93VUkoX19odG1sX18pO1xuXG4vLyBSZXNpemUgVUkgdG8gbWF4IHZpZXdwb3J0IGRpbWVuc2lvbnNcbmNvbnN0IHsgd2lkdGgsIGhlaWdodCB9ID0gZmlnbWEudmlld3BvcnQuYm91bmRzO1xuY29uc3QgeyB6b29tIH0gPSBmaWdtYS52aWV3cG9ydDtcbmNvbnN0IGluaXRpYWxXaW5kb3dXaWR0aCA9IE1hdGgucm91bmQod2lkdGggKiB6b29tKTtcbmNvbnN0IGluaXRpYWxXaW5kb3dIZWlnaHQgPSBNYXRoLnJvdW5kKGhlaWdodCAqIHpvb20pO1xuZmlnbWEudWkucmVzaXplKGluaXRpYWxXaW5kb3dXaWR0aCwgaW5pdGlhbFdpbmRvd0hlaWdodCk7XG5cbmZ1bmN0aW9uIGdldFJvb3RGcmFtZXMoKSB7XG4gIGNvbnN0IHsgY3VycmVudFBhZ2UgfSA9IGZpZ21hO1xuICBjb25zdCByb290RnJhbWVzID0gY3VycmVudFBhZ2UuY2hpbGRyZW4uZmlsdGVyKChub2RlKSA9PiBub2RlLnR5cGUgPT09IFwiRlJBTUVcIikgYXMgRnJhbWVOb2RlW107XG5cbiAgLy8gUmV0dXJuIGVycm9yIGlmIHRoZXJlJ3Mgbm8gZnJhbWVzIG9uIHRoZSBjdXJyZW50IHBhZ2VcbiAgaWYgKHJvb3RGcmFtZXMubGVuZ3RoIDwgMSkge1xuICAgIGNvbnNvbGUud2FybihcIk5vIGZyYW1lc1wiKTtcbiAgICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7IHR5cGU6IE1TR19FVkVOVFMuTk9fRlJBTUVTIH0gYXMgTXNnTm9GcmFtZXNUeXBlKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBmcmFtZXNEYXRhID0gcm9vdEZyYW1lcy5tYXAoKGZyYW1lKSA9PiB7XG4gICAgY29uc3QgeyBuYW1lLCB3aWR0aCwgaGVpZ2h0LCBpZCB9ID0gZnJhbWU7XG4gICAgY29uc3QgdGV4dE5vZGVzID0gZ2V0VGV4dE5vZGVzKGZyYW1lKTtcblxuICAgIHJldHVybiB7XG4gICAgICBuYW1lLFxuICAgICAgd2lkdGgsXG4gICAgICBoZWlnaHQsXG4gICAgICBpZCxcbiAgICAgIHRleHROb2RlcyxcbiAgICAgIHJlc3BvbnNpdmU6IGZhbHNlLFxuICAgICAgc2VsZWN0ZWQ6IHRydWUsXG4gICAgfTtcbiAgfSk7XG5cbiAgZmlnbWEudWkucG9zdE1lc3NhZ2Uoe1xuICAgIHR5cGU6IE1TR19FVkVOVFMuRk9VTkRfRlJBTUVTLFxuICAgIGZyYW1lczogZnJhbWVzRGF0YSxcbiAgICB3aW5kb3dXaWR0aDogaW5pdGlhbFdpbmRvd1dpZHRoLFxuICAgIHdpbmRvd0hlaWdodDogaW5pdGlhbFdpbmRvd0hlaWdodCxcbiAgfSBhcyBNc2dGcmFtZXNUeXBlKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlUmVuZGVyKGZyYW1lSWQ6IHN0cmluZykge1xuICB0cnkge1xuICAgIGNvbnN0IGZyYW1lID0gZmlnbWEuZ2V0Tm9kZUJ5SWQoZnJhbWVJZCk7XG4gICAgaWYgKCFmcmFtZSB8fCBmcmFtZS50eXBlICE9PSBcIkZSQU1FXCIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgZnJhbWVcIik7XG4gICAgfVxuXG4gICAgY29uc3Qgc3ZnID0gYXdhaXQgZnJhbWUuZXhwb3J0QXN5bmMoe1xuICAgICAgZm9ybWF0OiBcIlNWR1wiLFxuICAgICAgc3ZnT3V0bGluZVRleHQ6IGZhbHNlLFxuICAgICAgc3ZnU2ltcGxpZnlTdHJva2U6IHRydWUsXG4gICAgfSk7XG5cbiAgICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7XG4gICAgICB0eXBlOiBNU0dfRVZFTlRTLlJFTkRFUixcbiAgICAgIGZyYW1lSWQsXG4gICAgICBzdmcsXG4gICAgfSBhcyBNc2dSZW5kZXJUeXBlKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgZmlnbWEudWkucG9zdE1lc3NhZ2Uoe1xuICAgICAgdHlwZTogTVNHX0VWRU5UUy5FUlJPUixcbiAgICAgIGVycm9yVGV4dDogYFJlbmRlciBmYWlsZWQ6ICR7ZXJyID8/IGVyci5tZXNzYWdlfWAsXG4gICAgfSBhcyBNc2dFcnJvclR5cGUpO1xuICB9XG59XG5cbmV4cG9ydCB0eXBlIHRleHROb2RlU2VsZWN0ZWRQcm9wcyA9IFBpY2s8XG4gIFRleHROb2RlLFxuICB8IFwieFwiXG4gIHwgXCJ5XCJcbiAgfCBcIndpZHRoXCJcbiAgfCBcImhlaWdodFwiXG4gIHwgXCJjaGFyYWN0ZXJzXCJcbiAgfCBcImxpbmVIZWlnaHRcIlxuICB8IFwibGV0dGVyU3BhY2luZ1wiXG4gIHwgXCJ0ZXh0QWxpZ25Ib3Jpem9udGFsXCJcbiAgfCBcInRleHRBbGlnblZlcnRpY2FsXCJcbj47XG5cbmV4cG9ydCBpbnRlcmZhY2UgdGV4dERhdGEgZXh0ZW5kcyB0ZXh0Tm9kZVNlbGVjdGVkUHJvcHMge1xuICBjb2xvdXI6IHsgcjogbnVtYmVyOyBnOiBudW1iZXI7IGI6IG51bWJlcjsgYTogbnVtYmVyIH07XG4gIGZvbnRTaXplOiBudW1iZXI7XG4gIGZvbnRGYW1pbHk6IHN0cmluZztcbn1cblxuLy8gRXh0cmFjdCBvYmplY3QgcHJvcGVydGllcyBmcm9tIHRleHROb2RlIGZvciBwYXNzaW5nIHZpYSBwb3N0TWVzc2FnZVxuZnVuY3Rpb24gZ2V0VGV4dE5vZGVzKGZyYW1lOiBGcmFtZU5vZGUpOiB0ZXh0RGF0YVtdIHtcbiAgY29uc3QgdGV4dE5vZGVzID0gZnJhbWUuZmluZEFsbCgoeyB0eXBlIH0pID0+IHR5cGUgPT09IFwiVEVYVFwiKSBhcyBUZXh0Tm9kZVtdO1xuICBjb25zdCB7IGFic29sdXRlVHJhbnNmb3JtIH0gPSBmcmFtZTtcbiAgY29uc3Qgcm9vdFggPSBhYnNvbHV0ZVRyYW5zZm9ybVswXVsyXTtcbiAgY29uc3Qgcm9vdFkgPSBhYnNvbHV0ZVRyYW5zZm9ybVsxXVsyXTtcblxuICByZXR1cm4gdGV4dE5vZGVzLm1hcChcbiAgICAobm9kZSk6IHRleHREYXRhID0+IHtcbiAgICAgIGNvbnN0IHtcbiAgICAgICAgYWJzb2x1dGVUcmFuc2Zvcm0sXG4gICAgICAgIHdpZHRoLFxuICAgICAgICBoZWlnaHQsXG4gICAgICAgIGZvbnRTaXplOiBmb250U2l6ZURhdGEsXG4gICAgICAgIGZvbnROYW1lLFxuICAgICAgICBmaWxscyxcbiAgICAgICAgY2hhcmFjdGVycyxcbiAgICAgICAgbGluZUhlaWdodCxcbiAgICAgICAgbGV0dGVyU3BhY2luZyxcbiAgICAgICAgdGV4dEFsaWduSG9yaXpvbnRhbCxcbiAgICAgICAgdGV4dEFsaWduVmVydGljYWwsXG4gICAgICB9ID0gbm9kZTtcblxuICAgICAgLy8gTk9URTogRmlnbWEgbm9kZSB4LCB5IGFyZSByZWxhdGl2ZSB0byBmaXJzdCBwYXJlbnQsIHdlIHdhbnQgdGhlbVxuICAgICAgLy8gcmVsYXRpdmUgdG8gdGhlIHJvb3QgZnJhbWVcbiAgICAgIGNvbnN0IHRleHRYID0gYWJzb2x1dGVUcmFuc2Zvcm1bMF1bMl07XG4gICAgICBjb25zdCB0ZXh0WSA9IGFic29sdXRlVHJhbnNmb3JtWzFdWzJdO1xuICAgICAgY29uc3QgeCA9IHRleHRYIC0gcm9vdFg7XG4gICAgICBjb25zdCB5ID0gdGV4dFkgLSByb290WTtcblxuICAgICAgLy8gRXh0cmFjdCBiYXNpYyBmaWxsIGNvbG91clxuICAgICAgY29uc3QgW2ZpbGxdID0gZmlsbHM7XG4gICAgICBsZXQgY29sb3VyID0geyByOiAwLCBnOiAwLCBiOiAwLCBhOiAxIH07XG4gICAgICBpZiAoZmlsbC50eXBlID09PSBcIlNPTElEXCIpIHtcbiAgICAgICAgY29sb3VyID0geyAuLi5jb2xvdXIsIGE6IGZpbGwub3BhY2l0eSB8fCAxIH07XG4gICAgICB9XG5cbiAgICAgIC8vIEV4dHJhY3QgZm9udCBmYW1pbHlcbiAgICAgIGxldCBmb250U2l6ZSA9IDE2O1xuICAgICAgaWYgKGZvbnRTaXplRGF0YSAhPT0gZmlnbWEubWl4ZWQpIHtcbiAgICAgICAgZm9udFNpemUgPSBmb250U2l6ZURhdGE7XG4gICAgICB9XG5cbiAgICAgIC8vIEV4dHJhY3QgZm9udCBmYW1pbHlcbiAgICAgIC8vIFRPRE86IENvbmZpcm0gZmFsbGJhY2sgZm9udHNcbiAgICAgIGxldCBmb250RmFtaWx5ID0gXCJBcmlhbFwiO1xuICAgICAgaWYgKGZvbnROYW1lICE9PSBmaWdtYS5taXhlZCkge1xuICAgICAgICBmb250RmFtaWx5ID0gZm9udE5hbWUuZmFtaWx5O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4ge1xuICAgICAgICB4LFxuICAgICAgICB5LFxuICAgICAgICB3aWR0aCxcbiAgICAgICAgaGVpZ2h0LFxuICAgICAgICBmb250U2l6ZSxcbiAgICAgICAgZm9udEZhbWlseSxcbiAgICAgICAgY29sb3VyLFxuICAgICAgICBjaGFyYWN0ZXJzLFxuICAgICAgICBsaW5lSGVpZ2h0LFxuICAgICAgICBsZXR0ZXJTcGFjaW5nLFxuICAgICAgICB0ZXh0QWxpZ25Ib3Jpem9udGFsLFxuICAgICAgICB0ZXh0QWxpZ25WZXJ0aWNhbCxcbiAgICAgIH07XG4gICAgfVxuICApO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBvc3RNc2cge1xuICB0eXBlOiBNU0dfRVZFTlRTO1xuICBmcmFtZUlkOiBzdHJpbmc7XG4gIHdpZHRoOiBudW1iZXI7XG4gIGhlaWdodDogbnVtYmVyO1xufVxuLy8gSGFuZGxlIG1lc3NhZ2VzIGZyb20gdGhlIFVJXG5mdW5jdGlvbiBoYW5kbGVSZWNlaXZlZE1zZyhtc2c6IFBvc3RNc2cpIHtcbiAgY29uc3QgeyB0eXBlLCB3aWR0aCwgaGVpZ2h0LCBmcmFtZUlkIH0gPSBtc2c7XG5cbiAgc3dpdGNoICh0eXBlKSB7XG4gICAgY2FzZSBNU0dfRVZFTlRTLkVSUk9SOlxuICAgICAgY29uc29sZS5sb2coXCJwbHVnaW4gbXNnOiBlcnJvclwiKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSBNU0dfRVZFTlRTLkNMT1NFOlxuICAgICAgY29uc29sZS5sb2coXCJwbHVnaW4gbXNnOiBjbG9zZVwiKTtcbiAgICAgIGZpZ21hLmNsb3NlUGx1Z2luKCk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgTVNHX0VWRU5UUy5ET01fUkVBRFk6XG4gICAgICBjb25zb2xlLmxvZyhcInBsdWdpbiBtc2c6IERPTSBSRUFEWVwiKTtcbiAgICAgIGdldFJvb3RGcmFtZXMoKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSBNU0dfRVZFTlRTLlJFTkRFUjpcbiAgICAgIGNvbnNvbGUubG9nKFwicGx1Z2luIG1zZzogcmVuZGVyXCIsIGZyYW1lSWQpO1xuICAgICAgaGFuZGxlUmVuZGVyKGZyYW1lSWQpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIE1TR19FVkVOVFMuUkVTSVpFOlxuICAgICAgY29uc29sZS5sb2coXCJwbHVnaW4gbXNnOiByZXNpemVcIik7XG4gICAgICBmaWdtYS51aS5yZXNpemUod2lkdGgsIGhlaWdodCk7XG4gICAgICBicmVhaztcblxuICAgIGRlZmF1bHQ6XG4gICAgICBjb25zb2xlLmVycm9yKFwiVW5rbm93biBwb3N0IG1lc3NhZ2VcIiwgbXNnKTtcbiAgfVxufVxuIiwgImV4cG9ydCBlbnVtIFNUQUdFUyB7XG4gIENIT09TRV9GUkFNRVMsXG4gIFBSRVZJRVdfT1VUUFVULFxuICBSRVNQT05TSVZFX1BSRVZJRVcsXG4gIFNBVkVfT1VUUFVULFxufVxuXG5leHBvcnQgZW51bSBNU0dfRVZFTlRTIHtcbiAgRE9NX1JFQURZLFxuICBOT19GUkFNRVMsXG4gIEZPVU5EX0ZSQU1FUyxcbiAgUkVTSVpFLFxuICBSRU5ERVIsXG4gIENMT1NFLFxuICBFUlJPUixcbn1cblxuZXhwb3J0IGVudW0gT1VUUFVUX0ZPUk1BVFMge1xuICBJTkxJTkUsXG4gIElGUkFNRSxcbn1cblxuZXhwb3J0IGNvbnN0IFVJX1RFWFQgPSB7XG4gIEVSUk9SX1VORVhQRUNURUQ6IFwiVW5leHBlY3RlZCBlcnJvclwiLFxuICBFUlJPUl9NSVNTSU5HX0ZSQU1FUzogXCJObyBmcmFtZXMgZm91bmQuIFBsZWFzZSBhZGQgc29tZSBmcmFtZXMgdG8gdGhlIHBhZ2UuXCIsXG4gIFdBUk5fTk9fVEFSR0VUUzogXCJTdGFuZGFyZCBmcmFtZXMgbm90IGZvdW5kLiBQbGVhc2Ugc2VsZWN0IHRhcmdldCBmcmFtZXMuXCIsXG4gIFdBUk5fVE9PX01BTllfVEFSR0VUUzogXCJQbGVhc2Ugc2VsZWN0IHRocmVlIHRhcmdldCBmcmFtZXNcIixcbiAgSU5GT19QUkVWSUVXOiBcIlByZXZpZXcgZWFjaCBmcmFtZSBvdXRwdXRcIixcbiAgVElUTEVfQ0hPT1NFX0ZSQU1FOiBcIkNob29zZSB3aGljaCBmcmFtZXMgdG8gZXhwb3J0XCIsXG4gIFRJVExFX1BSRVZJRVc6IFwiUHJldmlld1wiLFxuICBUSVRMRV9SRVNQT05TSVZFX1BSRVZJRVc6IFwiUmVzcG9uc2l2ZSBwcmV2aWV3XCIsXG4gIFRJTEVfT1VUUFVUOiBcIkV4cG9ydFwiLFxuICBCVVRUT05fTkVYVDogXCJOZXh0XCIsXG4gIEJVVFRPTl9ET1dOTE9BRDogXCJEb3dubG9hZFwiLFxuICBCVVRUT05fUFJFVklPVVM6IFwiQmFja1wiLFxufTtcblxuZXhwb3J0IGNvbnN0IElOSVRJQUxfVUlfU0laRSA9IHtcbiAgd2lkdGg6IDQ4MCxcbiAgaGVpZ2h0OiA1MDAsXG4gIG1heFdpZHRoOiAxMjAwLFxuICBtYXhIZWlnaHQ6IDkwMCxcbiAgbWluV2lkdGg6IDQyMCxcbiAgbWluSGVpZ2h0OiA0ODAsXG59O1xuXG5leHBvcnQgY29uc3QgRlJBTUVfV0FSTklOR19TSVpFID0gMzAwO1xuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUtBLFVBQU0sR0FBRyxHQUFHLFdBQVcsQ0FBQyxNQUFNLGtCQUFrQjtBQUloRCxVQUFNLE9BQU87QUFHYixVQUFNLENBQUUsT0FBTyxVQUFXLE1BQU0sU0FBUztBQUN6QyxVQUFNLENBQUUsUUFBUyxNQUFNO0FBQ3ZCLFVBQU0scUJBQXFCLEtBQUssTUFBTSxRQUFRO0FBQzlDLFVBQU0sc0JBQXNCLEtBQUssTUFBTSxTQUFTO0FBQ2hELFVBQU0sR0FBRyxPQUFPLG9CQUFvQjtBQUVwQztBQUNFLFlBQU0sQ0FBRSxlQUFnQjtBQUN4QixZQUFNLGFBQWEsWUFBWSxTQUFTLE9BQU8sQ0FBQyxTQUFTLEtBQUssU0FBUztBQUd2RSxVQUFJLFdBQVcsU0FBUztBQUN0QixnQkFBUSxLQUFLO0FBQ2IsY0FBTSxHQUFHLFlBQVk7VUFBRSxNQUFNLFdBQVc7O0FBQ3hDOztBQUdGLFlBQU0sYUFBYSxXQUFXLElBQUksQ0FBQztBQUNqQyxjQUFNLENBQUUsTUFBTSxlQUFPLGlCQUFRLE1BQU87QUFDcEMsY0FBTSxZQUFZLGFBQWE7QUFFL0IsZUFBTztVQUNMO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQSxZQUFZO1VBQ1osVUFBVTs7O0FBSWQsWUFBTSxHQUFHLFlBQVk7UUFDbkIsTUFBTSxXQUFXO1FBQ2pCLFFBQVE7UUFDUixhQUFhO1FBQ2IsY0FBYzs7O0FBSWxCLGdDQUE0QjtBQUMxQjtBQUNFLGNBQU0sUUFBUSxNQUFNLFlBQVk7QUFDaEMsWUFBSSxDQUFDLFNBQVMsTUFBTSxTQUFTO0FBQzNCLGdCQUFNLElBQUksTUFBTTs7QUFHbEIsY0FBTSxNQUFNLE1BQU0sTUFBTSxZQUFZO1VBQ2xDLFFBQVE7VUFDUixnQkFBZ0I7VUFDaEIsbUJBQW1COztBQUdyQixjQUFNLEdBQUcsWUFBWTtVQUNuQixNQUFNLFdBQVc7VUFDakI7VUFDQTs7ZUFFSztBQUNQLGNBQU0sR0FBRyxZQUFZO1VBQ25CLE1BQU0sV0FBVztVQUNqQixXQUFXLGtCQUF5QixBQUFQLG9CQUFPLElBQUk7Ozs7QUF5QjlDLDBCQUFzQjtBQUNwQixZQUFNLFlBQVksTUFBTSxRQUFRLENBQUMsQ0FBRSxVQUFXLFNBQVM7QUFDdkQsWUFBTSxDQUFFLHFCQUFzQjtBQUM5QixZQUFNLFFBQVEsa0JBQWtCLEdBQUc7QUFDbkMsWUFBTSxRQUFRLGtCQUFrQixHQUFHO0FBRW5DLGFBQU8sVUFBVSxJQUNmLENBQUM7QUFDQyxjQUFNLENBQ0osdUNBQ0EsZUFDQSxpQkFDQSxVQUFVLGNBQ1YsVUFDQSxPQUNBLFlBQ0EsWUFDQSxlQUNBLHFCQUNBLHFCQUNFO0FBSUosY0FBTSxRQUFRLG1CQUFrQixHQUFHO0FBQ25DLGNBQU0sUUFBUSxtQkFBa0IsR0FBRztBQUNuQyxjQUFNLElBQUksUUFBUTtBQUNsQixjQUFNLElBQUksUUFBUTtBQUdsQixjQUFNLENBQUMsUUFBUTtBQUNmLFlBQUksU0FBUztVQUFFLEdBQUc7VUFBRyxHQUFHO1VBQUcsR0FBRztVQUFHLEdBQUc7O0FBQ3BDLFlBQUksS0FBSyxTQUFTO0FBQ2hCLG1CQUFTLHNCQUFLLFNBQUw7WUFBYSxHQUFHLEtBQUssV0FBVzs7O0FBSTNDLFlBQUksV0FBVztBQUNmLFlBQUksaUJBQWlCLE1BQU07QUFDekIscUJBQVc7O0FBS2IsWUFBSSxhQUFhO0FBQ2pCLFlBQUksYUFBYSxNQUFNO0FBQ3JCLHVCQUFhLFNBQVM7O0FBR3hCLGVBQU87VUFDTDtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7Ozs7QUFhUiwrQkFBMkI7QUFDekIsWUFBTSxDQUFFLE1BQU0sZUFBTyxpQkFBUSxXQUFZO0FBRXpDLGNBQVE7YUFDRCxXQUFXO0FBQ2Qsa0JBQVEsSUFBSTtBQUNaO2FBRUcsV0FBVztBQUNkLGtCQUFRLElBQUk7QUFDWixnQkFBTTtBQUNOO2FBRUcsV0FBVztBQUNkLGtCQUFRLElBQUk7QUFDWjtBQUNBO2FBRUcsV0FBVztBQUNkLGtCQUFRLElBQUksc0JBQXNCO0FBQ2xDLHVCQUFhO0FBQ2I7YUFFRyxXQUFXO0FBQ2Qsa0JBQVEsSUFBSTtBQUNaLGdCQUFNLEdBQUcsT0FBTyxRQUFPO0FBQ3ZCOztBQUdBLGtCQUFRLE1BQU0sd0JBQXdCOzs7Ozs7QUN6TTVDLEFBQU8sTUFBSztBQUFMLFlBQUs7QUFDVjtBQUNBO0FBQ0E7QUFDQTtLQUpVO0FBT0wsTUFBSztBQUFMLFlBQUs7QUFDVjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtLQVBVO0FBVUwsTUFBSztBQUFMLFlBQUs7QUFDVjtBQUNBO0tBRlU7IiwKICAibmFtZXMiOiBbXQp9Cg==
