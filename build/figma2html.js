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
        const clone = frame.clone();
        const cloneTextNodes = clone.findChildren((node) => node.type === "TEXT");
        cloneTextNodes.forEach((node) => node.remove());
        const svg = await clone.exportAsync({
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL2luZGV4LnRzeCIsICJzcmMvY29uc3RhbnRzLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgeyBNU0dfRVZFTlRTIH0gZnJvbSBcIi4vY29uc3RhbnRzXCI7XG5pbXBvcnQgeyBNc2dGcmFtZXNUeXBlLCBNc2dOb0ZyYW1lc1R5cGUsIE1zZ1JlbmRlclR5cGUsIE1zZ0Vycm9yVHlwZSB9IGZyb20gXCIuL3VpXCI7XG5cbi8vIExpc3RlbiBmb3IgbWVzc2FnZXMgZnJvbSB0aGUgVUlcbi8vIE5PVEU6IExpc3RlbiBmb3IgRE9NX1JFQURZIG1lc3NhZ2UgdG8ga2ljay1vZmYgbWFpbiBmdW5jdGlvblxuZmlnbWEudWkub24oXCJtZXNzYWdlXCIsIChlKSA9PiBoYW5kbGVSZWNlaXZlZE1zZyhlKSk7XG5cbi8vIFJlbmRlciB0aGUgRE9NXG4vLyBOT1RFOiBvbiBzdWNjZXNzZnVsIFVJIHJlbmRlciBhIHBvc3QgbWVzc2FnZSBpcyBzZW5kIGJhY2sgb2YgRE9NX1JFQURZXG5maWdtYS5zaG93VUkoX19odG1sX18pO1xuXG4vLyBSZXNpemUgVUkgdG8gbWF4IHZpZXdwb3J0IGRpbWVuc2lvbnNcbmNvbnN0IHsgd2lkdGgsIGhlaWdodCB9ID0gZmlnbWEudmlld3BvcnQuYm91bmRzO1xuY29uc3QgeyB6b29tIH0gPSBmaWdtYS52aWV3cG9ydDtcbmNvbnN0IGluaXRpYWxXaW5kb3dXaWR0aCA9IE1hdGgucm91bmQod2lkdGggKiB6b29tKTtcbmNvbnN0IGluaXRpYWxXaW5kb3dIZWlnaHQgPSBNYXRoLnJvdW5kKGhlaWdodCAqIHpvb20pO1xuZmlnbWEudWkucmVzaXplKGluaXRpYWxXaW5kb3dXaWR0aCwgaW5pdGlhbFdpbmRvd0hlaWdodCk7XG5cbmZ1bmN0aW9uIGdldFJvb3RGcmFtZXMoKSB7XG4gIGNvbnN0IHsgY3VycmVudFBhZ2UgfSA9IGZpZ21hO1xuICBjb25zdCByb290RnJhbWVzID0gY3VycmVudFBhZ2UuY2hpbGRyZW4uZmlsdGVyKChub2RlKSA9PiBub2RlLnR5cGUgPT09IFwiRlJBTUVcIikgYXMgRnJhbWVOb2RlW107XG5cbiAgLy8gUmV0dXJuIGVycm9yIGlmIHRoZXJlJ3Mgbm8gZnJhbWVzIG9uIHRoZSBjdXJyZW50IHBhZ2VcbiAgaWYgKHJvb3RGcmFtZXMubGVuZ3RoIDwgMSkge1xuICAgIGNvbnNvbGUud2FybihcIk5vIGZyYW1lc1wiKTtcbiAgICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7IHR5cGU6IE1TR19FVkVOVFMuTk9fRlJBTUVTIH0gYXMgTXNnTm9GcmFtZXNUeXBlKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBoZWFkbGluZXNBbmRTb3VyY2UgPSBnZXRIZWFkbGluZXNBbmRTb3VyY2UoY3VycmVudFBhZ2UpO1xuXG4gIGNvbnN0IGZyYW1lc0RhdGEgPSByb290RnJhbWVzLm1hcCgoZnJhbWUpID0+IHtcbiAgICBjb25zdCB7IG5hbWUsIHdpZHRoLCBoZWlnaHQsIGlkIH0gPSBmcmFtZTtcbiAgICBjb25zdCB0ZXh0Tm9kZXMgPSBnZXRUZXh0Tm9kZXMoZnJhbWUpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWUsXG4gICAgICB3aWR0aCxcbiAgICAgIGhlaWdodCxcbiAgICAgIGlkLFxuICAgICAgdGV4dE5vZGVzLFxuICAgICAgcmVzcG9uc2l2ZTogZmFsc2UsXG4gICAgICBzZWxlY3RlZDogdHJ1ZSxcbiAgICB9O1xuICB9KTtcblxuICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7XG4gICAgdHlwZTogTVNHX0VWRU5UUy5GT1VORF9GUkFNRVMsXG4gICAgZnJhbWVzOiBmcmFtZXNEYXRhLFxuICAgIHdpbmRvd1dpZHRoOiBpbml0aWFsV2luZG93V2lkdGgsXG4gICAgd2luZG93SGVpZ2h0OiBpbml0aWFsV2luZG93SGVpZ2h0LFxuICAgIC4uLmhlYWRsaW5lc0FuZFNvdXJjZSxcbiAgfSBhcyBNc2dGcmFtZXNUeXBlKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlUmVuZGVyKGZyYW1lSWQ6IHN0cmluZykge1xuICB0cnkge1xuICAgIGNvbnN0IGZyYW1lID0gZmlnbWEuZ2V0Tm9kZUJ5SWQoZnJhbWVJZCk7XG4gICAgaWYgKCFmcmFtZSB8fCBmcmFtZS50eXBlICE9PSBcIkZSQU1FXCIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgZnJhbWVcIik7XG4gICAgfVxuXG4gICAgY29uc3QgY2xvbmUgPSBmcmFtZS5jbG9uZSgpO1xuICAgIGNvbnN0IGNsb25lVGV4dE5vZGVzID0gY2xvbmUuZmluZENoaWxkcmVuKChub2RlKSA9PiBub2RlLnR5cGUgPT09IFwiVEVYVFwiKTtcbiAgICBjbG9uZVRleHROb2Rlcy5mb3JFYWNoKChub2RlKSA9PiBub2RlLnJlbW92ZSgpKTtcblxuICAgIGNvbnN0IHN2ZyA9IGF3YWl0IGNsb25lLmV4cG9ydEFzeW5jKHtcbiAgICAgIGZvcm1hdDogXCJTVkdcIixcbiAgICAgIHN2Z091dGxpbmVUZXh0OiBmYWxzZSxcbiAgICAgIHN2Z1NpbXBsaWZ5U3Ryb2tlOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgZmlnbWEudWkucG9zdE1lc3NhZ2Uoe1xuICAgICAgdHlwZTogTVNHX0VWRU5UUy5SRU5ERVIsXG4gICAgICBmcmFtZUlkLFxuICAgICAgc3ZnLFxuICAgIH0gYXMgTXNnUmVuZGVyVHlwZSk7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGZpZ21hLnVpLnBvc3RNZXNzYWdlKHtcbiAgICAgIHR5cGU6IE1TR19FVkVOVFMuRVJST1IsXG4gICAgICBlcnJvclRleHQ6IGBSZW5kZXIgZmFpbGVkOiAke2VyciA/PyBlcnIubWVzc2FnZX1gLFxuICAgIH0gYXMgTXNnRXJyb3JUeXBlKTtcbiAgfVxufVxuXG5leHBvcnQgdHlwZSB0ZXh0Tm9kZVNlbGVjdGVkUHJvcHMgPSBQaWNrPFxuICBUZXh0Tm9kZSxcbiAgfCBcInhcIlxuICB8IFwieVwiXG4gIHwgXCJ3aWR0aFwiXG4gIHwgXCJoZWlnaHRcIlxuICB8IFwiY2hhcmFjdGVyc1wiXG4gIHwgXCJsaW5lSGVpZ2h0XCJcbiAgfCBcImxldHRlclNwYWNpbmdcIlxuICB8IFwidGV4dEFsaWduSG9yaXpvbnRhbFwiXG4gIHwgXCJ0ZXh0QWxpZ25WZXJ0aWNhbFwiXG4+O1xuXG5leHBvcnQgaW50ZXJmYWNlIHRleHREYXRhIGV4dGVuZHMgdGV4dE5vZGVTZWxlY3RlZFByb3BzIHtcbiAgY29sb3VyOiB7IHI6IG51bWJlcjsgZzogbnVtYmVyOyBiOiBudW1iZXI7IGE6IG51bWJlciB9O1xuICBmb250U2l6ZTogbnVtYmVyO1xuICBmb250RmFtaWx5OiBzdHJpbmc7XG4gIGZvbnRTdHlsZTogc3RyaW5nO1xufVxuXG4vLyBFeHRyYWN0IG9iamVjdCBwcm9wZXJ0aWVzIGZyb20gdGV4dE5vZGUgZm9yIHBhc3NpbmcgdmlhIHBvc3RNZXNzYWdlXG5mdW5jdGlvbiBnZXRUZXh0Tm9kZXMoZnJhbWU6IEZyYW1lTm9kZSk6IHRleHREYXRhW10ge1xuICBjb25zdCB0ZXh0Tm9kZXMgPSBmcmFtZS5maW5kQWxsKCh7IHR5cGUgfSkgPT4gdHlwZSA9PT0gXCJURVhUXCIpIGFzIFRleHROb2RlW107XG4gIGNvbnN0IHsgYWJzb2x1dGVUcmFuc2Zvcm0gfSA9IGZyYW1lO1xuICBjb25zdCByb290WCA9IGFic29sdXRlVHJhbnNmb3JtWzBdWzJdO1xuICBjb25zdCByb290WSA9IGFic29sdXRlVHJhbnNmb3JtWzFdWzJdO1xuXG4gIHJldHVybiB0ZXh0Tm9kZXMubWFwKFxuICAgIChub2RlKTogdGV4dERhdGEgPT4ge1xuICAgICAgY29uc3Qge1xuICAgICAgICBhYnNvbHV0ZVRyYW5zZm9ybSxcbiAgICAgICAgd2lkdGgsXG4gICAgICAgIGhlaWdodCxcbiAgICAgICAgZm9udFNpemU6IGZvbnRTaXplRGF0YSxcbiAgICAgICAgZm9udE5hbWUsXG4gICAgICAgIGZpbGxzLFxuICAgICAgICBjaGFyYWN0ZXJzLFxuICAgICAgICBsaW5lSGVpZ2h0LFxuICAgICAgICBsZXR0ZXJTcGFjaW5nLFxuICAgICAgICB0ZXh0QWxpZ25Ib3Jpem9udGFsLFxuICAgICAgICB0ZXh0QWxpZ25WZXJ0aWNhbCxcbiAgICAgIH0gPSBub2RlO1xuXG4gICAgICAvLyBOT1RFOiBGaWdtYSBub2RlIHgsIHkgYXJlIHJlbGF0aXZlIHRvIGZpcnN0IHBhcmVudCwgd2Ugd2FudCB0aGVtXG4gICAgICAvLyByZWxhdGl2ZSB0byB0aGUgcm9vdCBmcmFtZVxuICAgICAgY29uc3QgdGV4dFggPSBhYnNvbHV0ZVRyYW5zZm9ybVswXVsyXTtcbiAgICAgIGNvbnN0IHRleHRZID0gYWJzb2x1dGVUcmFuc2Zvcm1bMV1bMl07XG4gICAgICBjb25zdCB4ID0gdGV4dFggLSByb290WDtcbiAgICAgIGNvbnN0IHkgPSB0ZXh0WSAtIHJvb3RZO1xuXG4gICAgICAvLyBFeHRyYWN0IGJhc2ljIGZpbGwgY29sb3VyXG4gICAgICBjb25zdCBbZmlsbF0gPSBmaWxscztcbiAgICAgIGxldCBjb2xvdXIgPSB7IHI6IDAsIGc6IDAsIGI6IDAsIGE6IDEgfTtcbiAgICAgIGlmIChmaWxsLnR5cGUgPT09IFwiU09MSURcIikge1xuICAgICAgICBjb2xvdXIgPSB7IC4uLmNvbG91ciwgYTogZmlsbC5vcGFjaXR5IHx8IDEgfTtcbiAgICAgIH1cblxuICAgICAgLy8gRXh0cmFjdCBmb250IGZhbWlseVxuICAgICAgbGV0IGZvbnRTaXplID0gMTY7XG4gICAgICBpZiAoZm9udFNpemVEYXRhICE9PSBmaWdtYS5taXhlZCkge1xuICAgICAgICBmb250U2l6ZSA9IGZvbnRTaXplRGF0YTtcbiAgICAgIH1cblxuICAgICAgLy8gRXh0cmFjdCBmb250IGZhbWlseVxuICAgICAgLy8gVE9ETzogQ29uZmlybSBmYWxsYmFjayBmb250c1xuICAgICAgbGV0IGZvbnRGYW1pbHkgPSBcIkFyaWFsXCI7XG4gICAgICBsZXQgZm9udFN0eWxlID0gXCJSZWd1bGFyXCI7XG4gICAgICBpZiAoZm9udE5hbWUgIT09IGZpZ21hLm1peGVkKSB7XG4gICAgICAgIGZvbnRGYW1pbHkgPSBmb250TmFtZS5mYW1pbHk7XG4gICAgICAgIGZvbnRTdHlsZSA9IGZvbnROYW1lLnN0eWxlO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4ge1xuICAgICAgICB4LFxuICAgICAgICB5LFxuICAgICAgICB3aWR0aCxcbiAgICAgICAgaGVpZ2h0LFxuICAgICAgICBmb250U2l6ZSxcbiAgICAgICAgZm9udEZhbWlseSxcbiAgICAgICAgZm9udFN0eWxlLFxuICAgICAgICBjb2xvdXIsXG4gICAgICAgIGNoYXJhY3RlcnMsXG4gICAgICAgIGxpbmVIZWlnaHQsXG4gICAgICAgIGxldHRlclNwYWNpbmcsXG4gICAgICAgIHRleHRBbGlnbkhvcml6b250YWwsXG4gICAgICAgIHRleHRBbGlnblZlcnRpY2FsLFxuICAgICAgfTtcbiAgICB9XG4gICk7XG59XG5cbmZ1bmN0aW9uIGdldEhlYWRsaW5lc0FuZFNvdXJjZShwYWdlTm9kZTogUGFnZU5vZGUpIHtcbiAgY29uc3QgTk9ERV9OQU1FUyA9IFtcImhlYWRsaW5lXCIsIFwic3ViaGVhZFwiLCBcInNvdXJjZVwiXTtcblxuICBjb25zdCByZXN1bHQ6IHsgW2lkOiBzdHJpbmddOiBzdHJpbmcgfCB1bmRlZmluZWQgfSA9IHt9O1xuICBmb3IgKGNvbnN0IG5hbWUgb2YgTk9ERV9OQU1FUykge1xuICAgIGNvbnN0IG5vZGUgPSBwYWdlTm9kZS5maW5kQ2hpbGQoKG5vZGUpID0+IG5vZGUubmFtZSA9PT0gbmFtZSAmJiBub2RlLnR5cGUgPT09IFwiVEVYVFwiKSBhcyBUZXh0Tm9kZSB8IG51bGw7XG5cbiAgICByZXN1bHRbbmFtZV0gPSBub2RlPy5jaGFyYWN0ZXJzO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZW51bSBIRUFETElORV9OT0RFUyB7XG4gIEhFQURMSU5FID0gXCJoZWFkbGluZVwiLFxuICBTVUJIRUFEID0gXCJzdWJoZWFkXCIsXG4gIFNPVVJDRSA9IFwic291cmNlXCIsXG59XG5pbnRlcmZhY2Ugc2V0SGVhZGxpbmVzQW5kU291cmNlUHJvcHMge1xuICBwYWdlTm9kZTogUGFnZU5vZGU7XG4gIGhlYWRsaW5lOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIHN1YmhlYWQ6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgc291cmNlOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG59XG5hc3luYyBmdW5jdGlvbiBzZXRIZWFkbGluZXNBbmRTb3VyY2UocHJvcHM6IHNldEhlYWRsaW5lc0FuZFNvdXJjZVByb3BzKSB7XG4gIGNvbnN0IHsgcGFnZU5vZGUgfSA9IHByb3BzO1xuICBjb25zdCBmcmFtZXMgPSBwYWdlTm9kZS5maW5kQ2hpbGRyZW4oKG5vZGUpID0+IG5vZGUudHlwZSA9PT0gXCJGUkFNRVwiKTtcbiAgY29uc3QgbW9zdExlZnRQb3MgPSBNYXRoLm1pbiguLi5mcmFtZXMubWFwKChub2RlKSA9PiBub2RlLngpKTtcbiAgY29uc3QgbW9zdFRvcFBvcyA9IE1hdGgubWluKC4uLmZyYW1lcy5tYXAoKG5vZGUpID0+IG5vZGUueSkpO1xuXG4gIE9iamVjdC52YWx1ZXMoSEVBRExJTkVfTk9ERVMpLmZvckVhY2goYXN5bmMgKG5hbWUsIGkpID0+IHtcbiAgICBsZXQgbm9kZSA9IHBhZ2VOb2RlLmZpbmRDaGlsZCgobm9kZSkgPT4gbm9kZS5uYW1lID09PSBuYW1lICYmIG5vZGUudHlwZSA9PT0gXCJURVhUXCIpIGFzIFRleHROb2RlIHwgbnVsbDtcbiAgICBjb25zdCB0ZXh0Q29udGVudCA9IHByb3BzW25hbWVdO1xuXG4gICAgLy8gUmVtb3ZlIG5vZGUgaWYgdGhlcmUncyBubyB0ZXh0IGNvbnRlbnRcbiAgICBpZiAoIXRleHRDb250ZW50KSB7XG4gICAgICBpZiAobm9kZSkgbm9kZS5yZW1vdmUoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgbm9kZSBpZiBpdCBkb2Vzbid0IGV4aXN0XG4gICAgaWYgKCFub2RlKSB7XG4gICAgICBub2RlID0gZmlnbWEuY3JlYXRlVGV4dCgpO1xuICAgICAgbm9kZS5uYW1lID0gbmFtZTtcbiAgICAgIGxldCB5ID0gbW9zdFRvcFBvcyAtIDYwO1xuICAgICAgc3dpdGNoIChuYW1lKSB7XG4gICAgICAgIGNhc2UgSEVBRExJTkVfTk9ERVMuSEVBRExJTkU6XG4gICAgICAgICAgeSAtPSA2MDtcbiAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlIEhFQURMSU5FX05PREVTLlNVQkhFQUQ6XG4gICAgICAgICAgeSAtPSAzMDtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgbm9kZS5yZWxhdGl2ZVRyYW5zZm9ybSA9IFtcbiAgICAgICAgWzEsIDAsIG1vc3RMZWZ0UG9zXSxcbiAgICAgICAgWzAsIDEsIHldLFxuICAgICAgXTtcbiAgICB9XG5cbiAgICAvLyBFbnN1cmUgdGV4dCBub2RlIGlzIGxvY2tlZFxuICAgIG5vZGUubG9ja2VkID0gdHJ1ZTtcblxuICAgIC8vIExvYWQgZm9udFxuICAgIGNvbnN0IGZvbnROYW1lID0gbm9kZS5mb250TmFtZSAhPT0gZmlnbWEubWl4ZWQgPyBub2RlLmZvbnROYW1lLmZhbWlseSA6IFwiUm9ib3RvXCI7XG4gICAgY29uc3QgZm9udFN0eWxlID0gbm9kZS5mb250TmFtZSAhPT0gZmlnbWEubWl4ZWQgPyBub2RlLmZvbnROYW1lLnN0eWxlIDogXCJSZWd1bGFyXCI7XG4gICAgYXdhaXQgZmlnbWEubG9hZEZvbnRBc3luYyh7IGZhbWlseTogZm9udE5hbWUsIHN0eWxlOiBmb250U3R5bGUgfSk7XG5cbiAgICAvLyBTZXQgdGV4dCBub2RlIGNvbnRlbnRcbiAgICBub2RlLmNoYXJhY3RlcnMgPSBwcm9wc1tuYW1lXSB8fCBcIlwiO1xuICB9KTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQb3N0TXNnIHtcbiAgdHlwZTogTVNHX0VWRU5UUztcbiAgZnJhbWVJZDogc3RyaW5nO1xuICB3aWR0aDogbnVtYmVyO1xuICBoZWlnaHQ6IG51bWJlcjtcbiAgaGVhZGxpbmU6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgc3ViaGVhZDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBzb3VyY2U6IHN0cmluZyB8IHVuZGVmaW5lZDtcbn1cbi8vIEhhbmRsZSBtZXNzYWdlcyBmcm9tIHRoZSBVSVxuZnVuY3Rpb24gaGFuZGxlUmVjZWl2ZWRNc2cobXNnOiBQb3N0TXNnKSB7XG4gIGNvbnN0IHsgdHlwZSwgd2lkdGgsIGhlaWdodCwgZnJhbWVJZCwgaGVhZGxpbmUsIHN1YmhlYWQsIHNvdXJjZSB9ID0gbXNnO1xuXG4gIHN3aXRjaCAodHlwZSkge1xuICAgIGNhc2UgTVNHX0VWRU5UUy5FUlJPUjpcbiAgICAgIGNvbnNvbGUubG9nKFwicGx1Z2luIG1zZzogZXJyb3JcIik7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgTVNHX0VWRU5UUy5DTE9TRTpcbiAgICAgIGNvbnNvbGUubG9nKFwicGx1Z2luIG1zZzogY2xvc2VcIik7XG4gICAgICBmaWdtYS5jbG9zZVBsdWdpbigpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIE1TR19FVkVOVFMuRE9NX1JFQURZOlxuICAgICAgY29uc29sZS5sb2coXCJwbHVnaW4gbXNnOiBET00gUkVBRFlcIik7XG4gICAgICBnZXRSb290RnJhbWVzKCk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgTVNHX0VWRU5UUy5SRU5ERVI6XG4gICAgICBjb25zb2xlLmxvZyhcInBsdWdpbiBtc2c6IHJlbmRlclwiLCBmcmFtZUlkKTtcbiAgICAgIGhhbmRsZVJlbmRlcihmcmFtZUlkKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSBNU0dfRVZFTlRTLlJFU0laRTpcbiAgICAgIGNvbnNvbGUubG9nKFwicGx1Z2luIG1zZzogcmVzaXplXCIpO1xuICAgICAgZmlnbWEudWkucmVzaXplKHdpZHRoLCBoZWlnaHQpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIE1TR19FVkVOVFMuVVBEQVRFX0hFQURMSU5FUzpcbiAgICAgIGNvbnNvbGUubG9nKFwiVXBkYXRpbmdIZWFkbGluZXNcIiwgaGVhZGxpbmUsIHN1YmhlYWQsIHNvdXJjZSk7XG4gICAgICBzZXRIZWFkbGluZXNBbmRTb3VyY2Uoe1xuICAgICAgICBwYWdlTm9kZTogZmlnbWEuY3VycmVudFBhZ2UsXG4gICAgICAgIGhlYWRsaW5lLFxuICAgICAgICBzdWJoZWFkLFxuICAgICAgICBzb3VyY2UsXG4gICAgICB9KTtcbiAgICAgIGJyZWFrO1xuXG4gICAgZGVmYXVsdDpcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJVbmtub3duIHBvc3QgbWVzc2FnZVwiLCBtc2cpO1xuICB9XG59XG4iLCAiZXhwb3J0IGVudW0gU1RBR0VTIHtcbiAgQ0hPT1NFX0ZSQU1FUyxcbiAgUFJFVklFV19PVVRQVVQsXG4gIFJFU1BPTlNJVkVfUFJFVklFVyxcbiAgU0FWRV9PVVRQVVQsXG59XG5cbmV4cG9ydCBlbnVtIE1TR19FVkVOVFMge1xuICBET01fUkVBRFksXG4gIE5PX0ZSQU1FUyxcbiAgRk9VTkRfRlJBTUVTLFxuICBSRVNJWkUsXG4gIFJFTkRFUixcbiAgQ0xPU0UsXG4gIEVSUk9SLFxuICBVUERBVEVfSEVBRExJTkVTLFxufVxuXG5leHBvcnQgZW51bSBPVVRQVVRfRk9STUFUUyB7XG4gIElOTElORSxcbiAgSUZSQU1FLFxufVxuXG5leHBvcnQgY29uc3QgVUlfVEVYVCA9IHtcbiAgRVJST1JfVU5FWFBFQ1RFRDogXCJVbmV4cGVjdGVkIGVycm9yXCIsXG4gIEVSUk9SX01JU1NJTkdfRlJBTUVTOiBcIk5vIGZyYW1lcyBmb3VuZC4gUGxlYXNlIGFkZCBzb21lIGZyYW1lcyB0byB0aGUgcGFnZS5cIixcbiAgV0FSTl9OT19UQVJHRVRTOiBcIlN0YW5kYXJkIGZyYW1lcyBub3QgZm91bmQuIFBsZWFzZSBzZWxlY3QgdGFyZ2V0IGZyYW1lcy5cIixcbiAgV0FSTl9UT09fTUFOWV9UQVJHRVRTOiBcIlBsZWFzZSBzZWxlY3QgdGhyZWUgdGFyZ2V0IGZyYW1lc1wiLFxuICBJTkZPX1BSRVZJRVc6IFwiUHJldmlldyBlYWNoIGZyYW1lIG91dHB1dFwiLFxuICBUSVRMRV9DSE9PU0VfRlJBTUU6IFwiQ2hvb3NlIHdoaWNoIGZyYW1lcyB0byBleHBvcnRcIixcbiAgVElUTEVfUFJFVklFVzogXCJQcmV2aWV3XCIsXG4gIFRJVExFX1JFU1BPTlNJVkVfUFJFVklFVzogXCJSZXNwb25zaXZlIHByZXZpZXdcIixcbiAgVElMRV9PVVRQVVQ6IFwiRXhwb3J0XCIsXG4gIEJVVFRPTl9ORVhUOiBcIk5leHRcIixcbiAgQlVUVE9OX0RPV05MT0FEOiBcIkRvd25sb2FkXCIsXG4gIEJVVFRPTl9QUkVWSU9VUzogXCJCYWNrXCIsXG59O1xuXG5leHBvcnQgY29uc3QgSU5JVElBTF9VSV9TSVpFID0ge1xuICB3aWR0aDogNDgwLFxuICBoZWlnaHQ6IDUwMCxcbiAgbWF4V2lkdGg6IDEyMDAsXG4gIG1heEhlaWdodDogOTAwLFxuICBtaW5XaWR0aDogNDIwLFxuICBtaW5IZWlnaHQ6IDQ4MCxcbn07XG5cbmV4cG9ydCBjb25zdCBGUkFNRV9XQVJOSU5HX1NJWkUgPSAzMDA7XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7OztBQUFBO0FBS0EsVUFBTSxHQUFHLEdBQUcsV0FBVyxDQUFDLE1BQU0sa0JBQWtCO0FBSWhELFVBQU0sT0FBTztBQUdiLFVBQU0sQ0FBRSxPQUFPLFVBQVcsTUFBTSxTQUFTO0FBQ3pDLFVBQU0sQ0FBRSxRQUFTLE1BQU07QUFDdkIsVUFBTSxxQkFBcUIsS0FBSyxNQUFNLFFBQVE7QUFDOUMsVUFBTSxzQkFBc0IsS0FBSyxNQUFNLFNBQVM7QUFDaEQsVUFBTSxHQUFHLE9BQU8sb0JBQW9CO0FBRXBDO0FBQ0UsWUFBTSxDQUFFLGVBQWdCO0FBQ3hCLFlBQU0sYUFBYSxZQUFZLFNBQVMsT0FBTyxDQUFDLFNBQVMsS0FBSyxTQUFTO0FBR3ZFLFVBQUksV0FBVyxTQUFTO0FBQ3RCLGdCQUFRLEtBQUs7QUFDYixjQUFNLEdBQUcsWUFBWSxDQUFFLE1BQU0sV0FBVztBQUN4Qzs7QUFHRixZQUFNLHFCQUFxQixzQkFBc0I7QUFFakQsWUFBTSxhQUFhLFdBQVcsSUFBSSxD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
