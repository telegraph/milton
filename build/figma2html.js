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
    async function getFrameSvgAsString(frame) {
      const svgBuff = await frame.exportAsync({
        format: "SVG",
        svgOutlineText: false,
        svgSimplifyStroke: true
      });
      return String.fromCharCode.apply(null, Array.from(svgBuff));
    }
    async function handleRender(frameId) {
      try {
        const svgStr = await renderFrame(frameId);
        figma.ui.postMessage({
          type: MSG_EVENTS.RENDER,
          frameId,
          svgStr
        });
      } catch (err) {
        figma.ui.postMessage({
          type: MSG_EVENTS.ERROR,
          errorText: `Render failed: ${err != null ? err : err.message}`
        });
      }
    }
    async function renderFrame(frameId) {
      const frame = figma.getNodeById(frameId);
      if (!frame || frame.type !== "FRAME") {
        throw new Error("Missing frame");
      }
      let svgStr = await getFrameSvgAsString(frame);
      const regex = /id="(.+?)"/g;
      const ids = [];
      let matches;
      while (matches = regex.exec(svgStr)) {
        const [, id] = matches;
        ids.push(id);
      }
      ids.forEach((id) => {
        const randomId = `${id}-${genRandomUid()}`;
        svgStr = svgStr.replace(`id="${id}"`, `id="${randomId}"`);
        svgStr = svgStr.replace(`#${id}`, `#${randomId}`);
      });
      return svgStr;
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL2luZGV4LnRzeCIsICJzcmMvY29uc3RhbnRzLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgeyBNU0dfRVZFTlRTIH0gZnJvbSBcIi4vY29uc3RhbnRzXCI7XG5pbXBvcnQgeyBNc2dGcmFtZXNUeXBlLCBNc2dOb0ZyYW1lc1R5cGUsIE1zZ1JlbmRlclR5cGUsIE1zZ0Vycm9yVHlwZSwgRnJhbWVEYXRhVHlwZSB9IGZyb20gXCIuL3VpXCI7XG5cbi8vIEdlbmVyYXRlIGEgdW5pcXVlIGlkIHByZWZpeGVkIHdpdGggaWRlbnRpZmVyIHN0cmluZyBmb3Igc2FmZSB1c2UgYXMgSFRNTCBJRFxuLy8gTm90ZTogRmlnbWEgc2VlbXMgdG8gc3R1YiAudG9TdHJpbmcgZm9yIHNlY3VyaXR5P1xuZnVuY3Rpb24gZ2VuUmFuZG9tVWlkKCkge1xuICBjb25zdCBybmQgPSBNYXRoLnJhbmRvbSgpO1xuICBjb25zdCB1aWQgPSBybmQudG9TdHJpbmcoKS5zdWJzdHIoMik7XG4gIHJldHVybiBgZjJoLSR7dWlkfWA7XG59XG5cbmZ1bmN0aW9uIGdldFJvb3RGcmFtZXMoKSB7XG4gIGNvbnN0IHsgY3VycmVudFBhZ2UgfSA9IGZpZ21hO1xuICBjb25zdCByb290RnJhbWVzID0gY3VycmVudFBhZ2UuY2hpbGRyZW4uZmlsdGVyKChub2RlKSA9PiBub2RlLnR5cGUgPT09IFwiRlJBTUVcIikgYXMgRnJhbWVOb2RlW107XG5cbiAgLy8gUmV0dXJuIGVycm9yIGlmIHRoZXJlJ3Mgbm8gZnJhbWVzIG9uIHRoZSBjdXJyZW50IHBhZ2VcbiAgaWYgKHJvb3RGcmFtZXMubGVuZ3RoIDwgMSkge1xuICAgIGNvbnNvbGUud2FybihcIk5vIGZyYW1lc1wiKTtcbiAgICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7IHR5cGU6IE1TR19FVkVOVFMuTk9fRlJBTUVTIH0gYXMgTXNnTm9GcmFtZXNUeXBlKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBmcmFtZXNEYXRhOiB7IFtpZDogc3RyaW5nXTogRnJhbWVEYXRhVHlwZSB9ID0ge307XG5cbiAgcm9vdEZyYW1lcy5mb3JFYWNoKChmcmFtZSkgPT4ge1xuICAgIGNvbnN0IHsgbmFtZSwgd2lkdGgsIGhlaWdodCwgaWQgfSA9IGZyYW1lO1xuICAgIGNvbnN0IHRleHROb2RlcyA9IGdldFRleHROb2RlcyhmcmFtZSk7XG4gICAgY29uc3QgdWlkID0gZ2VuUmFuZG9tVWlkKCk7XG5cbiAgICBmcmFtZXNEYXRhW2lkXSA9IHtcbiAgICAgIG5hbWUsXG4gICAgICB3aWR0aCxcbiAgICAgIGhlaWdodCxcbiAgICAgIGlkLFxuICAgICAgdGV4dE5vZGVzLFxuICAgICAgdWlkLFxuICAgICAgcmVzcG9uc2l2ZTogZmFsc2UsXG4gICAgICBzZWxlY3RlZDogdHJ1ZSxcbiAgICB9O1xuICB9KTtcblxuICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7XG4gICAgdHlwZTogTVNHX0VWRU5UUy5GT1VORF9GUkFNRVMsXG4gICAgZnJhbWVzOiBmcmFtZXNEYXRhLFxuICB9IGFzIE1zZ0ZyYW1lc1R5cGUpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBnZXRGcmFtZVN2Z0FzU3RyaW5nKGZyYW1lOiBTY2VuZU5vZGUpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBzdmdCdWZmID0gYXdhaXQgZnJhbWUuZXhwb3J0QXN5bmMoe1xuICAgIGZvcm1hdDogXCJTVkdcIixcbiAgICBzdmdPdXRsaW5lVGV4dDogZmFsc2UsXG4gICAgc3ZnU2ltcGxpZnlTdHJva2U6IHRydWUsXG4gIH0pO1xuXG4gIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KG51bGwsIEFycmF5LmZyb20oc3ZnQnVmZikpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVSZW5kZXIoZnJhbWVJZDogc3RyaW5nKSB7XG4gIHRyeSB7XG4gICAgY29uc3Qgc3ZnU3RyID0gYXdhaXQgcmVuZGVyRnJhbWUoZnJhbWVJZCk7XG5cbiAgICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7XG4gICAgICB0eXBlOiBNU0dfRVZFTlRTLlJFTkRFUixcbiAgICAgIGZyYW1lSWQsXG4gICAgICBzdmdTdHIsXG4gICAgfSBhcyBNc2dSZW5kZXJUeXBlKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgZmlnbWEudWkucG9zdE1lc3NhZ2Uoe1xuICAgICAgdHlwZTogTVNHX0VWRU5UUy5FUlJPUixcbiAgICAgIGVycm9yVGV4dDogYFJlbmRlciBmYWlsZWQ6ICR7ZXJyID8/IGVyci5tZXNzYWdlfWAsXG4gICAgfSBhcyBNc2dFcnJvclR5cGUpO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHJlbmRlckZyYW1lKGZyYW1lSWQ6IHN0cmluZykge1xuICBjb25zdCBmcmFtZSA9IGZpZ21hLmdldE5vZGVCeUlkKGZyYW1lSWQpO1xuICBpZiAoIWZyYW1lIHx8IGZyYW1lLnR5cGUgIT09IFwiRlJBTUVcIikge1xuICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgZnJhbWVcIik7XG4gIH1cblxuICBsZXQgc3ZnU3RyID0gYXdhaXQgZ2V0RnJhbWVTdmdBc1N0cmluZyhmcmFtZSk7XG5cbiAgLy8gTk9URTogRmlnbWEgZ2VuZXJhdGVzIG5vbi11bmlxdWUgSURzIGZvciBtYXNrcyB3aGljaCBjYW4gY2xhc2ggd2hlblxuICAvLyBlbWJlZGRpbmcgbXVsdGlwbGUgU1ZHU3MuIFdlIGRvIGEgc3RyaW5nIHJlcGxhY2UgZm9yIHVuaXF1ZSBJRHNcbiAgY29uc3QgcmVnZXggPSAvaWQ9XCIoLis/KVwiL2c7XG4gIGNvbnN0IGlkczogc3RyaW5nW10gPSBbXTtcbiAgbGV0IG1hdGNoZXM7XG5cbiAgd2hpbGUgKChtYXRjaGVzID0gcmVnZXguZXhlYyhzdmdTdHIpKSkge1xuICAgIGNvbnN0IFssIGlkXSA9IG1hdGNoZXM7XG4gICAgaWRzLnB1c2goaWQpO1xuICB9XG5cbiAgaWRzLmZvckVhY2goKGlkKSA9PiB7XG4gICAgY29uc3QgcmFuZG9tSWQgPSBgJHtpZH0tJHtnZW5SYW5kb21VaWQoKX1gO1xuICAgIC8vIFJlcGxhY2UgSURcbiAgICBzdmdTdHIgPSBzdmdTdHIucmVwbGFjZShgaWQ9XCIke2lkfVwiYCwgYGlkPVwiJHtyYW5kb21JZH1cImApO1xuICAgIC8vIFJlcGxhY2UgYW5jaG9yIHJlZnNcbiAgICBzdmdTdHIgPSBzdmdTdHIucmVwbGFjZShgIyR7aWR9YCwgYCMke3JhbmRvbUlkfWApO1xuICB9KTtcblxuICByZXR1cm4gc3ZnU3RyO1xufVxuXG5leHBvcnQgdHlwZSB0ZXh0Tm9kZVNlbGVjdGVkUHJvcHMgPSBQaWNrPFRleHROb2RlLCBcInhcIiB8IFwieVwiIHwgXCJ3aWR0aFwiIHwgXCJoZWlnaHRcIiB8IFwiY2hhcmFjdGVyc1wiPjtcblxuZXhwb3J0IGludGVyZmFjZSB0ZXh0RGF0YSBleHRlbmRzIHRleHROb2RlU2VsZWN0ZWRQcm9wcyB7XG4gIGNvbG91cjogeyByOiBudW1iZXI7IGc6IG51bWJlcjsgYjogbnVtYmVyOyBhOiBudW1iZXIgfTtcbiAgZm9udFNpemU6IG51bWJlcjtcbiAgZm9udEZhbWlseTogc3RyaW5nO1xufVxuXG4vLyBFeHRyYWN0IG9iamVjdCBwcm9wZXJ0aWVzIGZyb20gdGV4dE5vZGUgZm9yIHBhc3NpbmcgdmlhIHBvc3RNZXNzYWdlXG5mdW5jdGlvbiBnZXRUZXh0Tm9kZXMoZnJhbWU6IEZyYW1lTm9kZSk6IHRleHREYXRhW10ge1xuICBjb25zdCB0ZXh0Tm9kZXMgPSBmcmFtZS5maW5kQWxsKCh7IHR5cGUgfSkgPT4gdHlwZSA9PT0gXCJURVhUXCIpIGFzIFRleHROb2RlW107XG4gIGNvbnN0IHsgYWJzb2x1dGVUcmFuc2Zvcm0gfSA9IGZyYW1lO1xuICBjb25zdCByb290WCA9IGFic29sdXRlVHJhbnNmb3JtWzBdWzJdO1xuICBjb25zdCByb290WSA9IGFic29sdXRlVHJhbnNmb3JtWzFdWzJdO1xuXG4gIHJldHVybiB0ZXh0Tm9kZXMubWFwKFxuICAgIChub2RlKTogdGV4dERhdGEgPT4ge1xuICAgICAgY29uc3QgeyBhYnNvbHV0ZVRyYW5zZm9ybSwgd2lkdGgsIGhlaWdodCwgZm9udFNpemU6IGZvbnRTaXplRGF0YSwgZm9udE5hbWUsIGZpbGxzLCBjaGFyYWN0ZXJzIH0gPSBub2RlO1xuXG4gICAgICAvLyBOT1RFOiBGaWdtYSBub2RlIHgsIHkgYXJlIHJlbGF0aXZlIHRvIGZpcnN0IHBhcmVudCwgd2Ugd2FudCB0aGVtXG4gICAgICAvLyByZWxhdGl2ZSB0byB0aGUgcm9vdCBmcmFtZVxuICAgICAgY29uc3QgdGV4dFggPSBhYnNvbHV0ZVRyYW5zZm9ybVswXVsyXTtcbiAgICAgIGNvbnN0IHRleHRZID0gYWJzb2x1dGVUcmFuc2Zvcm1bMV1bMl07XG4gICAgICBjb25zdCB4ID0gdGV4dFggLSByb290WDtcbiAgICAgIGNvbnN0IHkgPSB0ZXh0WSAtIHJvb3RZO1xuXG4gICAgICAvLyBFeHRyYWN0IGJhc2ljIGZpbGwgY29sb3VyXG4gICAgICBjb25zdCBbZmlsbF0gPSBmaWxscztcbiAgICAgIGxldCBjb2xvdXIgPSB7IHI6IDAsIGc6IDAsIGI6IDAsIGE6IDEgfTtcbiAgICAgIGlmIChmaWxsLnR5cGUgPT09IFwiU09MSURcIikge1xuICAgICAgICBjb2xvdXIgPSB7IC4uLmNvbG91ciwgYTogZmlsbC5vcGFjaXR5IHx8IDEgfTtcbiAgICAgIH1cblxuICAgICAgLy8gRXh0cmFjdCBmb250IGZhbWlseVxuICAgICAgbGV0IGZvbnRTaXplID0gMTY7XG4gICAgICBpZiAoZm9udFNpemVEYXRhICE9PSBmaWdtYS5taXhlZCkge1xuICAgICAgICBmb250U2l6ZSA9IGZvbnRTaXplRGF0YTtcbiAgICAgIH1cblxuICAgICAgLy8gRXh0cmFjdCBmb250IGZhbWlseVxuICAgICAgbGV0IGZvbnRGYW1pbHkgPSBcIkFyaWFsXCI7XG4gICAgICBpZiAoZm9udE5hbWUgIT09IGZpZ21hLm1peGVkKSB7XG4gICAgICAgIGZvbnRGYW1pbHkgPSBmb250TmFtZS5mYW1pbHk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7IHgsIHksIHdpZHRoLCBoZWlnaHQsIGZvbnRTaXplLCBmb250RmFtaWx5LCBjb2xvdXIsIGNoYXJhY3RlcnMgfTtcbiAgICB9XG4gICk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUG9zdE1zZyB7XG4gIHR5cGU6IE1TR19FVkVOVFM7XG4gIGZyYW1lSWQ6IHN0cmluZztcbiAgd2lkdGg6IG51bWJlcjtcbiAgaGVpZ2h0OiBudW1iZXI7XG59XG4vLyBIYW5kbGUgbWVzc2FnZXMgZnJvbSB0aGUgVUlcbmZ1bmN0aW9uIGhhbmRsZVJlY2VpdmVkTXNnKG1zZzogUG9zdE1zZykge1xuICBjb25zdCB7IHR5cGUsIHdpZHRoLCBoZWlnaHQsIGZyYW1lSWQgfSA9IG1zZztcblxuICBzd2l0Y2ggKHR5cGUpIHtcbiAgICBjYXNlIE1TR19FVkVOVFMuRVJST1I6XG4gICAgICBjb25zb2xlLmxvZyhcInBsdWdpbiBtc2c6IGVycm9yXCIpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIE1TR19FVkVOVFMuQ0xPU0U6XG4gICAgICBjb25zb2xlLmxvZyhcInBsdWdpbiBtc2c6IGNsb3NlXCIpO1xuICAgICAgZmlnbWEuY2xvc2VQbHVnaW4oKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSBNU0dfRVZFTlRTLkRPTV9SRUFEWTpcbiAgICAgIGNvbnNvbGUubG9nKFwicGx1Z2luIG1zZzogRE9NIFJFQURZXCIpO1xuICAgICAgZ2V0Um9vdEZyYW1lcygpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIE1TR19FVkVOVFMuUkVOREVSOlxuICAgICAgY29uc29sZS5sb2coXCJwbHVnaW4gbXNnOiByZW5kZXJcIiwgZnJhbWVJZCk7XG4gICAgICBoYW5kbGVSZW5kZXIoZnJhbWVJZCk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgTVNHX0VWRU5UUy5SRVNJWkU6XG4gICAgICBjb25zb2xlLmxvZyhcInBsdWdpbiBtc2c6IHJlc2l6ZVwiKTtcbiAgICAgIGZpZ21hLnVpLnJlc2l6ZSh3aWR0aCwgaGVpZ2h0KTtcbiAgICAgIGJyZWFrO1xuXG4gICAgZGVmYXVsdDpcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJVbmtub3duIHBvc3QgbWVzc2FnZVwiLCBtc2cpO1xuICB9XG59XG5cbi8vIExpc3RlbiBmb3IgbWVzc2FnZXMgZnJvbSB0aGUgVUlcbi8vIE5PVEU6IExpc3RlbiBmb3IgRE9NX1JFQURZIG1lc3NhZ2UgdG8ga2ljay1vZmYgbWFpbiBmdW5jdGlvblxuZmlnbWEudWkub24oXCJtZXNzYWdlXCIsIChlKSA9PiBoYW5kbGVSZWNlaXZlZE1zZyhlKSk7XG5cbi8vIFJlbmRlciB0aGUgRE9NXG4vLyBOT1RFOiBvbiBzdWNjZXNzZnVsIFVJIHJlbmRlciBhIHBvc3QgbWVzc2FnZSBpcyBzZW5kIGJhY2sgb2YgRE9NX1JFQURZXG5maWdtYS5zaG93VUkoX19odG1sX18pO1xuXG4vLyBSZXNpemUgVUkgdG8gbWF4IHZpZXdwb3J0IGRpbWVuc2lvbnNcbmNvbnN0IHsgd2lkdGgsIGhlaWdodCB9ID0gZmlnbWEudmlld3BvcnQuYm91bmRzO1xuY29uc3QgeyB6b29tIH0gPSBmaWdtYS52aWV3cG9ydDtcbmNvbnN0IGluaXRpYWxXaW5kb3dXaWR0aCA9IE1hdGgucm91bmQod2lkdGggKiB6b29tKTtcbmNvbnN0IGluaXRpYWxXaW5kb3dIZWlnaHQgPSBNYXRoLnJvdW5kKGhlaWdodCAqIHpvb20pO1xuZmlnbWEudWkucmVzaXplKGluaXRpYWxXaW5kb3dXaWR0aCwgaW5pdGlhbFdpbmRvd0hlaWdodCk7XG4iLCAiZXhwb3J0IGVudW0gU1RBR0VTIHtcbiAgQ0hPT1NFX0ZSQU1FUyxcbiAgUFJFVklFV19PVVRQVVQsXG4gIFJFU1BPTlNJVkVfUFJFVklFVyxcbiAgU0FWRV9PVVRQVVQsXG59XG5cbmV4cG9ydCBlbnVtIE1TR19FVkVOVFMge1xuICBET01fUkVBRFksXG4gIE5PX0ZSQU1FUyxcbiAgRk9VTkRfRlJBTUVTLFxuICBSRVNJWkUsXG4gIFJFTkRFUixcbiAgQ0xPU0UsXG4gIEVSUk9SLFxufVxuXG5leHBvcnQgZW51bSBPVVRQVVRfRk9STUFUUyB7XG4gIElOTElORSxcbiAgSUZSQU1FLFxufVxuXG5leHBvcnQgY29uc3QgVUlfVEVYVCA9IHtcbiAgRVJST1JfVU5FWFBFQ1RFRDogXCJVbmV4cGVjdGVkIGVycm9yXCIsXG4gIEVSUk9SX01JU1NJTkdfRlJBTUVTOiBcIk5vIGZyYW1lcyBmb3VuZC4gUGxlYXNlIGFkZCBzb21lIGZyYW1lcyB0byB0aGUgcGFnZS5cIixcbiAgV0FSTl9OT19UQVJHRVRTOiBcIlN0YW5kYXJkIGZyYW1lcyBub3QgZm91bmQuIFBsZWFzZSBzZWxlY3QgdGFyZ2V0IGZyYW1lcy5cIixcbiAgV0FSTl9UT09fTUFOWV9UQVJHRVRTOiBcIlBsZWFzZSBzZWxlY3QgdGhyZWUgdGFyZ2V0IGZyYW1lc1wiLFxuICBJTkZPX1BSRVZJRVc6IFwiUHJldmlldyBlYWNoIGZyYW1lIG91dHB1dFwiLFxuICBUSVRMRV9DSE9PU0VfRlJBTUU6IFwiQ2hvb3NlIHdoaWNoIGZyYW1lcyB0byBleHBvcnRcIixcbiAgVElUTEVfUFJFVklFVzogXCJQcmV2aWV3XCIsXG4gIFRJVExFX1JFU1BPTlNJVkVfUFJFVklFVzogXCJSZXNwb25zaXZlIHByZXZpZXdcIixcbiAgVElMRV9PVVRQVVQ6IFwiRXhwb3J0XCIsXG4gIEJVVFRPTl9ORVhUOiBcIk5leHRcIixcbiAgQlVUVE9OX0RPV05MT0FEOiBcIkRvd25sb2FkXCIsXG4gIEJVVFRPTl9QUkVWSU9VUzogXCJCYWNrXCIsXG59O1xuXG5leHBvcnQgY29uc3QgSU5JVElBTF9VSV9TSVpFID0ge1xuICB3aWR0aDogNDgwLFxuICBoZWlnaHQ6IDUwMCxcbiAgbWF4V2lkdGg6IDEyMDAsXG4gIG1heEhlaWdodDogOTAwLFxuICBtaW5XaWR0aDogNDIwLFxuICBtaW5IZWlnaHQ6IDQ4MCxcbn07XG5cbmV4cG9ydCBjb25zdCBGUkFNRV9XQVJOSU5HX1NJWkUgPSAzMDA7XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBS0E7QUFDRSxZQUFNLE1BQU0s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
