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
      const frames = pageNode.findChildren((node) => node.type === "FRAME");
      const mostLeftPos = Math.min(...frames.map((node) => node.x));
      const mostTopPos = Math.min(...frames.map((node) => node.y));
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
          let y = mostTopPos - 60;
          switch (name) {
            case HEADLINE_NODES.HEADLINE:
              y -= 60;
              break;
            case HEADLINE_NODES.SUBHEAD:
              y -= 30;
              break;
          }
          node.relativeTransform = [
            [1, 0, mostLeftPos],
            [0, 1, y]
          ];
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL2luZGV4LnRzeCIsICJzcmMvY29uc3RhbnRzLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgeyBNU0dfRVZFTlRTIH0gZnJvbSBcIi4vY29uc3RhbnRzXCI7XG5pbXBvcnQgeyBNc2dGcmFtZXNUeXBlLCBNc2dOb0ZyYW1lc1R5cGUsIE1zZ1JlbmRlclR5cGUsIE1zZ0Vycm9yVHlwZSB9IGZyb20gXCIuL3VpXCI7XG5cbi8vIExpc3RlbiBmb3IgbWVzc2FnZXMgZnJvbSB0aGUgVUlcbi8vIE5PVEU6IExpc3RlbiBmb3IgRE9NX1JFQURZIG1lc3NhZ2UgdG8ga2ljay1vZmYgbWFpbiBmdW5jdGlvblxuZmlnbWEudWkub24oXCJtZXNzYWdlXCIsIChlKSA9PiBoYW5kbGVSZWNlaXZlZE1zZyhlKSk7XG5cbi8vIFJlbmRlciB0aGUgRE9NXG4vLyBOT1RFOiBvbiBzdWNjZXNzZnVsIFVJIHJlbmRlciBhIHBvc3QgbWVzc2FnZSBpcyBzZW5kIGJhY2sgb2YgRE9NX1JFQURZXG5maWdtYS5zaG93VUkoX19odG1sX18pO1xuXG4vLyBSZXNpemUgVUkgdG8gbWF4IHZpZXdwb3J0IGRpbWVuc2lvbnNcbmNvbnN0IHsgd2lkdGgsIGhlaWdodCB9ID0gZmlnbWEudmlld3BvcnQuYm91bmRzO1xuY29uc3QgeyB6b29tIH0gPSBmaWdtYS52aWV3cG9ydDtcbmNvbnN0IGluaXRpYWxXaW5kb3dXaWR0aCA9IE1hdGgucm91bmQod2lkdGggKiB6b29tKTtcbmNvbnN0IGluaXRpYWxXaW5kb3dIZWlnaHQgPSBNYXRoLnJvdW5kKGhlaWdodCAqIHpvb20pO1xuZmlnbWEudWkucmVzaXplKGluaXRpYWxXaW5kb3dXaWR0aCwgaW5pdGlhbFdpbmRvd0hlaWdodCk7XG5cbmZ1bmN0aW9uIGdldFJvb3RGcmFtZXMoKSB7XG4gIGNvbnN0IHsgY3VycmVudFBhZ2UgfSA9IGZpZ21hO1xuICBjb25zdCByb290RnJhbWVzID0gY3VycmVudFBhZ2UuY2hpbGRyZW4uZmlsdGVyKChub2RlKSA9PiBub2RlLnR5cGUgPT09IFwiRlJBTUVcIikgYXMgRnJhbWVOb2RlW107XG5cbiAgLy8gUmV0dXJuIGVycm9yIGlmIHRoZXJlJ3Mgbm8gZnJhbWVzIG9uIHRoZSBjdXJyZW50IHBhZ2VcbiAgaWYgKHJvb3RGcmFtZXMubGVuZ3RoIDwgMSkge1xuICAgIGNvbnNvbGUud2FybihcIk5vIGZyYW1lc1wiKTtcbiAgICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7IHR5cGU6IE1TR19FVkVOVFMuTk9fRlJBTUVTIH0gYXMgTXNnTm9GcmFtZXNUeXBlKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBoZWFkbGluZXNBbmRTb3VyY2UgPSBnZXRIZWFkbGluZXNBbmRTb3VyY2UoY3VycmVudFBhZ2UpO1xuXG4gIGNvbnN0IGZyYW1lc0RhdGEgPSByb290RnJhbWVzLm1hcCgoZnJhbWUpID0+IHtcbiAgICBjb25zdCB7IG5hbWUsIHdpZHRoLCBoZWlnaHQsIGlkIH0gPSBmcmFtZTtcbiAgICBjb25zdCB0ZXh0Tm9kZXMgPSBnZXRUZXh0Tm9kZXMoZnJhbWUpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWUsXG4gICAgICB3aWR0aCxcbiAgICAgIGhlaWdodCxcbiAgICAgIGlkLFxuICAgICAgdGV4dE5vZGVzLFxuICAgICAgcmVzcG9uc2l2ZTogZmFsc2UsXG4gICAgICBzZWxlY3RlZDogdHJ1ZSxcbiAgICB9O1xuICB9KTtcblxuICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7XG4gICAgdHlwZTogTVNHX0VWRU5UUy5GT1VORF9GUkFNRVMsXG4gICAgZnJhbWVzOiBmcmFtZXNEYXRhLFxuICAgIHdpbmRvd1dpZHRoOiBpbml0aWFsV2luZG93V2lkdGgsXG4gICAgd2luZG93SGVpZ2h0OiBpbml0aWFsV2luZG93SGVpZ2h0LFxuICAgIC4uLmhlYWRsaW5lc0FuZFNvdXJjZSxcbiAgfSBhcyBNc2dGcmFtZXNUeXBlKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlUmVuZGVyKGZyYW1lSWQ6IHN0cmluZykge1xuICB0cnkge1xuICAgIGNvbnN0IGZyYW1lID0gZmlnbWEuZ2V0Tm9kZUJ5SWQoZnJhbWVJZCk7XG4gICAgaWYgKCFmcmFtZSB8fCBmcmFtZS50eXBlICE9PSBcIkZSQU1FXCIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgZnJhbWVcIik7XG4gICAgfVxuXG4gICAgY29uc3Qgc3ZnID0gYXdhaXQgZnJhbWUuZXhwb3J0QXN5bmMoe1xuICAgICAgZm9ybWF0OiBcIlNWR1wiLFxuICAgICAgc3ZnT3V0bGluZVRleHQ6IGZhbHNlLFxuICAgICAgc3ZnU2ltcGxpZnlTdHJva2U6IHRydWUsXG4gICAgfSk7XG5cbiAgICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7XG4gICAgICB0eXBlOiBNU0dfRVZFTlRTLlJFTkRFUixcbiAgICAgIGZyYW1lSWQsXG4gICAgICBzdmcsXG4gICAgfSBhcyBNc2dSZW5kZXJUeXBlKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgZmlnbWEudWkucG9zdE1lc3NhZ2Uoe1xuICAgICAgdHlwZTogTVNHX0VWRU5UUy5FUlJPUixcbiAgICAgIGVycm9yVGV4dDogYFJlbmRlciBmYWlsZWQ6ICR7ZXJyID8/IGVyci5tZXNzYWdlfWAsXG4gICAgfSBhcyBNc2dFcnJvclR5cGUpO1xuICB9XG59XG5cbmV4cG9ydCB0eXBlIHRleHROb2RlU2VsZWN0ZWRQcm9wcyA9IFBpY2s8XG4gIFRleHROb2RlLFxuICB8IFwieFwiXG4gIHwgXCJ5XCJcbiAgfCBcIndpZHRoXCJcbiAgfCBcImhlaWdodFwiXG4gIHwgXCJjaGFyYWN0ZXJzXCJcbiAgfCBcImxpbmVIZWlnaHRcIlxuICB8IFwibGV0dGVyU3BhY2luZ1wiXG4gIHwgXCJ0ZXh0QWxpZ25Ib3Jpem9udGFsXCJcbiAgfCBcInRleHRBbGlnblZlcnRpY2FsXCJcbj47XG5cbmV4cG9ydCBpbnRlcmZhY2UgdGV4dERhdGEgZXh0ZW5kcyB0ZXh0Tm9kZVNlbGVjdGVkUHJvcHMge1xuICBjb2xvdXI6IHsgcjogbnVtYmVyOyBnOiBudW1iZXI7IGI6IG51bWJlcjsgYTogbnVtYmVyIH07XG4gIGZvbnRTaXplOiBudW1iZXI7XG4gIGZvbnRGYW1pbHk6IHN0cmluZztcbiAgZm9udFN0eWxlOiBzdHJpbmc7XG59XG5cbi8vIEV4dHJhY3Qgb2JqZWN0IHByb3BlcnRpZXMgZnJvbSB0ZXh0Tm9kZSBmb3IgcGFzc2luZyB2aWEgcG9zdE1lc3NhZ2VcbmZ1bmN0aW9uIGdldFRleHROb2RlcyhmcmFtZTogRnJhbWVOb2RlKTogdGV4dERhdGFbXSB7XG4gIGNvbnN0IHRleHROb2RlcyA9IGZyYW1lLmZpbmRBbGwoKHsgdHlwZSB9KSA9PiB0eXBlID09PSBcIlRFWFRcIikgYXMgVGV4dE5vZGVbXTtcbiAgY29uc3QgeyBhYnNvbHV0ZVRyYW5zZm9ybSB9ID0gZnJhbWU7XG4gIGNvbnN0IHJvb3RYID0gYWJzb2x1dGVUcmFuc2Zvcm1bMF1bMl07XG4gIGNvbnN0IHJvb3RZID0gYWJzb2x1dGVUcmFuc2Zvcm1bMV1bMl07XG5cbiAgcmV0dXJuIHRleHROb2Rlcy5tYXAoXG4gICAgKG5vZGUpOiB0ZXh0RGF0YSA9PiB7XG4gICAgICBjb25zdCB7XG4gICAgICAgIGFic29sdXRlVHJhbnNmb3JtLFxuICAgICAgICB3aWR0aCxcbiAgICAgICAgaGVpZ2h0LFxuICAgICAgICBmb250U2l6ZTogZm9udFNpemVEYXRhLFxuICAgICAgICBmb250TmFtZSxcbiAgICAgICAgZmlsbHMsXG4gICAgICAgIGNoYXJhY3RlcnMsXG4gICAgICAgIGxpbmVIZWlnaHQsXG4gICAgICAgIGxldHRlclNwYWNpbmcsXG4gICAgICAgIHRleHRBbGlnbkhvcml6b250YWwsXG4gICAgICAgIHRleHRBbGlnblZlcnRpY2FsLFxuICAgICAgfSA9IG5vZGU7XG5cbiAgICAgIC8vIE5PVEU6IEZpZ21hIG5vZGUgeCwgeSBhcmUgcmVsYXRpdmUgdG8gZmlyc3QgcGFyZW50LCB3ZSB3YW50IHRoZW1cbiAgICAgIC8vIHJlbGF0aXZlIHRvIHRoZSByb290IGZyYW1lXG4gICAgICBjb25zdCB0ZXh0WCA9IGFic29sdXRlVHJhbnNmb3JtWzBdWzJdO1xuICAgICAgY29uc3QgdGV4dFkgPSBhYnNvbHV0ZVRyYW5zZm9ybVsxXVsyXTtcbiAgICAgIGNvbnN0IHggPSB0ZXh0WCAtIHJvb3RYO1xuICAgICAgY29uc3QgeSA9IHRleHRZIC0gcm9vdFk7XG5cbiAgICAgIC8vIEV4dHJhY3QgYmFzaWMgZmlsbCBjb2xvdXJcbiAgICAgIGNvbnN0IFtmaWxsXSA9IGZpbGxzO1xuICAgICAgbGV0IGNvbG91ciA9IHsgcjogMCwgZzogMCwgYjogMCwgYTogMSB9O1xuICAgICAgaWYgKGZpbGwudHlwZSA9PT0gXCJTT0xJRFwiKSB7XG4gICAgICAgIGNvbG91ciA9IHsgLi4uY29sb3VyLCBhOiBmaWxsLm9wYWNpdHkgfHwgMSB9O1xuICAgICAgfVxuXG4gICAgICAvLyBFeHRyYWN0IGZvbnQgZmFtaWx5XG4gICAgICBsZXQgZm9udFNpemUgPSAxNjtcbiAgICAgIGlmIChmb250U2l6ZURhdGEgIT09IGZpZ21hLm1peGVkKSB7XG4gICAgICAgIGZvbnRTaXplID0gZm9udFNpemVEYXRhO1xuICAgICAgfVxuXG4gICAgICAvLyBFeHRyYWN0IGZvbnQgZmFtaWx5XG4gICAgICAvLyBUT0RPOiBDb25maXJtIGZhbGxiYWNrIGZvbnRzXG4gICAgICBsZXQgZm9udEZhbWlseSA9IFwiQXJpYWxcIjtcbiAgICAgIGxldCBmb250U3R5bGUgPSBcIlJlZ3VsYXJcIjtcbiAgICAgIGlmIChmb250TmFtZSAhPT0gZmlnbWEubWl4ZWQpIHtcbiAgICAgICAgZm9udEZhbWlseSA9IGZvbnROYW1lLmZhbWlseTtcbiAgICAgICAgZm9udFN0eWxlID0gZm9udE5hbWUuc3R5bGU7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHgsXG4gICAgICAgIHksXG4gICAgICAgIHdpZHRoLFxuICAgICAgICBoZWlnaHQsXG4gICAgICAgIGZvbnRTaXplLFxuICAgICAgICBmb250RmFtaWx5LFxuICAgICAgICBmb250U3R5bGUsXG4gICAgICAgIGNvbG91cixcbiAgICAgICAgY2hhcmFjdGVycyxcbiAgICAgICAgbGluZUhlaWdodCxcbiAgICAgICAgbGV0dGVyU3BhY2luZyxcbiAgICAgICAgdGV4dEFsaWduSG9yaXpvbnRhbCxcbiAgICAgICAgdGV4dEFsaWduVmVydGljYWwsXG4gICAgICB9O1xuICAgIH1cbiAgKTtcbn1cblxuZnVuY3Rpb24gZ2V0SGVhZGxpbmVzQW5kU291cmNlKHBhZ2VOb2RlOiBQYWdlTm9kZSkge1xuICBjb25zdCBOT0RFX05BTUVTID0gW1wiaGVhZGxpbmVcIiwgXCJzdWJoZWFkXCIsIFwic291cmNlXCJdO1xuXG4gIGNvbnN0IHJlc3VsdDogeyBbaWQ6IHN0cmluZ106IHN0cmluZyB8IHVuZGVmaW5lZCB9ID0ge307XG4gIGZvciAoY29uc3QgbmFtZSBvZiBOT0RFX05BTUVTKSB7XG4gICAgY29uc3Qgbm9kZSA9IHBhZ2VOb2RlLmZpbmRDaGlsZCgobm9kZSkgPT4gbm9kZS5uYW1lID09PSBuYW1lICYmIG5vZGUudHlwZSA9PT0gXCJURVhUXCIpIGFzIFRleHROb2RlIHwgbnVsbDtcblxuICAgIHJlc3VsdFtuYW1lXSA9IG5vZGU/LmNoYXJhY3RlcnM7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5lbnVtIEhFQURMSU5FX05PREVTIHtcbiAgSEVBRExJTkUgPSBcImhlYWRsaW5lXCIsXG4gIFNVQkhFQUQgPSBcInN1YmhlYWRcIixcbiAgU09VUkNFID0gXCJzb3VyY2VcIixcbn1cbmludGVyZmFjZSBzZXRIZWFkbGluZXNBbmRTb3VyY2VQcm9wcyB7XG4gIHBhZ2VOb2RlOiBQYWdlTm9kZTtcbiAgaGVhZGxpbmU6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgc3ViaGVhZDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBzb3VyY2U6IHN0cmluZyB8IHVuZGVmaW5lZDtcbn1cbmFzeW5jIGZ1bmN0aW9uIHNldEhlYWRsaW5lc0FuZFNvdXJjZShwcm9wczogc2V0SGVhZGxpbmVzQW5kU291cmNlUHJvcHMpIHtcbiAgY29uc3QgeyBwYWdlTm9kZSB9ID0gcHJvcHM7XG4gIGNvbnN0IGZyYW1lcyA9IHBhZ2VOb2RlLmZpbmRDaGlsZHJlbigobm9kZSkgPT4gbm9kZS50eXBlID09PSBcIkZSQU1FXCIpO1xuICBjb25zdCBtb3N0TGVmdFBvcyA9IE1hdGgubWluKC4uLmZyYW1lcy5tYXAoKG5vZGUpID0+IG5vZGUueCkpO1xuICBjb25zdCBtb3N0VG9wUG9zID0gTWF0aC5taW4oLi4uZnJhbWVzLm1hcCgobm9kZSkgPT4gbm9kZS55KSk7XG5cbiAgT2JqZWN0LnZhbHVlcyhIRUFETElORV9OT0RFUykuZm9yRWFjaChhc3luYyAobmFtZSwgaSkgPT4ge1xuICAgIGxldCBub2RlID0gcGFnZU5vZGUuZmluZENoaWxkKChub2RlKSA9PiBub2RlLm5hbWUgPT09IG5hbWUgJiYgbm9kZS50eXBlID09PSBcIlRFWFRcIikgYXMgVGV4dE5vZGUgfCBudWxsO1xuICAgIGNvbnN0IHRleHRDb250ZW50ID0gcHJvcHNbbmFtZV07XG5cbiAgICAvLyBSZW1vdmUgbm9kZSBpZiB0aGVyZSdzIG5vIHRleHQgY29udGVudFxuICAgIGlmICghdGV4dENvbnRlbnQpIHtcbiAgICAgIGlmIChub2RlKSBub2RlLnJlbW92ZSgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIENyZWF0ZSBub2RlIGlmIGl0IGRvZXNuJ3QgZXhpc3RcbiAgICBpZiAoIW5vZGUpIHtcbiAgICAgIG5vZGUgPSBmaWdtYS5jcmVhdGVUZXh0KCk7XG4gICAgICBub2RlLm5hbWUgPSBuYW1lO1xuICAgICAgbGV0IHkgPSBtb3N0VG9wUG9zIC0gNjA7XG4gICAgICBzd2l0Y2ggKG5hbWUpIHtcbiAgICAgICAgY2FzZSBIRUFETElORV9OT0RFUy5IRUFETElORTpcbiAgICAgICAgICB5IC09IDYwO1xuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgSEVBRExJTkVfTk9ERVMuU1VCSEVBRDpcbiAgICAgICAgICB5IC09IDMwO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICBub2RlLnJlbGF0aXZlVHJhbnNmb3JtID0gW1xuICAgICAgICBbMSwgMCwgbW9zdExlZnRQb3NdLFxuICAgICAgICBbMCwgMSwgeV0sXG4gICAgICBdO1xuICAgIH1cblxuICAgIC8vIEVuc3VyZSB0ZXh0IG5vZGUgaXMgbG9ja2VkXG4gICAgbm9kZS5sb2NrZWQgPSB0cnVlO1xuXG4gICAgLy8gTG9hZCBmb250XG4gICAgY29uc3QgZm9udE5hbWUgPSBub2RlLmZvbnROYW1lICE9PSBmaWdtYS5taXhlZCA/IG5vZGUuZm9udE5hbWUuZmFtaWx5IDogXCJSb2JvdG9cIjtcbiAgICBjb25zdCBmb250U3R5bGUgPSBub2RlLmZvbnROYW1lICE9PSBmaWdtYS5taXhlZCA/IG5vZGUuZm9udE5hbWUuc3R5bGUgOiBcIlJlZ3VsYXJcIjtcbiAgICBhd2FpdCBmaWdtYS5sb2FkRm9udEFzeW5jKHsgZmFtaWx5OiBmb250TmFtZSwgc3R5bGU6IGZvbnRTdHlsZSB9KTtcblxuICAgIC8vIFNldCB0ZXh0IG5vZGUgY29udGVudFxuICAgIG5vZGUuY2hhcmFjdGVycyA9IHByb3BzW25hbWVdIHx8IFwiXCI7XG4gIH0pO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBvc3RNc2cge1xuICB0eXBlOiBNU0dfRVZFTlRTO1xuICBmcmFtZUlkOiBzdHJpbmc7XG4gIHdpZHRoOiBudW1iZXI7XG4gIGhlaWdodDogbnVtYmVyO1xuICBoZWFkbGluZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBzdWJoZWFkOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIHNvdXJjZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xufVxuLy8gSGFuZGxlIG1lc3NhZ2VzIGZyb20gdGhlIFVJXG5mdW5jdGlvbiBoYW5kbGVSZWNlaXZlZE1zZyhtc2c6IFBvc3RNc2cpIHtcbiAgY29uc3QgeyB0eXBlLCB3aWR0aCwgaGVpZ2h0LCBmcmFtZUlkLCBoZWFkbGluZSwgc3ViaGVhZCwgc291cmNlIH0gPSBtc2c7XG5cbiAgc3dpdGNoICh0eXBlKSB7XG4gICAgY2FzZSBNU0dfRVZFTlRTLkVSUk9SOlxuICAgICAgY29uc29sZS5sb2coXCJwbHVnaW4gbXNnOiBlcnJvclwiKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSBNU0dfRVZFTlRTLkNMT1NFOlxuICAgICAgY29uc29sZS5sb2coXCJwbHVnaW4gbXNnOiBjbG9zZVwiKTtcbiAgICAgIGZpZ21hLmNsb3NlUGx1Z2luKCk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgTVNHX0VWRU5UUy5ET01fUkVBRFk6XG4gICAgICBjb25zb2xlLmxvZyhcInBsdWdpbiBtc2c6IERPTSBSRUFEWVwiKTtcbiAgICAgIGdldFJvb3RGcmFtZXMoKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSBNU0dfRVZFTlRTLlJFTkRFUjpcbiAgICAgIGNvbnNvbGUubG9nKFwicGx1Z2luIG1zZzogcmVuZGVyXCIsIGZyYW1lSWQpO1xuICAgICAgaGFuZGxlUmVuZGVyKGZyYW1lSWQpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIE1TR19FVkVOVFMuUkVTSVpFOlxuICAgICAgY29uc29sZS5sb2coXCJwbHVnaW4gbXNnOiByZXNpemVcIik7XG4gICAgICBmaWdtYS51aS5yZXNpemUod2lkdGgsIGhlaWdodCk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgTVNHX0VWRU5UUy5VUERBVEVfSEVBRExJTkVTOlxuICAgICAgY29uc29sZS5sb2coXCJVcGRhdGluZ0hlYWRsaW5lc1wiLCBoZWFkbGluZSwgc3ViaGVhZCwgc291cmNlKTtcbiAgICAgIHNldEhlYWRsaW5lc0FuZFNvdXJjZSh7XG4gICAgICAgIHBhZ2VOb2RlOiBmaWdtYS5jdXJyZW50UGFnZSxcbiAgICAgICAgaGVhZGxpbmUsXG4gICAgICAgIHN1YmhlYWQsXG4gICAgICAgIHNvdXJjZSxcbiAgICAgIH0pO1xuICAgICAgYnJlYWs7XG5cbiAgICBkZWZhdWx0OlxuICAgICAgY29uc29sZS5lcnJvcihcIlVua25vd24gcG9zdCBtZXNzYWdlXCIsIG1zZyk7XG4gIH1cbn1cbiIsICJleHBvcnQgZW51bSBTVEFHRVMge1xuICBDSE9PU0VfRlJBTUVTLFxuICBQUkVWSUVXX09VVFBVVCxcbiAgUkVTUE9OU0lWRV9QUkVWSUVXLFxuICBTQVZFX09VVFBVVCxcbn1cblxuZXhwb3J0IGVudW0gTVNHX0VWRU5UUyB7XG4gIERPTV9SRUFEWSxcbiAgTk9fRlJBTUVTLFxuICBGT1VORF9GUkFNRVMsXG4gIFJFU0laRSxcbiAgUkVOREVSLFxuICBDTE9TRSxcbiAgRVJST1IsXG4gIFVQREFURV9IRUFETElORVMsXG59XG5cbmV4cG9ydCBlbnVtIE9VVFBVVF9GT1JNQVRTIHtcbiAgSU5MSU5FLFxuICBJRlJBTUUsXG59XG5cbmV4cG9ydCBjb25zdCBVSV9URVhUID0ge1xuICBFUlJPUl9VTkVYUEVDVEVEOiBcIlVuZXhwZWN0ZWQgZXJyb3JcIixcbiAgRVJST1JfTUlTU0lOR19GUkFNRVM6IFwiTm8gZnJhbWVzIGZvdW5kLiBQbGVhc2UgYWRkIHNvbWUgZnJhbWVzIHRvIHRoZSBwYWdlLlwiLFxuICBXQVJOX05PX1RBUkdFVFM6IFwiU3RhbmRhcmQgZnJhbWVzIG5vdCBmb3VuZC4gUGxlYXNlIHNlbGVjdCB0YXJnZXQgZnJhbWVzLlwiLFxuICBXQVJOX1RPT19NQU5ZX1RBUkdFVFM6IFwiUGxlYXNlIHNlbGVjdCB0aHJlZSB0YXJnZXQgZnJhbWVzXCIsXG4gIElORk9fUFJFVklFVzogXCJQcmV2aWV3IGVhY2ggZnJhbWUgb3V0cHV0XCIsXG4gIFRJVExFX0NIT09TRV9GUkFNRTogXCJDaG9vc2Ugd2hpY2ggZnJhbWVzIHRvIGV4cG9ydFwiLFxuICBUSVRMRV9QUkVWSUVXOiBcIlByZXZpZXdcIixcbiAgVElUTEVfUkVTUE9OU0lWRV9QUkVWSUVXOiBcIlJlc3BvbnNpdmUgcHJldmlld1wiLFxuICBUSUxFX09VVFBVVDogXCJFeHBvcnRcIixcbiAgQlVUVE9OX05FWFQ6IFwiTmV4dFwiLFxuICBCVVRUT05fRE9XTkxPQUQ6IFwiRG93bmxvYWRcIixcbiAgQlVUVE9OX1BSRVZJT1VTOiBcIkJhY2tcIixcbn07XG5cbmV4cG9ydCBjb25zdCBJTklUSUFMX1VJX1NJWkUgPSB7XG4gIHdpZHRoOiA0ODAsXG4gIGhlaWdodDogNTAwLFxuICBtYXhXaWR0aDogMTIwMCxcbiAgbWF4SGVpZ2h0OiA5MDAsXG4gIG1pbldpZHRoOiA0MjAsXG4gIG1pbkhlaWdodDogNDgwLFxufTtcblxuZXhwb3J0IGNvbnN0IEZSQU1FX1dBUk5JTkdfU0laRSA9IDMwMDtcbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7O0FBQUE7QUFLQSxVQUFNLEdBQUcsR0FBRyxXQUFXLENBQUMsTUFBTSxrQkFBa0I7QUFJaEQsVUFBTSxPQUFPO0FBR2IsVUFBTSxDQUFFLE9BQU8sVUFBVyxNQUFNLFNBQVM7QUFDekMsVUFBTSxDQUFFLFFBQVMsTUFBTTtBQUN2QixVQUFNLHFCQUFxQixLQUFLLE1BQU0sUUFBUTtBQUM5QyxVQUFNLHNCQUFzQixLQUFLLE1BQU0sU0FBUztBQUNoRCxVQUFNLEdBQUcsT0FBTyxvQkFBb0I7QUFFcEM7QUFDRSxZQUFNLENBQUUsZUFBZ0I7QUFDeEIsWUFBTSxhQUFhLFlBQVksU0FBUyxPQUFPLENBQUMsU0FBUyxLQUFLLFNBQVM7QUFHdkUsVUFBSSxXQUFXLFNBQVM7QUFDdEIsZ0JBQVEsS0FBSztBQUNiLGNBQU0sR0FBRyxZQUFZLENBQUUsTUFBTSxXQUFXO0FBQ3hDOztBQUdGLFlBQU0scUJBQXFCLHNCQUFzQjtBQUVqRCxZQUFNLGFBQWEsV0FBVyxJQUFJLENBQUM7QUFDakMsY0FBTSxDQUFFLE1BQU0sZUFBTyxpQkFBUSxNQUFPO0FBQ3BDLGNBQU0sWUFBWSxhQUFhO0FBRS9CLGVBQU87VUFDTDtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0EsWUFBWTtVQUNaLFVBQVU7OztBQUlkLFlBQU0sR0FBRyxZQUFZO1FBQ25CLE1BQU0sV0FBVztRQUNqQixRQUFRO1FBQ1Is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
