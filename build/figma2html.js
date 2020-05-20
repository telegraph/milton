(() => {
  let __hasOwnProperty = Object.hasOwnProperty;
  let __modules = {};
  let __commonjs;
  let __require = (id) => {
    let module = __modules[id];
    if (!module) {
      module = __modules[id] = {
        exports: {}
      };
      __commonjs[id](module.exports, module);
    }
    return module.exports;
  };
  let __toModule = (module) => {
    if (module && module.__esModule) {
      return module;
    }
    let result = {};
    for (let key in module) {
      if (__hasOwnProperty.call(module, key)) {
        result[key] = module[key];
      }
    }
    result.default = module;
    return result;
  };
  let __import = (id) => {
    return __toModule(__require(id));
  };
  __commonjs = {
    1() {
      // src/constants.ts
      var STAGES;
      (function(STAGES2) {
        STAGES2[STAGES2["CHOOSE_FRAMES"] = 0] = "CHOOSE_FRAMES";
        STAGES2[STAGES2["PREVIEW_OUTPUT"] = 1] = "PREVIEW_OUTPUT";
        STAGES2[STAGES2["SAVE_OUTPUT"] = 2] = "SAVE_OUTPUT";
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
      const UI_TEXT = {
        ERROR_UNEXPECTED: "Unexpected error",
        ERROR_MISSING_FRAMES: "No frames found. Please add some frames to the page.",
        WARN_NO_TARGETS: "Standard frames not found. Please select target frames.",
        WARN_TOO_MANY_TARGETS: "Please select three target frames",
        INFO_PREVIEW: "Preview each frame output",
        TITLE_CHOOSE_FRAME: "Choose which frames to export",
        TITLE_PREVIEW: "Preview",
        TILE_OUTPUT: "Export",
        BUTTON_NEXT: "Next",
        BUTTON_DOWNLOAD: "Download",
        BUTTON_PREVIOUS: "Back"
      };

      // src/index.tsx
      const embedCss = `
  @import url('https://cf.eip.telegraph.co.uk/assets/_css/fontsv02.css'); 
  
  .f2h__text {
    margin: 0;
    font-family: sans-serif;
    transform: translate(-50%, -50%);
  }

  .f2h__render {
    position: relative;
  }

  .f2h__render svg text {
    display: none;
  }

  .f2h__render--responsive {
    width: 100%;
  }

  .f2h__render--responsive svg {
    width: 100%;
    height: auto;
  }
`;
      async function getFrameSvgAsString(frame) {
        const svgBuff = await frame.exportAsync({
          format: "SVG",
          svgOutlineText: false,
          svgSimplifyStroke: true
        });
        return String.fromCharCode.apply(null, Array.from(svgBuff));
      }
      const handleReceivedMsg = (msg) => {
        const {type, data, frameId} = msg;
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
            renderFrame(frameId).then((render) => {
              figma.ui.postMessage({
                type: MSG_EVENTS.RENDER,
                rawRender: render,
                renderId: frameId
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
            figma.ui.resize(data, 400);
            break;
          default:
            console.error("Unknown post message", msg);
        }
      };
      figma.ui.on("message", (e) => handleReceivedMsg(e));
      const main = () => {
        const {currentPage} = figma;
        console.log(MSG_EVENTS);
        const allFrames = currentPage.findAll((node) => node.type === "FRAME");
        const breakpoints = Object.keys(BREAKPOINTS).map((name) => name.toLowerCase());
        const selectedFrames = allFrames.filter((frame) => breakpoints.includes(frame.name.toLowerCase())).map((frame) => frame.id);
        if (allFrames.length > 0) {
          const framesData = allFrames.map(({name, width, id}) => ({
            name,
            width,
            id
          }));
          figma.ui.postMessage({
            type: MSG_EVENTS.FOUND_FRAMES,
            frames: framesData,
            selectedFrames
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
      figma.ui.resize(640, 640);
      async function renderFrame(frameId) {
        const frame = figma.getNodeById(frameId);
        if (!frame || frame.type !== "FRAME") {
          throw new Error("Missing frame");
        }
        const textNodes = frame.findAll((node) => {
          const {type, name} = node;
          console.log(type);
          return type === "TEXT";
        });
        const frameWidth = (frame == null ? void 0 : frame.width) || 1;
        const frameHeight = (frame == null ? void 0 : frame.height) || 1;
        console.log(frameWidth, frameHeight);
        const textStrings = textNodes.map((tNode) => {
          if (tNode.type !== "TEXT") {
            return;
          }
          const {characters, x, y, constraints, width, height, fontSize, fontName, fills} = tNode;
          const decoration = tNode.getRangeTextDecoration(0, characters.length);
          const style = tNode.getRangeTextStyleId(0, characters.length);
          const position = {
            left: `${(x + width / 2) / frameWidth * 100}%`,
            top: `${(y + height / 2) / frameHeight * 100}%`
          };
          const [fill] = fills;
          const {r = 0, g = 0, b = 0} = (fill == null ? void 0 : fill.color) || {};
          const {opacity = 1} = fill;
          console.log(r, g, b, fill == null ? void 0 : fill.color);
          const colour = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${opacity})`;
          const fontFamily = (fontName == null ? void 0 : fontName.family) || "sans-serif";
          const css = Object.entries(position).map(([prop, val]) => {
            return `${prop}: ${val}`;
          }).join("; ");
          const styleText = `
          font-size: ${String(fontSize)};
          font-family: ${fontFamily};
          position: absolute;
          color: ${colour};
          width: ${width};
          ${css}
        `;
          return `<p class="f2h__text" style="${styleText}">${characters}</p>`;
        });
        const textContainer = `
    <div class="f2h__text_container">
      ${textStrings.join("\n")}
    </div>
  `;
        const svg = await getFrameSvgAsString(frame);
        return `
    <div class="f2h__render" style="width: ${frameWidth}px;">
      ${svg}
      ${textContainer}
      <style>
        ${embedCss}
      </style>
    </div>
  `;
      }
    }
  };
  return __require(1);
})();
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL2NvbnN0YW50cy50cyIsICJzcmMvaW5kZXgudHN4Il0sCiAgInNvdXJjZXNDb250ZW50IjogWyJleHBvcnQgdHlwZSBib2FyZCA9IHtcbiAgaWQ6IHN0cmluZztcbiAgd2lkdGg6IG51bWJlcjtcbiAgYnVmZmVyOiBVaW50OEFycmF5O1xufTtcblxuZXhwb3J0IGVudW0gU1RBR0VTIHtcbiAgQ0hPT1NFX0ZSQU1FUyxcbiAgUFJFVklFV19PVVRQVVQsXG4gIFNBVkVfT1VUUFVULFxufVxuXG5leHBvcnQgZW51bSBNU0dfRVZFTlRTIHtcbiAgRE9NX1JFQURZLFxuICBOT19GUkFNRVMsXG4gIEZPVU5EX0ZSQU1FUyxcbiAgUkVTSVpFLFxuICBSRU5ERVIsXG4gIENMT1NFLFxuICBFUlJPUixcbn1cblxuZXhwb3J0IGVudW0gQlJFQUtQT0lOVFMge1xuICBNb2JpbGUgPSAzNDAsXG4gIFRhYmxldCA9IDUyMCxcbiAgRGVza3RvcCA9IDEwMjQsXG59XG5cbmV4cG9ydCBlbnVtIE9VVFBVVF9GT1JNQVRTIHtcbiAgSU5MSU5FLFxuICBJRlJBTUUsXG59XG5cbmV4cG9ydCBjb25zdCBVSV9URVhUID0ge1xuICBFUlJPUl9VTkVYUEVDVEVEOiAnVW5leHBlY3RlZCBlcnJvcicsXG4gIEVSUk9SX01JU1NJTkdfRlJBTUVTOiAnTm8gZnJhbWVzIGZvdW5kLiBQbGVhc2UgYWRkIHNvbWUgZnJhbWVzIHRvIHRoZSBwYWdlLicsXG4gIFdBUk5fTk9fVEFSR0VUUzogJ1N0YW5kYXJkIGZyYW1lcyBub3QgZm91bmQuIFBsZWFzZSBzZWxlY3QgdGFyZ2V0IGZyYW1lcy4nLFxuICBXQVJOX1RPT19NQU5ZX1RBUkdFVFM6ICdQbGVhc2Ugc2VsZWN0IHRocmVlIHRhcmdldCBmcmFtZXMnLFxuICBJTkZPX1BSRVZJRVc6ICdQcmV2aWV3IGVhY2ggZnJhbWUgb3V0cHV0JyxcbiAgVElUTEVfQ0hPT1NFX0ZSQU1FOiAnQ2hvb3NlIHdoaWNoIGZyYW1lcyB0byBleHBvcnQnLFxuICBUSVRMRV9QUkVWSUVXOiAnUHJldmlldycsXG4gIFRJTEVfT1VUUFVUOiAnRXhwb3J0JyxcbiAgQlVUVE9OX05FWFQ6ICdOZXh0JyxcbiAgQlVUVE9OX0RPV05MT0FEOiAnRG93bmxvYWQnLFxuICBCVVRUT05fUFJFVklPVVM6ICdCYWNrJyxcbn07XG4iLCAiaW1wb3J0IHsgQlJFQUtQT0lOVFMsIE1TR19FVkVOVFMgfSBmcm9tICcuL2NvbnN0YW50cyc7XG5pbXBvcnQgdHlwZSB7IGJvYXJkIH0gZnJvbSAnLi9jb25zdGFudHMnO1xuXG5jb25zdCBlbWJlZENzcyA9IGBcbiAgQGltcG9ydCB1cmwoJ2h0dHBzOi8vY2YuZWlwLnRlbGVncmFwaC5jby51ay9hc3NldHMvX2Nzcy9mb250c3YwMi5jc3MnKTsgXG4gIFxuICAuZjJoX190ZXh0IHtcbiAgICBtYXJnaW46IDA7XG4gICAgZm9udC1mYW1pbHk6IHNhbnMtc2VyaWY7XG4gICAgdHJhbnNmb3JtOiB0cmFuc2xhdGUoLTUwJSwgLTUwJSk7XG4gIH1cblxuICAuZjJoX19yZW5kZXIge1xuICAgIHBvc2l0aW9uOiByZWxhdGl2ZTtcbiAgfVxuXG4gIC5mMmhfX3JlbmRlciBzdmcgdGV4dCB7XG4gICAgZGlzcGxheTogbm9uZTtcbiAgfVxuXG4gIC5mMmhfX3JlbmRlci0tcmVzcG9uc2l2ZSB7XG4gICAgd2lkdGg6IDEwMCU7XG4gIH1cblxuICAuZjJoX19yZW5kZXItLXJlc3BvbnNpdmUgc3ZnIHtcbiAgICB3aWR0aDogMTAwJTtcbiAgICBoZWlnaHQ6IGF1dG87XG4gIH1cbmA7XG5cbmFzeW5jIGZ1bmN0aW9uIGdldEZyYW1lU3ZnQXNTdHJpbmcoZnJhbWU6IFNjZW5lTm9kZSk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IHN2Z0J1ZmYgPSBhd2FpdCBmcmFtZS5leHBvcnRBc3luYyh7XG4gICAgZm9ybWF0OiAnU1ZHJyxcbiAgICBzdmdPdXRsaW5lVGV4dDogZmFsc2UsXG4gICAgc3ZnU2ltcGxpZnlTdHJva2U6IHRydWUsXG4gIH0pO1xuXG4gIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KG51bGwsIEFycmF5LmZyb20oc3ZnQnVmZikpO1xufVxuXG5jb25zdCBoYW5kbGVSZWNlaXZlZE1zZyA9IChtc2c6IE1TR19FVkVOVFMpID0+IHtcbiAgY29uc3QgeyB0eXBlLCBkYXRhLCBmcmFtZUlkIH0gPSBtc2c7XG5cbiAgc3dpdGNoICh0eXBlKSB7XG4gICAgY2FzZSBNU0dfRVZFTlRTLkVSUk9SOlxuICAgICAgY29uc29sZS5sb2coJ3BsdWdpbiBtc2c6IGVycm9yJyk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgTVNHX0VWRU5UUy5DTE9TRTpcbiAgICAgIGNvbnNvbGUubG9nKCdwbHVnaW4gbXNnOiBjbG9zZScpO1xuICAgICAgZmlnbWEuY2xvc2VQbHVnaW4oKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSBNU0dfRVZFTlRTLkRPTV9SRUFEWTpcbiAgICAgIGNvbnNvbGUubG9nKCdwbHVnaW4gbXNnOiBET00gUkVBRFknKTtcbiAgICAgIG1haW4oKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSBNU0dfRVZFTlRTLlJFTkRFUjpcbiAgICAgIGNvbnNvbGUubG9nKCdwbHVnaW4gbXNnOiByZW5kZXInLCBmcmFtZUlkKTtcbiAgICAgIHJlbmRlckZyYW1lKGZyYW1lSWQpXG4gICAgICAgIC50aGVuKChyZW5kZXIpID0+IHtcbiAgICAgICAgICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7XG4gICAgICAgICAgICB0eXBlOiBNU0dfRVZFTlRTLlJFTkRFUixcbiAgICAgICAgICAgIHJhd1JlbmRlcjogcmVuZGVyLFxuICAgICAgICAgICAgcmVuZGVySWQ6IGZyYW1lSWQsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgZmlnbWEudWkucG9zdE1lc3NhZ2Uoe1xuICAgICAgICAgICAgdHlwZTogTVNHX0VWRU5UUy5FUlJPUixcbiAgICAgICAgICAgIGVycm9yVGV4dDogYFJlbmRlciBmYWlsZWQ6ICR7ZXJyID8/IGVyci5tZXNzYWdlfWAsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIE1TR19FVkVOVFMuUkVTSVpFOlxuICAgICAgY29uc29sZS5sb2coJ3BsdWdpbiBtc2c6IHJlc2l6ZScpO1xuICAgICAgZmlnbWEudWkucmVzaXplKGRhdGEsIDQwMCk7XG4gICAgICBicmVhaztcblxuICAgIGRlZmF1bHQ6XG4gICAgICBjb25zb2xlLmVycm9yKCdVbmtub3duIHBvc3QgbWVzc2FnZScsIG1zZyk7XG4gIH1cbn07XG5cbmZpZ21hLnVpLm9uKCdtZXNzYWdlJywgKGUpID0+IGhhbmRsZVJlY2VpdmVkTXNnKGUpKTtcblxuY29uc3QgbWFpbiA9ICgpID0+IHtcbiAgY29uc3QgeyBjdXJyZW50UGFnZSB9ID0gZmlnbWE7XG5cbiAgY29uc29sZS5sb2coTVNHX0VWRU5UUyk7XG5cbiAgLy8gR2V0IGRlZmF1bHQgZnJhbWVzIG5hbWVzXG4gIGNvbnN0IGFsbEZyYW1lcyA9IGN1cnJlbnRQYWdlLmZpbmRBbGwoKG5vZGUpID0+IG5vZGUudHlwZSA9PT0gJ0ZSQU1FJyk7XG4gIGNvbnN0IGJyZWFrcG9pbnRzID0gT2JqZWN0LmtleXMoQlJFQUtQT0lOVFMpLm1hcCgobmFtZSkgPT5cbiAgICBuYW1lLnRvTG93ZXJDYXNlKClcbiAgKTtcbiAgY29uc3Qgc2VsZWN0ZWRGcmFtZXMgPSBhbGxGcmFtZXNcbiAgICAuZmlsdGVyKChmcmFtZSkgPT4gYnJlYWtwb2ludHMuaW5jbHVkZXMoZnJhbWUubmFtZS50b0xvd2VyQ2FzZSgpKSlcbiAgICAubWFwKChmcmFtZSkgPT4gZnJhbWUuaWQpO1xuXG4gIGlmIChhbGxGcmFtZXMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IGZyYW1lc0RhdGEgPSBhbGxGcmFtZXMubWFwKCh7IG5hbWUsIHdpZHRoLCBpZCB9KSA9PiAoe1xuICAgICAgbmFtZSxcbiAgICAgIHdpZHRoLFxuICAgICAgaWQsXG4gICAgfSkpO1xuXG4gICAgZmlnbWEudWkucG9zdE1lc3NhZ2Uoe1xuICAgICAgdHlwZTogTVNHX0VWRU5UUy5GT1VORF9GUkFNRVMsXG4gICAgICBmcmFtZXM6IGZyYW1lc0RhdGEsXG4gICAgICBzZWxlY3RlZEZyYW1lcyxcbiAgICB9KTtcblxuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmIChhbGxGcmFtZXMubGVuZ3RoIDwgMSkge1xuICAgIGNvbnNvbGUud2FybignTm8gZnJhbWVzJyk7XG4gICAgZmlnbWEudWkucG9zdE1lc3NhZ2UoeyB0eXBlOiBNU0dfRVZFTlRTLk5PX0ZSQU1FUyB9KTtcbiAgICByZXR1cm47XG4gIH1cbn07XG5cbi8vIFJlbmRlciB0aGUgRE9NXG5maWdtYS5zaG93VUkoX19odG1sX18pO1xuZmlnbWEudWkucmVzaXplKDY0MCwgNjQwKTtcblxuYXN5bmMgZnVuY3Rpb24gcmVuZGVyRnJhbWUoZnJhbWVJZDogc3RyaW5nKSB7XG4gIGNvbnN0IGZyYW1lID0gZmlnbWEuZ2V0Tm9kZUJ5SWQoZnJhbWVJZCk7XG4gIGlmICghZnJhbWUgfHwgZnJhbWUudHlwZSAhPT0gJ0ZSQU1FJykge1xuICAgIHRocm93IG5ldyBFcnJvcignTWlzc2luZyBmcmFtZScpO1xuICB9XG5cbiAgY29uc3QgdGV4dE5vZGVzID0gZnJhbWUuZmluZEFsbCgobm9kZSkgPT4ge1xuICAgIGNvbnN0IHsgdHlwZSwgbmFtZSB9ID0gbm9kZTtcbiAgICBjb25zb2xlLmxvZyh0eXBlKTtcbiAgICByZXR1cm4gdHlwZSA9PT0gJ1RFWFQnO1xuICB9KTtcblxuICBjb25zdCBmcmFtZVdpZHRoID0gZnJhbWU/LndpZHRoIHx8IDE7XG4gIGNvbnN0IGZyYW1lSGVpZ2h0ID0gZnJhbWU/LmhlaWdodCB8fCAxO1xuXG4gIGNvbnNvbGUubG9nKGZyYW1lV2lkdGgsIGZyYW1lSGVpZ2h0KTtcblxuICBjb25zdCB0ZXh0U3RyaW5ncyA9IHRleHROb2Rlcy5tYXAoKHROb2RlKSA9PiB7XG4gICAgaWYgKHROb2RlLnR5cGUgIT09ICdURVhUJykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHtcbiAgICAgIGNoYXJhY3RlcnMsXG4gICAgICB4LFxuICAgICAgeSxcbiAgICAgIGNvbnN0cmFpbnRzLFxuICAgICAgd2lkdGgsXG4gICAgICBoZWlnaHQsXG4gICAgICBmb250U2l6ZSxcbiAgICAgIGZvbnROYW1lLFxuICAgICAgZmlsbHMsXG4gICAgfSA9IHROb2RlO1xuXG4gICAgY29uc3QgZGVjb3JhdGlvbiA9IHROb2RlLmdldFJhbmdlVGV4dERlY29yYXRpb24oMCwgY2hhcmFjdGVycy5sZW5ndGgpO1xuICAgIGNvbnN0IHN0eWxlID0gdE5vZGUuZ2V0UmFuZ2VUZXh0U3R5bGVJZCgwLCBjaGFyYWN0ZXJzLmxlbmd0aCk7XG5cbiAgICBjb25zdCBwb3NpdGlvbiA9IHtcbiAgICAgIGxlZnQ6IGAkeygoeCArIHdpZHRoIC8gMikgLyBmcmFtZVdpZHRoKSAqIDEwMH0lYCxcbiAgICAgIHRvcDogYCR7KCh5ICsgaGVpZ2h0IC8gMikgLyBmcmFtZUhlaWdodCkgKiAxMDB9JWAsXG4gICAgfTtcblxuICAgIGNvbnN0IFtmaWxsXSA9IGZpbGxzO1xuICAgIGNvbnN0IHsgciA9IDAsIGcgPSAwLCBiID0gMCB9ID0gZmlsbD8uY29sb3IgfHwge307XG4gICAgY29uc3QgeyBvcGFjaXR5ID0gMSB9ID0gZmlsbDtcbiAgICBjb25zb2xlLmxvZyhyLCBnLCBiLCBmaWxsPy5jb2xvcik7XG4gICAgY29uc3QgY29sb3VyID0gYHJnYmEoJHtNYXRoLnJvdW5kKHIgKiAyNTUpfSwgJHtNYXRoLnJvdW5kKFxuICAgICAgZyAqIDI1NVxuICAgICl9LCAke01hdGgucm91bmQoYiAqIDI1NSl9LCAke29wYWNpdHl9KWA7XG5cbiAgICBjb25zdCBmb250RmFtaWx5ID0gZm9udE5hbWU/LmZhbWlseSB8fCAnc2Fucy1zZXJpZic7XG5cbiAgICBjb25zdCBjc3MgPSBPYmplY3QuZW50cmllcyhwb3NpdGlvbilcbiAgICAgIC5tYXAoKFtwcm9wLCB2YWxdKSA9PiB7XG4gICAgICAgIHJldHVybiBgJHtwcm9wfTogJHt2YWx9YDtcbiAgICAgIH0pXG4gICAgICAuam9pbignOyAnKTtcblxuICAgIGNvbnN0IHN0eWxlVGV4dCA9IGBcbiAgICAgICAgICBmb250LXNpemU6ICR7U3RyaW5nKGZvbnRTaXplKX07XG4gICAgICAgICAgZm9udC1mYW1pbHk6ICR7Zm9udEZhbWlseX07XG4gICAgICAgICAgcG9zaXRpb246IGFic29sdXRlO1xuICAgICAgICAgIGNvbG9yOiAke2NvbG91cn07XG4gICAgICAgICAgd2lkdGg6ICR7d2lkdGh9O1xuICAgICAgICAgICR7Y3NzfVxuICAgICAgICBgO1xuXG4gICAgcmV0dXJuIGA8cCBjbGFzcz1cImYyaF9fdGV4dFwiIHN0eWxlPVwiJHtzdHlsZVRleHR9XCI+JHtjaGFyYWN0ZXJzfTwvcD5gO1xuICB9KTtcblxuICBjb25zdCB0ZXh0Q29udGFpbmVyID0gYFxuICAgIDxkaXYgY2xhc3M9XCJmMmhfX3RleHRfY29udGFpbmVyXCI+XG4gICAgICAke3RleHRTdHJpbmdzLmpvaW4oJ1xcbicpfVxuICAgIDwvZGl2PlxuICBgO1xuXG4gIGNvbnN0IHN2ZyA9IGF3YWl0IGdldEZyYW1lU3ZnQXNTdHJpbmcoZnJhbWUpO1xuXG4gIHJldHVybiBgXG4gICAgPGRpdiBjbGFzcz1cImYyaF9fcmVuZGVyXCIgc3R5bGU9XCJ3aWR0aDogJHtmcmFtZVdpZHRofXB4O1wiPlxuICAgICAgJHtzdmd9XG4gICAgICAke3RleHRDb250YWluZXJ9XG4gICAgICA8c3R5bGU+XG4gICAgICAgICR7ZW1iZWRDc3N9XG4gICAgICA8L3N0eWxlPlxuICAgIDwvZGl2PlxuICBgO1xufVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsQUFNTyxVQUFLO0FBQUwsZ0JBQUs7QUFDVjtBQUNBO0FBQ0E7U0FIVTtBQU1MLFVBQUs7QUFBTCxn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
