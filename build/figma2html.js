(() => {
  let __assign = Object.assign;
  let __commonJS = (callback, module) => () => {
    if (!module) {
      module = {exports: {}};
      callback(module.exports, module);
    }
    return module.exports;
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
        figma.ui.postMessage({type: MSG_EVENTS.NO_FRAMES});
        return;
      }
      const headlinesAndSource = getHeadlinesAndSource(currentPage);
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
      figma.ui.postMessage(__assign({
        type: MSG_EVENTS.FOUND_FRAMES,
        frames: framesData,
        windowWidth: initialWindowWidth,
        windowHeight: initialWindowHeight
      }, headlinesAndSource));
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
        let colour = {r: 0, g: 0, b: 0, a: 1};
        if (fill.type === "SOLID") {
          colour = __assign(__assign({}, colour), {a: fill.opacity || 1});
        }
        let fontSize = 16;
        if (fontSizeData !== figma.mixed) {
          fontSize = fontSizeData;
        }
        let fontFamily = "Arial";
        let fontStyle = "Regular";
        if (fontName !== figma.mixed) {
          fontFamily = fontName.family;
          fontStyle = fontName.style;
        }
        return {
          x,
          y,
          width: width2,
          height: height2,
          fontSize,
          fontFamily,
          fontStyle,
          colour,
          characters,
          lineHeight,
          letterSpacing,
          textAlignHorizontal,
          textAlignVertical
        };
      });
    }
    function getHeadlinesAndSource(pageNode) {
      const NODE_NAMES = ["headline", "subhead", "source"];
      const result = {};
      for (const name of NODE_NAMES) {
        const node = pageNode.findChild((node2) => node2.name === name && node2.type === "TEXT");
        result[name] = node == null ? void 0 : node.characters;
      }
      return result;
    }
    var HEADLINE_NODES;
    (function(HEADLINE_NODES2) {
      HEADLINE_NODES2["HEADLINE"] = "headline";
      HEADLINE_NODES2["SUBHEAD"] = "subhead";
      HEADLINE_NODES2["SOURCE"] = "source";
    })(HEADLINE_NODES || (HEADLINE_NODES = {}));
    async function setHeadlinesAndSource(props) {
      const {pageNode} = props;
      const mostLeftPos = Math.min(...pageNode.children.map((node) => node.x));
      const mostTopPos = Math.min(...pageNode.children.map((node) => node.y));
      Object.values(HEADLINE_NODES).forEach(async (name, i) => {
        let node = pageNode.findChild((node2) => node2.name === name && node2.type === "TEXT");
        const textContent = props[name];
        if (!textContent) {
          if (node)
            node.remove();
          return;
        }
        if (!node) {
          node = figma.createText();
          node.name = name;
          node.x = mostLeftPos;
          node.y = mostTopPos - 20 * (i + 1) - 30;
        }
        node.locked = true;
        const fontName = node.fontName !== figma.mixed ? node.fontName.family : "Roboto";
        const fontStyle = node.fontName !== figma.mixed ? node.fontName.style : "Regular";
        await figma.loadFontAsync({family: fontName, style: fontStyle});
        node.characters = props[name] || "";
      });
    }
    function handleReceivedMsg(msg) {
      const {type, width: width2, height: height2, frameId, headline, subhead, source} = msg;
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
        case MSG_EVENTS.UPDATE_HEADLINES:
          console.log("UpdatingHeadlines", headline, subhead, source);
          setHeadlinesAndSource({
            pageNode: figma.currentPage,
            headline,
            subhead,
            source
          });
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
    MSG_EVENTS2[MSG_EVENTS2["UPDATE_HEADLINES"] = 7] = "UPDATE_HEADLINES";
  })(MSG_EVENTS || (MSG_EVENTS = {}));
  var OUTPUT_FORMATS;
  (function(OUTPUT_FORMATS2) {
    OUTPUT_FORMATS2[OUTPUT_FORMATS2["INLINE"] = 0] = "INLINE";
    OUTPUT_FORMATS2[OUTPUT_FORMATS2["IFRAME"] = 1] = "IFRAME";
  })(OUTPUT_FORMATS || (OUTPUT_FORMATS = {}));
  require_index();
})();
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL2luZGV4LnRzeCIsICJzcmMvY29uc3RhbnRzLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgeyBNU0dfRVZFTlRTIH0gZnJvbSBcIi4vY29uc3RhbnRzXCI7XG5pbXBvcnQgeyBNc2dGcmFtZXNUeXBlLCBNc2dOb0ZyYW1lc1R5cGUsIE1zZ1JlbmRlclR5cGUsIE1zZ0Vycm9yVHlwZSB9IGZyb20gXCIuL3VpXCI7XG5cbi8vIExpc3RlbiBmb3IgbWVzc2FnZXMgZnJvbSB0aGUgVUlcbi8vIE5PVEU6IExpc3RlbiBmb3IgRE9NX1JFQURZIG1lc3NhZ2UgdG8ga2ljay1vZmYgbWFpbiBmdW5jdGlvblxuZmlnbWEudWkub24oXCJtZXNzYWdlXCIsIChlKSA9PiBoYW5kbGVSZWNlaXZlZE1zZyhlKSk7XG5cbi8vIFJlbmRlciB0aGUgRE9NXG4vLyBOT1RFOiBvbiBzdWNjZXNzZnVsIFVJIHJlbmRlciBhIHBvc3QgbWVzc2FnZSBpcyBzZW5kIGJhY2sgb2YgRE9NX1JFQURZXG5maWdtYS5zaG93VUkoX19odG1sX18pO1xuXG4vLyBSZXNpemUgVUkgdG8gbWF4IHZpZXdwb3J0IGRpbWVuc2lvbnNcbmNvbnN0IHsgd2lkdGgsIGhlaWdodCB9ID0gZmlnbWEudmlld3BvcnQuYm91bmRzO1xuY29uc3QgeyB6b29tIH0gPSBmaWdtYS52aWV3cG9ydDtcbmNvbnN0IGluaXRpYWxXaW5kb3dXaWR0aCA9IE1hdGgucm91bmQod2lkdGggKiB6b29tKTtcbmNvbnN0IGluaXRpYWxXaW5kb3dIZWlnaHQgPSBNYXRoLnJvdW5kKGhlaWdodCAqIHpvb20pO1xuZmlnbWEudWkucmVzaXplKGluaXRpYWxXaW5kb3dXaWR0aCwgaW5pdGlhbFdpbmRvd0hlaWdodCk7XG5cbmZ1bmN0aW9uIGdldFJvb3RGcmFtZXMoKSB7XG4gIGNvbnN0IHsgY3VycmVudFBhZ2UgfSA9IGZpZ21hO1xuICBjb25zdCByb290RnJhbWVzID0gY3VycmVudFBhZ2UuY2hpbGRyZW4uZmlsdGVyKChub2RlKSA9PiBub2RlLnR5cGUgPT09IFwiRlJBTUVcIikgYXMgRnJhbWVOb2RlW107XG5cbiAgLy8gUmV0dXJuIGVycm9yIGlmIHRoZXJlJ3Mgbm8gZnJhbWVzIG9uIHRoZSBjdXJyZW50IHBhZ2VcbiAgaWYgKHJvb3RGcmFtZXMubGVuZ3RoIDwgMSkge1xuICAgIGNvbnNvbGUud2FybihcIk5vIGZyYW1lc1wiKTtcbiAgICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7IHR5cGU6IE1TR19FVkVOVFMuTk9fRlJBTUVTIH0gYXMgTXNnTm9GcmFtZXNUeXBlKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBoZWFkbGluZXNBbmRTb3VyY2UgPSBnZXRIZWFkbGluZXNBbmRTb3VyY2UoY3VycmVudFBhZ2UpO1xuXG4gIGNvbnN0IGZyYW1lc0RhdGEgPSByb290RnJhbWVzLm1hcCgoZnJhbWUpID0+IHtcbiAgICBjb25zdCB7IG5hbWUsIHdpZHRoLCBoZWlnaHQsIGlkIH0gPSBmcmFtZTtcbiAgICBjb25zdCB0ZXh0Tm9kZXMgPSBnZXRUZXh0Tm9kZXMoZnJhbWUpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWUsXG4gICAgICB3aWR0aCxcbiAgICAgIGhlaWdodCxcbiAgICAgIGlkLFxuICAgICAgdGV4dE5vZGVzLFxuICAgICAgcmVzcG9uc2l2ZTogZmFsc2UsXG4gICAgICBzZWxlY3RlZDogdHJ1ZSxcbiAgICB9O1xuICB9KTtcblxuICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7XG4gICAgdHlwZTogTVNHX0VWRU5UUy5GT1VORF9GUkFNRVMsXG4gICAgZnJhbWVzOiBmcmFtZXNEYXRhLFxuICAgIHdpbmRvd1dpZHRoOiBpbml0aWFsV2luZG93V2lkdGgsXG4gICAgd2luZG93SGVpZ2h0OiBpbml0aWFsV2luZG93SGVpZ2h0LFxuICAgIC4uLmhlYWRsaW5lc0FuZFNvdXJjZSxcbiAgfSBhcyBNc2dGcmFtZXNUeXBlKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlUmVuZGVyKGZyYW1lSWQ6IHN0cmluZykge1xuICB0cnkge1xuICAgIGNvbnN0IGZyYW1lID0gZmlnbWEuZ2V0Tm9kZUJ5SWQoZnJhbWVJZCk7XG4gICAgaWYgKCFmcmFtZSB8fCBmcmFtZS50eXBlICE9PSBcIkZSQU1FXCIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgZnJhbWVcIik7XG4gICAgfVxuXG4gICAgY29uc3Qgc3ZnID0gYXdhaXQgZnJhbWUuZXhwb3J0QXN5bmMoe1xuICAgICAgZm9ybWF0OiBcIlNWR1wiLFxuICAgICAgc3ZnT3V0bGluZVRleHQ6IGZhbHNlLFxuICAgICAgc3ZnU2ltcGxpZnlTdHJva2U6IHRydWUsXG4gICAgfSk7XG5cbiAgICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7XG4gICAgICB0eXBlOiBNU0dfRVZFTlRTLlJFTkRFUixcbiAgICAgIGZyYW1lSWQsXG4gICAgICBzdmcsXG4gICAgfSBhcyBNc2dSZW5kZXJUeXBlKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgZmlnbWEudWkucG9zdE1lc3NhZ2Uoe1xuICAgICAgdHlwZTogTVNHX0VWRU5UUy5FUlJPUixcbiAgICAgIGVycm9yVGV4dDogYFJlbmRlciBmYWlsZWQ6ICR7ZXJyID8/IGVyci5tZXNzYWdlfWAsXG4gICAgfSBhcyBNc2dFcnJvclR5cGUpO1xuICB9XG59XG5cbmV4cG9ydCB0eXBlIHRleHROb2RlU2VsZWN0ZWRQcm9wcyA9IFBpY2s8XG4gIFRleHROb2RlLFxuICB8IFwieFwiXG4gIHwgXCJ5XCJcbiAgfCBcIndpZHRoXCJcbiAgfCBcImhlaWdodFwiXG4gIHwgXCJjaGFyYWN0ZXJzXCJcbiAgfCBcImxpbmVIZWlnaHRcIlxuICB8IFwibGV0dGVyU3BhY2luZ1wiXG4gIHwgXCJ0ZXh0QWxpZ25Ib3Jpem9udGFsXCJcbiAgfCBcInRleHRBbGlnblZlcnRpY2FsXCJcbj47XG5cbmV4cG9ydCBpbnRlcmZhY2UgdGV4dERhdGEgZXh0ZW5kcyB0ZXh0Tm9kZVNlbGVjdGVkUHJvcHMge1xuICBjb2xvdXI6IHsgcjogbnVtYmVyOyBnOiBudW1iZXI7IGI6IG51bWJlcjsgYTogbnVtYmVyIH07XG4gIGZvbnRTaXplOiBudW1iZXI7XG4gIGZvbnRGYW1pbHk6IHN0cmluZztcbiAgZm9udFN0eWxlOiBzdHJpbmc7XG59XG5cbi8vIEV4dHJhY3Qgb2JqZWN0IHByb3BlcnRpZXMgZnJvbSB0ZXh0Tm9kZSBmb3IgcGFzc2luZyB2aWEgcG9zdE1lc3NhZ2VcbmZ1bmN0aW9uIGdldFRleHROb2RlcyhmcmFtZTogRnJhbWVOb2RlKTogdGV4dERhdGFbXSB7XG4gIGNvbnN0IHRleHROb2RlcyA9IGZyYW1lLmZpbmRBbGwoKHsgdHlwZSB9KSA9PiB0eXBlID09PSBcIlRFWFRcIikgYXMgVGV4dE5vZGVbXTtcbiAgY29uc3QgeyBhYnNvbHV0ZVRyYW5zZm9ybSB9ID0gZnJhbWU7XG4gIGNvbnN0IHJvb3RYID0gYWJzb2x1dGVUcmFuc2Zvcm1bMF1bMl07XG4gIGNvbnN0IHJvb3RZID0gYWJzb2x1dGVUcmFuc2Zvcm1bMV1bMl07XG5cbiAgcmV0dXJuIHRleHROb2Rlcy5tYXAoXG4gICAgKG5vZGUpOiB0ZXh0RGF0YSA9PiB7XG4gICAgICBjb25zdCB7XG4gICAgICAgIGFic29sdXRlVHJhbnNmb3JtLFxuICAgICAgICB3aWR0aCxcbiAgICAgICAgaGVpZ2h0LFxuICAgICAgICBmb250U2l6ZTogZm9udFNpemVEYXRhLFxuICAgICAgICBmb250TmFtZSxcbiAgICAgICAgZmlsbHMsXG4gICAgICAgIGNoYXJhY3RlcnMsXG4gICAgICAgIGxpbmVIZWlnaHQsXG4gICAgICAgIGxldHRlclNwYWNpbmcsXG4gICAgICAgIHRleHRBbGlnbkhvcml6b250YWwsXG4gICAgICAgIHRleHRBbGlnblZlcnRpY2FsLFxuICAgICAgfSA9IG5vZGU7XG5cbiAgICAgIC8vIE5PVEU6IEZpZ21hIG5vZGUgeCwgeSBhcmUgcmVsYXRpdmUgdG8gZmlyc3QgcGFyZW50LCB3ZSB3YW50IHRoZW1cbiAgICAgIC8vIHJlbGF0aXZlIHRvIHRoZSByb290IGZyYW1lXG4gICAgICBjb25zdCB0ZXh0WCA9IGFic29sdXRlVHJhbnNmb3JtWzBdWzJdO1xuICAgICAgY29uc3QgdGV4dFkgPSBhYnNvbHV0ZVRyYW5zZm9ybVsxXVsyXTtcbiAgICAgIGNvbnN0IHggPSB0ZXh0WCAtIHJvb3RYO1xuICAgICAgY29uc3QgeSA9IHRleHRZIC0gcm9vdFk7XG5cbiAgICAgIC8vIEV4dHJhY3QgYmFzaWMgZmlsbCBjb2xvdXJcbiAgICAgIGNvbnN0IFtmaWxsXSA9IGZpbGxzO1xuICAgICAgbGV0IGNvbG91ciA9IHsgcjogMCwgZzogMCwgYjogMCwgYTogMSB9O1xuICAgICAgaWYgKGZpbGwudHlwZSA9PT0gXCJTT0xJRFwiKSB7XG4gICAgICAgIGNvbG91ciA9IHsgLi4uY29sb3VyLCBhOiBmaWxsLm9wYWNpdHkgfHwgMSB9O1xuICAgICAgfVxuXG4gICAgICAvLyBFeHRyYWN0IGZvbnQgZmFtaWx5XG4gICAgICBsZXQgZm9udFNpemUgPSAxNjtcbiAgICAgIGlmIChmb250U2l6ZURhdGEgIT09IGZpZ21hLm1peGVkKSB7XG4gICAgICAgIGZvbnRTaXplID0gZm9udFNpemVEYXRhO1xuICAgICAgfVxuXG4gICAgICAvLyBFeHRyYWN0IGZvbnQgZmFtaWx5XG4gICAgICAvLyBUT0RPOiBDb25maXJtIGZhbGxiYWNrIGZvbnRzXG4gICAgICBsZXQgZm9udEZhbWlseSA9IFwiQXJpYWxcIjtcbiAgICAgIGxldCBmb250U3R5bGUgPSBcIlJlZ3VsYXJcIjtcbiAgICAgIGlmIChmb250TmFtZSAhPT0gZmlnbWEubWl4ZWQpIHtcbiAgICAgICAgZm9udEZhbWlseSA9IGZvbnROYW1lLmZhbWlseTtcbiAgICAgICAgZm9udFN0eWxlID0gZm9udE5hbWUuc3R5bGU7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHgsXG4gICAgICAgIHksXG4gICAgICAgIHdpZHRoLFxuICAgICAgICBoZWlnaHQsXG4gICAgICAgIGZvbnRTaXplLFxuICAgICAgICBmb250RmFtaWx5LFxuICAgICAgICBmb250U3R5bGUsXG4gICAgICAgIGNvbG91cixcbiAgICAgICAgY2hhcmFjdGVycyxcbiAgICAgICAgbGluZUhlaWdodCxcbiAgICAgICAgbGV0dGVyU3BhY2luZyxcbiAgICAgICAgdGV4dEFsaWduSG9yaXpvbnRhbCxcbiAgICAgICAgdGV4dEFsaWduVmVydGljYWwsXG4gICAgICB9O1xuICAgIH1cbiAgKTtcbn1cblxuZnVuY3Rpb24gZ2V0SGVhZGxpbmVzQW5kU291cmNlKHBhZ2VOb2RlOiBQYWdlTm9kZSkge1xuICBjb25zdCBOT0RFX05BTUVTID0gW1wiaGVhZGxpbmVcIiwgXCJzdWJoZWFkXCIsIFwic291cmNlXCJdO1xuXG4gIGNvbnN0IHJlc3VsdDogeyBbaWQ6IHN0cmluZ106IHN0cmluZyB8IHVuZGVmaW5lZCB9ID0ge307XG4gIGZvciAoY29uc3QgbmFtZSBvZiBOT0RFX05BTUVTKSB7XG4gICAgY29uc3Qgbm9kZSA9IHBhZ2VOb2RlLmZpbmRDaGlsZCgobm9kZSkgPT4gbm9kZS5uYW1lID09PSBuYW1lICYmIG5vZGUudHlwZSA9PT0gXCJURVhUXCIpIGFzIFRleHROb2RlIHwgbnVsbDtcblxuICAgIHJlc3VsdFtuYW1lXSA9IG5vZGU/LmNoYXJhY3RlcnM7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5lbnVtIEhFQURMSU5FX05PREVTIHtcbiAgSEVBRExJTkUgPSBcImhlYWRsaW5lXCIsXG4gIFNVQkhFQUQgPSBcInN1YmhlYWRcIixcbiAgU09VUkNFID0gXCJzb3VyY2VcIixcbn1cbmludGVyZmFjZSBzZXRIZWFkbGluZXNBbmRTb3VyY2VQcm9wcyB7XG4gIHBhZ2VOb2RlOiBQYWdlTm9kZTtcbiAgaGVhZGxpbmU6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgc3ViaGVhZDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBzb3VyY2U6IHN0cmluZyB8IHVuZGVmaW5lZDtcbn1cbmFzeW5jIGZ1bmN0aW9uIHNldEhlYWRsaW5lc0FuZFNvdXJjZShwcm9wczogc2V0SGVhZGxpbmVzQW5kU291cmNlUHJvcHMpIHtcbiAgY29uc3QgeyBwYWdlTm9kZSB9ID0gcHJvcHM7XG5cbiAgY29uc3QgbW9zdExlZnRQb3MgPSBNYXRoLm1pbiguLi5wYWdlTm9kZS5jaGlsZHJlbi5tYXAoKG5vZGUpID0+IG5vZGUueCkpO1xuICBjb25zdCBtb3N0VG9wUG9zID0gTWF0aC5taW4oLi4ucGFnZU5vZGUuY2hpbGRyZW4ubWFwKChub2RlKSA9PiBub2RlLnkpKTtcblxuICBPYmplY3QudmFsdWVzKEhFQURMSU5FX05PREVTKS5mb3JFYWNoKGFzeW5jIChuYW1lLCBpKSA9PiB7XG4gICAgbGV0IG5vZGUgPSBwYWdlTm9kZS5maW5kQ2hpbGQoKG5vZGUpID0+IG5vZGUubmFtZSA9PT0gbmFtZSAmJiBub2RlLnR5cGUgPT09IFwiVEVYVFwiKSBhcyBUZXh0Tm9kZSB8IG51bGw7XG4gICAgY29uc3QgdGV4dENvbnRlbnQgPSBwcm9wc1tuYW1lXTtcblxuICAgIC8vIFJlbW92ZSBub2RlIGlmIHRoZXJlJ3Mgbm8gdGV4dCBjb250ZW50XG4gICAgaWYgKCF0ZXh0Q29udGVudCkge1xuICAgICAgaWYgKG5vZGUpIG5vZGUucmVtb3ZlKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gQ3JlYXRlIG5vZGUgaWYgaXQgZG9lc24ndCBleGlzdFxuICAgIGlmICghbm9kZSkge1xuICAgICAgbm9kZSA9IGZpZ21hLmNyZWF0ZVRleHQoKTtcbiAgICAgIG5vZGUubmFtZSA9IG5hbWU7XG4gICAgICBub2RlLnggPSBtb3N0TGVmdFBvcztcbiAgICAgIG5vZGUueSA9IG1vc3RUb3BQb3MgLSAyMCAqIChpICsgMSkgLSAzMDtcbiAgICB9XG5cbiAgICAvLyBFbnN1cmUgdGV4dCBub2RlIGlzIGxvY2tlZFxuICAgIG5vZGUubG9ja2VkID0gdHJ1ZTtcblxuICAgIC8vIExvYWQgZm9udFxuICAgIGNvbnN0IGZvbnROYW1lID0gbm9kZS5mb250TmFtZSAhPT0gZmlnbWEubWl4ZWQgPyBub2RlLmZvbnROYW1lLmZhbWlseSA6IFwiUm9ib3RvXCI7XG4gICAgY29uc3QgZm9udFN0eWxlID0gbm9kZS5mb250TmFtZSAhPT0gZmlnbWEubWl4ZWQgPyBub2RlLmZvbnROYW1lLnN0eWxlIDogXCJSZWd1bGFyXCI7XG4gICAgYXdhaXQgZmlnbWEubG9hZEZvbnRBc3luYyh7IGZhbWlseTogZm9udE5hbWUsIHN0eWxlOiBmb250U3R5bGUgfSk7XG5cbiAgICAvLyBTZXQgdGV4dCBub2RlIGNvbnRlbnRcbiAgICBub2RlLmNoYXJhY3RlcnMgPSBwcm9wc1tuYW1lXSB8fCBcIlwiO1xuICB9KTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQb3N0TXNnIHtcbiAgdHlwZTogTVNHX0VWRU5UUztcbiAgZnJhbWVJZDogc3RyaW5nO1xuICB3aWR0aDogbnVtYmVyO1xuICBoZWlnaHQ6IG51bWJlcjtcbiAgaGVhZGxpbmU6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgc3ViaGVhZDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBzb3VyY2U6IHN0cmluZyB8IHVuZGVmaW5lZDtcbn1cbi8vIEhhbmRsZSBtZXNzYWdlcyBmcm9tIHRoZSBVSVxuZnVuY3Rpb24gaGFuZGxlUmVjZWl2ZWRNc2cobXNnOiBQb3N0TXNnKSB7XG4gIGNvbnN0IHsgdHlwZSwgd2lkdGgsIGhlaWdodCwgZnJhbWVJZCwgaGVhZGxpbmUsIHN1YmhlYWQsIHNvdXJjZSB9ID0gbXNnO1xuXG4gIHN3aXRjaCAodHlwZSkge1xuICAgIGNhc2UgTVNHX0VWRU5UUy5FUlJPUjpcbiAgICAgIGNvbnNvbGUubG9nKFwicGx1Z2luIG1zZzogZXJyb3JcIik7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgTVNHX0VWRU5UUy5DTE9TRTpcbiAgICAgIGNvbnNvbGUubG9nKFwicGx1Z2luIG1zZzogY2xvc2VcIik7XG4gICAgICBmaWdtYS5jbG9zZVBsdWdpbigpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIE1TR19FVkVOVFMuRE9NX1JFQURZOlxuICAgICAgY29uc29sZS5sb2coXCJwbHVnaW4gbXNnOiBET00gUkVBRFlcIik7XG4gICAgICBnZXRSb290RnJhbWVzKCk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgTVNHX0VWRU5UUy5SRU5ERVI6XG4gICAgICBjb25zb2xlLmxvZyhcInBsdWdpbiBtc2c6IHJlbmRlclwiLCBmcmFtZUlkKTtcbiAgICAgIGhhbmRsZVJlbmRlcihmcmFtZUlkKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSBNU0dfRVZFTlRTLlJFU0laRTpcbiAgICAgIGNvbnNvbGUubG9nKFwicGx1Z2luIG1zZzogcmVzaXplXCIpO1xuICAgICAgZmlnbWEudWkucmVzaXplKHdpZHRoLCBoZWlnaHQpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIE1TR19FVkVOVFMuVVBEQVRFX0hFQURMSU5FUzpcbiAgICAgIGNvbnNvbGUubG9nKFwiVXBkYXRpbmdIZWFkbGluZXNcIiwgaGVhZGxpbmUsIHN1YmhlYWQsIHNvdXJjZSk7XG4gICAgICBzZXRIZWFkbGluZXNBbmRTb3VyY2Uoe1xuICAgICAgICBwYWdlTm9kZTogZmlnbWEuY3VycmVudFBhZ2UsXG4gICAgICAgIGhlYWRsaW5lLFxuICAgICAgICBzdWJoZWFkLFxuICAgICAgICBzb3VyY2UsXG4gICAgICB9KTtcbiAgICAgIGJyZWFrO1xuXG4gICAgZGVmYXVsdDpcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJVbmtub3duIHBvc3QgbWVzc2FnZVwiLCBtc2cpO1xuICB9XG59XG4iLCAiZXhwb3J0IGVudW0gU1RBR0VTIHtcbiAgQ0hPT1NFX0ZSQU1FUyxcbiAgUFJFVklFV19PVVRQVVQsXG4gIFJFU1BPTlNJVkVfUFJFVklFVyxcbiAgU0FWRV9PVVRQVVQsXG59XG5cbmV4cG9ydCBlbnVtIE1TR19FVkVOVFMge1xuICBET01fUkVBRFksXG4gIE5PX0ZSQU1FUyxcbiAgRk9VTkRfRlJBTUVTLFxuICBSRVNJWkUsXG4gIFJFTkRFUixcbiAgQ0xPU0UsXG4gIEVSUk9SLFxuICBVUERBVEVfSEVBRExJTkVTLFxufVxuXG5leHBvcnQgZW51bSBPVVRQVVRfRk9STUFUUyB7XG4gIElOTElORSxcbiAgSUZSQU1FLFxufVxuXG5leHBvcnQgY29uc3QgVUlfVEVYVCA9IHtcbiAgRVJST1JfVU5FWFBFQ1RFRDogXCJVbmV4cGVjdGVkIGVycm9yXCIsXG4gIEVSUk9SX01JU1NJTkdfRlJBTUVTOiBcIk5vIGZyYW1lcyBmb3VuZC4gUGxlYXNlIGFkZCBzb21lIGZyYW1lcyB0byB0aGUgcGFnZS5cIixcbiAgV0FSTl9OT19UQVJHRVRTOiBcIlN0YW5kYXJkIGZyYW1lcyBub3QgZm91bmQuIFBsZWFzZSBzZWxlY3QgdGFyZ2V0IGZyYW1lcy5cIixcbiAgV0FSTl9UT09fTUFOWV9UQVJHRVRTOiBcIlBsZWFzZSBzZWxlY3QgdGhyZWUgdGFyZ2V0IGZyYW1lc1wiLFxuICBJTkZPX1BSRVZJRVc6IFwiUHJldmlldyBlYWNoIGZyYW1lIG91dHB1dFwiLFxuICBUSVRMRV9DSE9PU0VfRlJBTUU6IFwiQ2hvb3NlIHdoaWNoIGZyYW1lcyB0byBleHBvcnRcIixcbiAgVElUTEVfUFJFVklFVzogXCJQcmV2aWV3XCIsXG4gIFRJVExFX1JFU1BPTlNJVkVfUFJFVklFVzogXCJSZXNwb25zaXZlIHByZXZpZXdcIixcbiAgVElMRV9PVVRQVVQ6IFwiRXhwb3J0XCIsXG4gIEJVVFRPTl9ORVhUOiBcIk5leHRcIixcbiAgQlVUVE9OX0RPV05MT0FEOiBcIkRvd25sb2FkXCIsXG4gIEJVVFRPTl9QUkVWSU9VUzogXCJCYWNrXCIsXG59O1xuXG5leHBvcnQgY29uc3QgSU5JVElBTF9VSV9TSVpFID0ge1xuICB3aWR0aDogNDgwLFxuICBoZWlnaHQ6IDUwMCxcbiAgbWF4V2lkdGg6IDEyMDAsXG4gIG1heEhlaWdodDogOTAwLFxuICBtaW5XaWR0aDogNDIwLFxuICBtaW5IZWlnaHQ6IDQ4MCxcbn07XG5cbmV4cG9ydCBjb25zdCBGUkFNRV9XQVJOSU5HX1NJWkUgPSAzMDA7XG4iXSwKICAibWFwcGluZ3MiOiAi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
