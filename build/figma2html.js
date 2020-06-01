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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL2luZGV4LnRzeCIsICJzcmMvY29uc3RhbnRzLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgeyBNU0dfRVZFTlRTLCBJTklUSUFMX1VJX1NJWkUgfSBmcm9tIFwiLi9jb25zdGFudHNcIjtcbmltcG9ydCB7IE1zZ0ZyYW1lc1R5cGUsIE1zZ05vRnJhbWVzVHlwZSwgTXNnUmVuZGVyVHlwZSwgTXNnRXJyb3JUeXBlLCBGcmFtZURhdGFUeXBlIH0gZnJvbSBcIi4vdWlcIjtcblxuLy8gR2VuZXJhdGUgYSB1bmlxdWUgaWQgcHJlZml4ZWQgd2l0aCBpZGVudGlmZXIgc3RyaW5nIGZvciBzYWZlIHVzZSBhcyBIVE1MIElEXG4vLyBOb3RlOiBGaWdtYSBzZWVtcyB0byBzdHViIC50b1N0cmluZyBmb3Igc2VjdXJpdHk/XG5mdW5jdGlvbiBnZW5SYW5kb21VaWQoKSB7XG4gIGNvbnN0IHJuZCA9IE1hdGgucmFuZG9tKCk7XG4gIGNvbnN0IHVpZCA9IHJuZC50b1N0cmluZygpLnN1YnN0cigyKTtcbiAgcmV0dXJuIGBmMmgtJHt1aWR9YDtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZ2V0RnJhbWVTdmdBc1N0cmluZyhmcmFtZTogU2NlbmVOb2RlKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3Qgc3ZnQnVmZiA9IGF3YWl0IGZyYW1lLmV4cG9ydEFzeW5jKHtcbiAgICBmb3JtYXQ6IFwiU1ZHXCIsXG4gICAgc3ZnT3V0bGluZVRleHQ6IGZhbHNlLFxuICAgIHN2Z1NpbXBsaWZ5U3Ryb2tlOiB0cnVlLFxuICB9KTtcblxuICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShudWxsLCBBcnJheS5mcm9tKHN2Z0J1ZmYpKTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQb3N0TXNnIHtcbiAgdHlwZTogTVNHX0VWRU5UUztcbiAgZnJhbWVJZDogc3RyaW5nO1xuICB3aWR0aDogbnVtYmVyO1xuICBoZWlnaHQ6IG51bWJlcjtcbn1cbi8vIEhhbmRsZSBtZXNzYWdlcyBmcm9tIHRoZSBVSVxuY29uc3QgaGFuZGxlUmVjZWl2ZWRNc2cgPSAobXNnOiBQb3N0TXNnKSA9PiB7XG4gIGNvbnN0IHsgdHlwZSwgd2lkdGgsIGhlaWdodCwgZnJhbWVJZCB9ID0gbXNnO1xuXG4gIHN3aXRjaCAodHlwZSkge1xuICAgIGNhc2UgTVNHX0VWRU5UUy5FUlJPUjpcbiAgICAgIGNvbnNvbGUubG9nKFwicGx1Z2luIG1zZzogZXJyb3JcIik7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgTVNHX0VWRU5UUy5DTE9TRTpcbiAgICAgIGNvbnNvbGUubG9nKFwicGx1Z2luIG1zZzogY2xvc2VcIik7XG4gICAgICBmaWdtYS5jbG9zZVBsdWdpbigpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIE1TR19FVkVOVFMuRE9NX1JFQURZOlxuICAgICAgY29uc29sZS5sb2coXCJwbHVnaW4gbXNnOiBET00gUkVBRFlcIik7XG4gICAgICBtYWluKCk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgTVNHX0VWRU5UUy5SRU5ERVI6XG4gICAgICBjb25zb2xlLmxvZyhcInBsdWdpbiBtc2c6IHJlbmRlclwiLCBmcmFtZUlkKTtcbiAgICAgIHJlbmRlckZyYW1lKGZyYW1lSWQpXG4gICAgICAgIC50aGVuKChzdmdTdHIpID0+IHtcbiAgICAgICAgICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7XG4gICAgICAgICAgICB0eXBlOiBNU0dfRVZFTlRTLlJFTkRFUixcbiAgICAgICAgICAgIGZyYW1lSWQsXG4gICAgICAgICAgICBzdmdTdHIsXG4gICAgICAgICAgfSBhcyBNc2dSZW5kZXJUeXBlKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7XG4gICAgICAgICAgICB0eXBlOiBNU0dfRVZFTlRTLkVSUk9SLFxuICAgICAgICAgICAgZXJyb3JUZXh0OiBgUmVuZGVyIGZhaWxlZDogJHtlcnIgPz8gZXJyLm1lc3NhZ2V9YCxcbiAgICAgICAgICB9IGFzIE1zZ0Vycm9yVHlwZSk7XG4gICAgICAgIH0pO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIE1TR19FVkVOVFMuUkVTSVpFOlxuICAgICAgY29uc29sZS5sb2coXCJwbHVnaW4gbXNnOiByZXNpemVcIik7XG4gICAgICBmaWdtYS51aS5yZXNpemUod2lkdGgsIGhlaWdodCk7XG4gICAgICBicmVhaztcblxuICAgIGRlZmF1bHQ6XG4gICAgICBjb25zb2xlLmVycm9yKFwiVW5rbm93biBwb3N0IG1lc3NhZ2VcIiwgbXNnKTtcbiAgfVxufTtcblxuLy8gTGlzdGVuIGZvciBtZXNzYWdlcyBmcm9tIHRoZSBVSVxuZmlnbWEudWkub24oXCJtZXNzYWdlXCIsIChlKSA9PiBoYW5kbGVSZWNlaXZlZE1zZyhlKSk7XG5cbmNvbnN0IG1haW4gPSAoKSA9PiB7XG4gIGNvbnN0IHsgY3VycmVudFBhZ2UgfSA9IGZpZ21hO1xuXG4gIC8vIEdldCBkZWZhdWx0IGZyYW1lcyBuYW1lc1xuICBjb25zdCBhbGxGcmFtZXMgPSBjdXJyZW50UGFnZS5jaGlsZHJlbi5maWx0ZXIoKG5vZGUpID0+IG5vZGUudHlwZSA9PT0gXCJGUkFNRVwiKSBhcyBGcmFtZU5vZGVbXTtcblxuICBpZiAoYWxsRnJhbWVzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBmcmFtZXNEYXRhOiB7IFtpZDogc3RyaW5nXTogRnJhbWVEYXRhVHlwZSB9ID0ge307XG5cbiAgICBhbGxGcmFtZXMuZm9yRWFjaCgoZnJhbWUpID0+IHtcbiAgICAgIGNvbnN0IHsgbmFtZSwgd2lkdGgsIGhlaWdodCwgaWQgfSA9IGZyYW1lO1xuICAgICAgY29uc3QgdGV4dE5vZGVzID0gZ2V0VGV4dE5vZGVzKGZyYW1lKTtcbiAgICAgIGNvbnN0IHVpZCA9IGdlblJhbmRvbVVpZCgpO1xuXG4gICAgICBmcmFtZXNEYXRhW2lkXSA9IHtcbiAgICAgICAgbmFtZSxcbiAgICAgICAgd2lkdGgsXG4gICAgICAgIGhlaWdodCxcbiAgICAgICAgaWQsXG4gICAgICAgIHRleHROb2RlcyxcbiAgICAgICAgdWlkLFxuICAgICAgICByZXNwb25zaXZlOiBmYWxzZSxcbiAgICAgICAgc2VsZWN0ZWQ6IHRydWUsXG4gICAgICB9O1xuICAgIH0pO1xuXG4gICAgZmlnbWEudWkucG9zdE1lc3NhZ2Uoe1xuICAgICAgdHlwZTogTVNHX0VWRU5UUy5GT1VORF9GUkFNRVMsXG4gICAgICBmcmFtZXM6IGZyYW1lc0RhdGEsXG4gICAgfSBhcyBNc2dGcmFtZXNUeXBlKTtcblxuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmIChhbGxGcmFtZXMubGVuZ3RoIDwgMSkge1xuICAgIGNvbnNvbGUud2FybihcIk5vIGZyYW1lc1wiKTtcbiAgICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7IHR5cGU6IE1TR19FVkVOVFMuTk9fRlJBTUVTIH0gYXMgTXNnTm9GcmFtZXNUeXBlKTtcbiAgICByZXR1cm47XG4gIH1cbn07XG5cbi8vIFJlbmRlciB0aGUgRE9NXG5maWdtYS5zaG93VUkoX19odG1sX18pO1xuZmlnbWEudWkucmVzaXplKElOSVRJQUxfVUlfU0laRS53aWR0aCwgSU5JVElBTF9VSV9TSVpFLmhlaWdodCk7XG5cbmFzeW5jIGZ1bmN0aW9uIHJlbmRlckZyYW1lKGZyYW1lSWQ6IHN0cmluZykge1xuICBjb25zdCBmcmFtZSA9IGZpZ21hLmdldE5vZGVCeUlkKGZyYW1lSWQpO1xuICBpZiAoIWZyYW1lIHx8IGZyYW1lLnR5cGUgIT09IFwiRlJBTUVcIikge1xuICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgZnJhbWVcIik7XG4gIH1cblxuICBsZXQgc3ZnU3RyID0gYXdhaXQgZ2V0RnJhbWVTdmdBc1N0cmluZyhmcmFtZSk7XG5cbiAgLy8gTk9URTogRmlnbWEgZ2VuZXJhdGVzIG5vbi11bmlxdWUgSURzIGZvciBtYXNrcyB3aGljaCBjYW4gY2xhc2ggd2hlblxuICAvLyBlbWJlZGRpbmcgbXVsdGlwbGUgU1ZHU3MuIFdlIGRvIGEgc3RyaW5nIHJlcGxhY2UgZm9yIHVuaXF1ZSBJRHNcbiAgY29uc3QgcmVnZXggPSAvaWQ9XCIoLis/KVwiL2c7XG4gIGNvbnN0IGlkczogc3RyaW5nW10gPSBbXTtcbiAgbGV0IG1hdGNoZXM7XG5cbiAgd2hpbGUgKChtYXRjaGVzID0gcmVnZXguZXhlYyhzdmdTdHIpKSkge1xuICAgIGNvbnN0IFssIGlkXSA9IG1hdGNoZXM7XG4gICAgaWRzLnB1c2goaWQpO1xuICB9XG5cbiAgaWRzLmZvckVhY2goKGlkKSA9PiB7XG4gICAgY29uc3QgcmFuZG9tSWQgPSBgJHtpZH0tJHtnZW5SYW5kb21VaWQoKX1gO1xuICAgIC8vIFJlcGxhY2UgSURcbiAgICBzdmdTdHIgPSBzdmdTdHIucmVwbGFjZShgaWQ9XCIke2lkfVwiYCwgYGlkPVwiJHtyYW5kb21JZH1cImApO1xuICAgIC8vIFJlcGxhY2UgYW5jaG9yIHJlZnNcbiAgICBzdmdTdHIgPSBzdmdTdHIucmVwbGFjZShgIyR7aWR9YCwgYCMke3JhbmRvbUlkfWApO1xuICB9KTtcblxuICByZXR1cm4gc3ZnU3RyO1xufVxuXG5leHBvcnQgdHlwZSB0ZXh0Tm9kZVNlbGVjdGVkUHJvcHMgPSBQaWNrPFRleHROb2RlLCBcInhcIiB8IFwieVwiIHwgXCJ3aWR0aFwiIHwgXCJoZWlnaHRcIiB8IFwiY2hhcmFjdGVyc1wiPjtcblxuZXhwb3J0IGludGVyZmFjZSB0ZXh0RGF0YSBleHRlbmRzIHRleHROb2RlU2VsZWN0ZWRQcm9wcyB7XG4gIGNvbG91cjogeyByOiBudW1iZXI7IGc6IG51bWJlcjsgYjogbnVtYmVyOyBhOiBudW1iZXIgfTtcbiAgZm9udFNpemU6IG51bWJlcjtcbiAgZm9udEZhbWlseTogc3RyaW5nO1xufVxuXG4vLyBFeHRyYWN0IG9iamVjdCBwcm9wZXJ0aWVzIGZyb20gdGV4dE5vZGUgZm9yIHBhc3NpbmcgdmlhIHBvc3RNZXNzYWdlXG5mdW5jdGlvbiBnZXRUZXh0Tm9kZXMoZnJhbWU6IEZyYW1lTm9kZSk6IHRleHREYXRhW10ge1xuICBjb25zdCB0ZXh0Tm9kZXMgPSBmcmFtZS5maW5kQWxsKCh7IHR5cGUgfSkgPT4gdHlwZSA9PT0gXCJURVhUXCIpIGFzIFRleHROb2RlW107XG4gIGNvbnN0IHsgYWJzb2x1dGVUcmFuc2Zvcm0gfSA9IGZyYW1lO1xuICBjb25zdCByb290WCA9IGFic29sdXRlVHJhbnNmb3JtWzBdWzJdO1xuICBjb25zdCByb290WSA9IGFic29sdXRlVHJhbnNmb3JtWzFdWzJdO1xuXG4gIHJldHVybiB0ZXh0Tm9kZXMubWFwKFxuICAgIChub2RlKTogdGV4dERhdGEgPT4ge1xuICAgICAgY29uc3QgeyBhYnNvbHV0ZVRyYW5zZm9ybSwgd2lkdGgsIGhlaWdodCwgZm9udFNpemU6IGZvbnRTaXplRGF0YSwgZm9udE5hbWUsIGZpbGxzLCBjaGFyYWN0ZXJzIH0gPSBub2RlO1xuXG4gICAgICAvLyBOT1RFOiBGaWdtYSBub2RlIHgsIHkgYXJlIHJlbGF0aXZlIHRvIGZpcnN0IHBhcmVudCwgd2Ugd2FudCB0aGVtXG4gICAgICAvLyByZWxhdGl2ZSB0byB0aGUgcm9vdCBmcmFtZVxuICAgICAgY29uc3QgdGV4dFggPSBhYnNvbHV0ZVRyYW5zZm9ybVswXVsyXTtcbiAgICAgIGNvbnN0IHRleHRZID0gYWJzb2x1dGVUcmFuc2Zvcm1bMV1bMl07XG4gICAgICBjb25zdCB4ID0gdGV4dFggLSByb290WDtcbiAgICAgIGNvbnN0IHkgPSB0ZXh0WSAtIHJvb3RZO1xuXG4gICAgICAvLyBFeHRyYWN0IGJhc2ljIGZpbGwgY29sb3VyXG4gICAgICBjb25zdCBbZmlsbF0gPSBmaWxscztcbiAgICAgIGxldCBjb2xvdXIgPSB7IHI6IDAsIGc6IDAsIGI6IDAsIGE6IDEgfTtcbiAgICAgIGlmIChmaWxsLnR5cGUgPT09IFwiU09MSURcIikge1xuICAgICAgICBjb2xvdXIgPSB7IC4uLmNvbG91ciwgYTogZmlsbC5vcGFjaXR5IHx8IDEgfTtcbiAgICAgIH1cblxuICAgICAgLy8gRXh0cmFjdCBmb250IGZhbWlseVxuICAgICAgbGV0IGZvbnRTaXplID0gMTY7XG4gICAgICBpZiAoZm9udFNpemVEYXRhICE9PSBmaWdtYS5taXhlZCkge1xuICAgICAgICBmb250U2l6ZSA9IGZvbnRTaXplRGF0YTtcbiAgICAgIH1cblxuICAgICAgLy8gRXh0cmFjdCBmb250IGZhbWlseVxuICAgICAgbGV0IGZvbnRGYW1pbHkgPSBcIkFyaWFsXCI7XG4gICAgICBpZiAoZm9udE5hbWUgIT09IGZpZ21hLm1peGVkKSB7XG4gICAgICAgIGZvbnRGYW1pbHkgPSBmb250TmFtZS5mYW1pbHk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7IHgsIHksIHdpZHRoLCBoZWlnaHQsIGZvbnRTaXplLCBmb250RmFtaWx5LCBjb2xvdXIsIGNoYXJhY3RlcnMgfTtcbiAgICB9XG4gICk7XG59XG4iLCAiZXhwb3J0IHR5cGUgYm9hcmQgPSB7XG4gIGlkOiBzdHJpbmc7XG4gIHdpZHRoOiBudW1iZXI7XG4gIGJ1ZmZlcjogVWludDhBcnJheTtcbn07XG5cbmV4cG9ydCBlbnVtIFNUQUdFUyB7XG4gIENIT09TRV9GUkFNRVMsXG4gIFBSRVZJRVdfT1VUUFVULFxuICBSRVNQT05TSVZFX1BSRVZJRVcsXG4gIFNBVkVfT1VUUFVULFxufVxuXG5leHBvcnQgZW51bSBNU0dfRVZFTlRTIHtcbiAgRE9NX1JFQURZLFxuICBOT19GUkFNRVMsXG4gIEZPVU5EX0ZSQU1FUyxcbiAgUkVTSVpFLFxuICBSRU5ERVIsXG4gIENMT1NFLFxuICBFUlJPUixcbn1cblxuZXhwb3J0IGVudW0gQlJFQUtQT0lOVFMge1xuICBNb2JpbGUgPSAzNDAsXG4gIFRhYmxldCA9IDUyMCxcbiAgRGVza3RvcCA9IDEwMjQsXG59XG5cbmV4cG9ydCBlbnVtIE9VVFBVVF9GT1JNQVRTIHtcbiAgSU5MSU5FLFxuICBJRlJBTUUsXG59XG5cbmV4cG9ydCBjb25zdCBVSV9URVhUID0ge1xuICBFUlJPUl9VTkVYUEVDVEVEOiAnVW5leHBlY3RlZCBlcnJvcicsXG4gIEVSUk9SX01JU1NJTkdfRlJBTUVTOiAnTm8gZnJhbWVzIGZvdW5kLiBQbGVhc2UgYWRkIHNvbWUgZnJhbWVzIHRvIHRoZSBwYWdlLicsXG4gIFdBUk5fTk9fVEFSR0VUUzogJ1N0YW5kYXJkIGZyYW1lcyBub3QgZm91bmQuIFBsZWFzZSBzZWxlY3QgdGFyZ2V0IGZyYW1lcy4nLFxuICBXQVJOX1RPT19NQU5ZX1RBUkdFVFM6ICdQbGVhc2Ugc2VsZWN0IHRocmVlIHRhcmdldCBmcmFtZXMnLFxuICBJTkZPX1BSRVZJRVc6ICdQcmV2aWV3IGVhY2ggZnJhbWUgb3V0cHV0JyxcbiAgVElUTEVfQ0hPT1NFX0ZSQU1FOiAnQ2hvb3NlIHdoaWNoIGZyYW1lcyB0byBleHBvcnQnLFxuICBUSVRMRV9QUkVWSUVXOiAnUHJldmlldycsXG4gIFRJVExFX1JFU1BPTlNJVkVfUFJFVklFVzogJ1Jlc3BvbnNpdmUgcHJldmlldycsXG4gIFRJTEVfT1VUUFVUOiAnRXhwb3J0JyxcbiAgQlVUVE9OX05FWFQ6ICdOZXh0JyxcbiAgQlVUVE9OX0RPV05MT0FEOiAnRG93bmxvYWQnLFxuICBCVVRUT05fUFJFVklPVVM6ICdCYWNrJyxcbn07XG5cbmV4cG9ydCBjb25zdCBJTklUSUFMX1VJX1NJWkUgPSB7XG4gIHdpZHRoOiA0ODAsXG4gIGhlaWdodDogNTAwLFxuICBtYXhXaWR0aDogMTIwMCxcbiAgbWF4SGVpZ2h0OiA5MDAsXG4gIG1pbldpZHRoOiA0MjAsXG4gIG1pbkhlaWdodDogNDgwLFxufTtcblxuZXhwb3J0IGNvbnN0IEZSQU1FX1dBUk5JTkdfU0laRSA9IDMwMDtcbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFLQTtBQUNFLFlBQU0sTUFBTSxLQUFLO0FBQ2pCLFlBQU0sTUFBTSxJQUFJLFdBQVcsT0FBTztBQUNsQyxhQUFPLE9BQU87O0FBR2hCLHVDQUFtQztBQUNqQyxZQUFNLFVBQVUsTUFBTSxNQUFNLFlBQVk7UUFDdEMsUUFBUTtRQUNSLGdCQUFnQjtRQUNoQixtQkFBbUI7O0FBR3JCLGFBQU8sT0FBTyxhQUFhLE1BQU0s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
