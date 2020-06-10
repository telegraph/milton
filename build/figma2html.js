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
    const compressionPool = [];
    function handleCompressedMsg(msg) {
      const {uid, image} = msg;
      const poolItemIndex = compressionPool.findIndex((item) => item.uid === uid);
      if (poolItemIndex > -1) {
        compressionPool[poolItemIndex].callback(image);
        compressionPool.splice(poolItemIndex, 1);
      }
    }
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
    function compressImage(node) {
      return new Promise(async (resolve, _reject) => {
        const newFills = [];
        await Promise.all([...node.fills].map(async (paint) => {
          if (paint.type === "IMAGE" && paint.imageHash) {
            const image = figma.getImageByHash(paint.imageHash);
            const imageBytes = await image.getBytesAsync();
            const uid = Math.random().toString(32);
            figma.ui.postMessage({
              type: MSG_EVENTS.COMPRESS_IMAGE,
              image: imageBytes,
              width: node.width,
              height: node.height,
              uid
            });
            await new Promise((res) => {
              compressionPool.push({
                uid,
                callback: (image2) => {
                  const newPaint = JSON.parse(JSON.stringify(paint));
                  newPaint.imageHash = figma.createImage(image2).hash;
                  newFills.push(newPaint);
                  res();
                }
              });
            });
          }
        }));
        node.fills = newFills;
        resolve();
      });
    }
    async function handleRender(frameId) {
      let clone;
      try {
        const frame = figma.getNodeById(frameId);
        if (!frame || frame.type !== "FRAME") {
          throw new Error("Missing frame");
        }
        clone = frame.clone();
        clone.name = `[temp] ${frame.name}`;
        const cloneTextNodes = clone.findChildren((node) => node.type === "TEXT");
        cloneTextNodes.forEach((node) => node.remove());
        const nodesWithPaintImages = clone.findChildren((node) => {
          var _a;
          return (_a = node == null ? void 0 : node.fills) == null ? void 0 : _a.some((fill) => fill == null ? void 0 : fill.imageHash);
        });
        await Promise.all(nodesWithPaintImages.map(compressImage));
        if (nodesWithPaintImages.length > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1e3));
        }
        console.log("RENDERING SVG");
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
      } finally {
        clone == null ? void 0 : clone.remove();
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
      Object.values(HEADLINE_NODES).forEach(async (name, _i) => {
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
          if (name === HEADLINE_NODES.HEADLINE) {
            y -= 60;
          } else if (name === HEADLINE_NODES.SUBHEAD) {
            y -= 30;
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
      switch (msg.type) {
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
          const {frameId} = msg;
          console.log("plugin msg: render", frameId);
          handleRender(frameId);
          break;
        case MSG_EVENTS.RESIZE:
          const {width: width2, height: height2} = msg;
          console.log("plugin msg: resize");
          figma.ui.resize(width2, height2);
          break;
        case MSG_EVENTS.UPDATE_HEADLINES:
          const {headline, subhead, source} = msg;
          setHeadlinesAndSource({
            pageNode: figma.currentPage,
            headline,
            subhead,
            source
          });
          break;
        case MSG_EVENTS.COMPRESSED_IMAGE:
          handleCompressedMsg(msg);
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
    MSG_EVENTS2[MSG_EVENTS2["COMPRESS_IMAGE"] = 8] = "COMPRESS_IMAGE";
    MSG_EVENTS2[MSG_EVENTS2["COMPRESSED_IMAGE"] = 9] = "COMPRESSED_IMAGE";
  })(MSG_EVENTS || (MSG_EVENTS = {}));
  var OUTPUT_FORMATS;
  (function(OUTPUT_FORMATS2) {
    OUTPUT_FORMATS2[OUTPUT_FORMATS2["INLINE"] = 0] = "INLINE";
    OUTPUT_FORMATS2[OUTPUT_FORMATS2["IFRAME"] = 1] = "IFRAME";
  })(OUTPUT_FORMATS || (OUTPUT_FORMATS = {}));
  require_index();
})();
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL2luZGV4LnRzeCIsICJzcmMvY29uc3RhbnRzLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgeyBNU0dfRVZFTlRTIH0gZnJvbSBcIi4vY29uc3RhbnRzXCI7XG5pbXBvcnQge1xuICBNc2dGcmFtZXNUeXBlLFxuICBNc2dOb0ZyYW1lc1R5cGUsXG4gIE1zZ1JlbmRlclR5cGUsXG4gIE1zZ0Vycm9yVHlwZSxcbiAgTXNnQ29tcHJlc3NlZEltYWdlVHlwZSxcbn0gZnJvbSBcIi4vdWlcIjtcblxuLy8gTGlzdGVuIGZvciBtZXNzYWdlcyBmcm9tIHRoZSBVSVxuLy8gTk9URTogTGlzdGVuIGZvciBET01fUkVBRFkgbWVzc2FnZSB0byBraWNrLW9mZiBtYWluIGZ1bmN0aW9uXG5maWdtYS51aS5vbihcIm1lc3NhZ2VcIiwgKGUpID0+IGhhbmRsZVJlY2VpdmVkTXNnKGUpKTtcblxuLy8gUmVuZGVyIHRoZSBET01cbi8vIE5PVEU6IG9uIHN1Y2Nlc3NmdWwgVUkgcmVuZGVyIGEgcG9zdCBtZXNzYWdlIGlzIHNlbmQgYmFjayBvZiBET01fUkVBRFlcbmZpZ21hLnNob3dVSShfX2h0bWxfXyk7XG5cbi8vIFJlc2l6ZSBVSSB0byBtYXggdmlld3BvcnQgZGltZW5zaW9uc1xuY29uc3QgeyB3aWR0aCwgaGVpZ2h0IH0gPSBmaWdtYS52aWV3cG9ydC5ib3VuZHM7XG5jb25zdCB7IHpvb20gfSA9IGZpZ21hLnZpZXdwb3J0O1xuY29uc3QgaW5pdGlhbFdpbmRvd1dpZHRoID0gTWF0aC5yb3VuZCh3aWR0aCAqIHpvb20pO1xuY29uc3QgaW5pdGlhbFdpbmRvd0hlaWdodCA9IE1hdGgucm91bmQoaGVpZ2h0ICogem9vbSk7XG5maWdtYS51aS5yZXNpemUoaW5pdGlhbFdpbmRvd1dpZHRoLCBpbml0aWFsV2luZG93SGVpZ2h0KTtcblxuY29uc3QgY29tcHJlc3Npb25Qb29sOiB7XG4gIHVpZDogc3RyaW5nO1xuICBjYWxsYmFjazogKGltZzogVWludDhBcnJheSkgPT4gdm9pZDtcbn1bXSA9IFtdO1xuXG5mdW5jdGlvbiBoYW5kbGVDb21wcmVzc2VkTXNnKG1zZzogTXNnQ29tcHJlc3NlZEltYWdlVHlwZSkge1xuICBjb25zdCB7IHVpZCwgaW1hZ2UgfSA9IG1zZztcblxuICBjb25zdCBwb29sSXRlbUluZGV4ID0gY29tcHJlc3Npb25Qb29sLmZpbmRJbmRleCgoaXRlbSkgPT4gaXRlbS51aWQgPT09IHVpZCk7XG4gIGlmIChwb29sSXRlbUluZGV4ID4gLTEpIHtcbiAgICBjb21wcmVzc2lvblBvb2xbcG9vbEl0ZW1JbmRleF0uY2FsbGJhY2soaW1hZ2UpO1xuICAgIGNvbXByZXNzaW9uUG9vbC5zcGxpY2UocG9vbEl0ZW1JbmRleCwgMSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0Um9vdEZyYW1lcygpIHtcbiAgY29uc3QgeyBjdXJyZW50UGFnZSB9ID0gZmlnbWE7XG4gIGNvbnN0IHJvb3RGcmFtZXMgPSBjdXJyZW50UGFnZS5jaGlsZHJlbi5maWx0ZXIoXG4gICAgKG5vZGUpID0+IG5vZGUudHlwZSA9PT0gXCJGUkFNRVwiXG4gICkgYXMgRnJhbWVOb2RlW107XG5cbiAgLy8gUmV0dXJuIGVycm9yIGlmIHRoZXJlJ3Mgbm8gZnJhbWVzIG9uIHRoZSBjdXJyZW50IHBhZ2VcbiAgaWYgKHJvb3RGcmFtZXMubGVuZ3RoIDwgMSkge1xuICAgIGNvbnNvbGUud2FybihcIk5vIGZyYW1lc1wiKTtcbiAgICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7IHR5cGU6IE1TR19FVkVOVFMuTk9fRlJBTUVTIH0gYXMgTXNnTm9GcmFtZXNUeXBlKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBoZWFkbGluZXNBbmRTb3VyY2UgPSBnZXRIZWFkbGluZXNBbmRTb3VyY2UoY3VycmVudFBhZ2UpO1xuXG4gIGNvbnN0IGZyYW1lc0RhdGEgPSByb290RnJhbWVzLm1hcCgoZnJhbWUpID0+IHtcbiAgICBjb25zdCB7IG5hbWUsIHdpZHRoLCBoZWlnaHQsIGlkIH0gPSBmcmFtZTtcbiAgICBjb25zdCB0ZXh0Tm9kZXMgPSBnZXRUZXh0Tm9kZXMoZnJhbWUpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWUsXG4gICAgICB3aWR0aCxcbiAgICAgIGhlaWdodCxcbiAgICAgIGlkLFxuICAgICAgdGV4dE5vZGVzLFxuICAgICAgcmVzcG9uc2l2ZTogZmFsc2UsXG4gICAgICBzZWxlY3RlZDogdHJ1ZSxcbiAgICB9O1xuICB9KTtcblxuICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7XG4gICAgdHlwZTogTVNHX0VWRU5UUy5GT1VORF9GUkFNRVMsXG4gICAgZnJhbWVzOiBmcmFtZXNEYXRhLFxuICAgIHdpbmRvd1dpZHRoOiBpbml0aWFsV2luZG93V2lkdGgsXG4gICAgd2luZG93SGVpZ2h0OiBpbml0aWFsV2luZG93SGVpZ2h0LFxuICAgIC4uLmhlYWRsaW5lc0FuZFNvdXJjZSxcbiAgfSBhcyBNc2dGcmFtZXNUeXBlKTtcbn1cblxuZnVuY3Rpb24gY29tcHJlc3NJbWFnZShub2RlOiBEZWZhdWx0U2hhcGVNaXhpbik6IFByb21pc2U8dm9pZD4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoYXN5bmMgKHJlc29sdmUsIF9yZWplY3QpID0+IHtcbiAgICBjb25zdCBuZXdGaWxsczogYW55W10gPSBbXTtcblxuICAgIGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgWy4uLm5vZGUuZmlsbHNdLm1hcChhc3luYyAocGFpbnQpID0+IHtcbiAgICAgICAgaWYgKHBhaW50LnR5cGUgPT09IFwiSU1BR0VcIiAmJiBwYWludC5pbWFnZUhhc2gpIHtcbiAgICAgICAgICBjb25zdCBpbWFnZSA9IGZpZ21hLmdldEltYWdlQnlIYXNoKHBhaW50LmltYWdlSGFzaCk7XG4gICAgICAgICAgY29uc3QgaW1hZ2VCeXRlcyA9IGF3YWl0IGltYWdlLmdldEJ5dGVzQXN5bmMoKTtcbiAgICAgICAgICBjb25zdCB1aWQgPSBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDMyKTtcblxuICAgICAgICAgIC8vIFNlbmQgcG9zdCBtZXNzYWdlXG4gICAgICAgICAgZmlnbWEudWkucG9zdE1lc3NhZ2Uoe1xuICAgICAgICAgICAgdHlwZTogTVNHX0VWRU5UUy5DT01QUkVTU19JTUFHRSxcbiAgICAgICAgICAgIGltYWdlOiBpbWFnZUJ5dGVzLFxuICAgICAgICAgICAgd2lkdGg6IG5vZGUud2lkdGgsXG4gICAgICAgICAgICBoZWlnaHQ6IG5vZGUuaGVpZ2h0LFxuICAgICAgICAgICAgdWlkLFxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UoKHJlcykgPT4ge1xuICAgICAgICAgICAgY29tcHJlc3Npb25Qb29sLnB1c2goe1xuICAgICAgICAgICAgICB1aWQsXG5cbiAgICAgICAgICAgICAgY2FsbGJhY2s6IChpbWFnZTogVWludDhBcnJheSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1BhaW50ID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShwYWludCkpO1xuICAgICAgICAgICAgICAgIG5ld1BhaW50LmltYWdlSGFzaCA9IGZpZ21hLmNyZWF0ZUltYWdlKGltYWdlKS5oYXNoO1xuICAgICAgICAgICAgICAgIG5ld0ZpbGxzLnB1c2gobmV3UGFpbnQpO1xuICAgICAgICAgICAgICAgIHJlcygpO1xuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgKTtcblxuICAgIG5vZGUuZmlsbHMgPSBuZXdGaWxscztcbiAgICByZXNvbHZlKCk7XG4gIH0pO1xufVxuXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVSZW5kZXIoZnJhbWVJZDogc3RyaW5nKSB7XG4gIGxldCBjbG9uZTtcblxuICB0cnkge1xuICAgIGNvbnN0IGZyYW1lID0gZmlnbWEuZ2V0Tm9kZUJ5SWQoZnJhbWVJZCk7XG4gICAgaWYgKCFmcmFtZSB8fCBmcmFtZS50eXBlICE9PSBcIkZSQU1FXCIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgZnJhbWVcIik7XG4gICAgfVxuXG4gICAgY2xvbmUgPSBmcmFtZS5jbG9uZSgpO1xuICAgIGNsb25lLm5hbWUgPSBgW3RlbXBdICR7ZnJhbWUubmFtZX1gO1xuXG4gICAgY29uc3QgY2xvbmVUZXh0Tm9kZXMgPSBjbG9uZS5maW5kQ2hpbGRyZW4oKG5vZGUpID0+IG5vZGUudHlwZSA9PT0gXCJURVhUXCIpO1xuICAgIGNsb25lVGV4dE5vZGVzLmZvckVhY2goKG5vZGUpID0+IG5vZGUucmVtb3ZlKCkpO1xuXG4gICAgY29uc3Qgbm9kZXNXaXRoUGFpbnRJbWFnZXMgPSBjbG9uZS5maW5kQ2hpbGRyZW4oXG4gICAgICAvLyBAdHMtZXhwZWN0LWVycm9yXG4gICAgICAobm9kZSkgPT4gbm9kZT8uZmlsbHM/LnNvbWUoKGZpbGwpID0+IGZpbGw/LmltYWdlSGFzaClcbiAgICApIGFzIERlZmF1bHRTaGFwZU1peGluW107XG5cbiAgICBhd2FpdCBQcm9taXNlLmFsbChub2Rlc1dpdGhQYWludEltYWdlcy5tYXAoY29tcHJlc3NJbWFnZSkpO1xuXG4gICAgLy8gV2FpdCBmb3IgRmlnbWEgdG8gcHJvY2VzcyBpbWFnZSBoYXNoIG90aGVyd2lzZSB0aGUgcGFpbnQgZmlsbCB3aXRoIGhhdmVcbiAgICAvLyBhbiBpbmNvcnJlY3QgdHJhbnNmb3JtIHNjYWxlXG4gICAgLy8gVE9ETzogRmluZCBiZXR0ZXIgd2F5XG4gICAgaWYgKG5vZGVzV2l0aFBhaW50SW1hZ2VzLmxlbmd0aCA+IDApIHtcbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDEwMDApKTtcbiAgICB9XG5cbiAgICBjb25zb2xlLmxvZyhcIlJFTkRFUklORyBTVkdcIik7XG4gICAgY29uc3Qgc3ZnID0gYXdhaXQgY2xvbmUuZXhwb3J0QXN5bmMoe1xuICAgICAgZm9ybWF0OiBcIlNWR1wiLFxuICAgICAgc3ZnT3V0bGluZVRleHQ6IGZhbHNlLFxuICAgICAgc3ZnU2ltcGxpZnlTdHJva2U6IHRydWUsXG4gICAgfSk7XG5cbiAgICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7XG4gICAgICB0eXBlOiBNU0dfRVZFTlRTLlJFTkRFUixcbiAgICAgIGZyYW1lSWQsXG4gICAgICBzdmcsXG4gICAgfSBhcyBNc2dSZW5kZXJUeXBlKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgZmlnbWEudWkucG9zdE1lc3NhZ2Uoe1xuICAgICAgdHlwZTogTVNHX0VWRU5UUy5FUlJPUixcbiAgICAgIGVycm9yVGV4dDogYFJlbmRlciBmYWlsZWQ6ICR7ZXJyID8/IGVyci5tZXNzYWdlfWAsXG4gICAgfSBhcyBNc2dFcnJvclR5cGUpO1xuICB9IGZpbmFsbHkge1xuICAgIC8vIFJlbW92aW5nIGNsb25lXG4gICAgY2xvbmU/LnJlbW92ZSgpO1xuICB9XG59XG5cbmV4cG9ydCB0eXBlIHRleHROb2RlU2VsZWN0ZWRQcm9wcyA9IFBpY2s8XG4gIFRleHROb2RlLFxuICB8IFwieFwiXG4gIHwgXCJ5XCJcbiAgfCBcIndpZHRoXCJcbiAgfCBcImhlaWdodFwiXG4gIHwgXCJjaGFyYWN0ZXJzXCJcbiAgfCBcImxpbmVIZWlnaHRcIlxuICB8IFwibGV0dGVyU3BhY2luZ1wiXG4gIHwgXCJ0ZXh0QWxpZ25Ib3Jpem9udGFsXCJcbiAgfCBcInRleHRBbGlnblZlcnRpY2FsXCJcbj47XG5cbmV4cG9ydCBpbnRlcmZhY2UgdGV4dERhdGEgZXh0ZW5kcyB0ZXh0Tm9kZVNlbGVjdGVkUHJvcHMge1xuICBjb2xvdXI6IHsgcjogbnVtYmVyOyBnOiBudW1iZXI7IGI6IG51bWJlcjsgYTogbnVtYmVyIH07XG4gIGZvbnRTaXplOiBudW1iZXI7XG4gIGZvbnRGYW1pbHk6IHN0cmluZztcbiAgZm9udFN0eWxlOiBzdHJpbmc7XG59XG5cbi8vIEV4dHJhY3Qgb2JqZWN0IHByb3BlcnRpZXMgZnJvbSB0ZXh0Tm9kZSBmb3IgcGFzc2luZyB2aWEgcG9zdE1lc3NhZ2VcbmZ1bmN0aW9uIGdldFRleHROb2RlcyhmcmFtZTogRnJhbWVOb2RlKTogdGV4dERhdGFbXSB7XG4gIGNvbnN0IHRleHROb2RlcyA9IGZyYW1lLmZpbmRBbGwoKHsgdHlwZSB9KSA9PiB0eXBlID09PSBcIlRFWFRcIikgYXMgVGV4dE5vZGVbXTtcbiAgY29uc3QgeyBhYnNvbHV0ZVRyYW5zZm9ybSB9ID0gZnJhbWU7XG4gIGNvbnN0IHJvb3RYID0gYWJzb2x1dGVUcmFuc2Zvcm1bMF1bMl07XG4gIGNvbnN0IHJvb3RZID0gYWJzb2x1dGVUcmFuc2Zvcm1bMV1bMl07XG5cbiAgcmV0dXJuIHRleHROb2Rlcy5tYXAoXG4gICAgKG5vZGUpOiB0ZXh0RGF0YSA9PiB7XG4gICAgICBjb25zdCB7XG4gICAgICAgIGFic29sdXRlVHJhbnNmb3JtLFxuICAgICAgICB3aWR0aCxcbiAgICAgICAgaGVpZ2h0LFxuICAgICAgICBmb250U2l6ZTogZm9udFNpemVEYXRhLFxuICAgICAgICBmb250TmFtZSxcbiAgICAgICAgZmlsbHMsXG4gICAgICAgIGNoYXJhY3RlcnMsXG4gICAgICAgIGxpbmVIZWlnaHQsXG4gICAgICAgIGxldHRlclNwYWNpbmcsXG4gICAgICAgIHRleHRBbGlnbkhvcml6b250YWwsXG4gICAgICAgIHRleHRBbGlnblZlcnRpY2FsLFxuICAgICAgfSA9IG5vZGU7XG5cbiAgICAgIC8vIE5PVEU6IEZpZ21hIG5vZGUgeCwgeSBhcmUgcmVsYXRpdmUgdG8gZmlyc3QgcGFyZW50LCB3ZSB3YW50IHRoZW1cbiAgICAgIC8vIHJlbGF0aXZlIHRvIHRoZSByb290IGZyYW1lXG4gICAgICBjb25zdCB0ZXh0WCA9IGFic29sdXRlVHJhbnNmb3JtWzBdWzJdO1xuICAgICAgY29uc3QgdGV4dFkgPSBhYnNvbHV0ZVRyYW5zZm9ybVsxXVsyXTtcbiAgICAgIGNvbnN0IHggPSB0ZXh0WCAtIHJvb3RYO1xuICAgICAgY29uc3QgeSA9IHRleHRZIC0gcm9vdFk7XG5cbiAgICAgIC8vIEV4dHJhY3QgYmFzaWMgZmlsbCBjb2xvdXJcbiAgICAgIGNvbnN0IFtmaWxsXSA9IGZpbGxzO1xuICAgICAgbGV0IGNvbG91ciA9IHsgcjogMCwgZzogMCwgYjogMCwgYTogMSB9O1xuICAgICAgaWYgKGZpbGwudHlwZSA9PT0gXCJTT0xJRFwiKSB7XG4gICAgICAgIGNvbG91ciA9IHsgLi4uY29sb3VyLCBhOiBmaWxsLm9wYWNpdHkgfHwgMSB9O1xuICAgICAgfVxuXG4gICAgICAvLyBFeHRyYWN0IGZvbnQgZmFtaWx5XG4gICAgICBsZXQgZm9udFNpemUgPSAxNjtcbiAgICAgIGlmIChmb250U2l6ZURhdGEgIT09IGZpZ21hLm1peGVkKSB7XG4gICAgICAgIGZvbnRTaXplID0gZm9udFNpemVEYXRhO1xuICAgICAgfVxuXG4gICAgICAvLyBFeHRyYWN0IGZvbnQgZmFtaWx5XG4gICAgICAvLyBUT0RPOiBDb25maXJtIGZhbGxiYWNrIGZvbnRzXG4gICAgICBsZXQgZm9udEZhbWlseSA9IFwiQXJpYWxcIjtcbiAgICAgIGxldCBmb250U3R5bGUgPSBcIlJlZ3VsYXJcIjtcbiAgICAgIGlmIChmb250TmFtZSAhPT0gZmlnbWEubWl4ZWQpIHtcbiAgICAgICAgZm9udEZhbWlseSA9IGZvbnROYW1lLmZhbWlseTtcbiAgICAgICAgZm9udFN0eWxlID0gZm9udE5hbWUuc3R5bGU7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHgsXG4gICAgICAgIHksXG4gICAgICAgIHdpZHRoLFxuICAgICAgICBoZWlnaHQsXG4gICAgICAgIGZvbnRTaXplLFxuICAgICAgICBmb250RmFtaWx5LFxuICAgICAgICBmb250U3R5bGUsXG4gICAgICAgIGNvbG91cixcbiAgICAgICAgY2hhcmFjdGVycyxcbiAgICAgICAgbGluZUhlaWdodCxcbiAgICAgICAgbGV0dGVyU3BhY2luZyxcbiAgICAgICAgdGV4dEFsaWduSG9yaXpvbnRhbCxcbiAgICAgICAgdGV4dEFsaWduVmVydGljYWwsXG4gICAgICB9O1xuICAgIH1cbiAgKTtcbn1cblxuZnVuY3Rpb24gZ2V0SGVhZGxpbmVzQW5kU291cmNlKHBhZ2VOb2RlOiBQYWdlTm9kZSkge1xuICBjb25zdCBOT0RFX05BTUVTID0gW1wiaGVhZGxpbmVcIiwgXCJzdWJoZWFkXCIsIFwic291cmNlXCJdO1xuXG4gIGNvbnN0IHJlc3VsdDogeyBbaWQ6IHN0cmluZ106IHN0cmluZyB8IHVuZGVmaW5lZCB9ID0ge307XG4gIGZvciAoY29uc3QgbmFtZSBvZiBOT0RFX05BTUVTKSB7XG4gICAgY29uc3Qgbm9kZSA9IHBhZ2VOb2RlLmZpbmRDaGlsZChcbiAgICAgIChub2RlKSA9PiBub2RlLm5hbWUgPT09IG5hbWUgJiYgbm9kZS50eXBlID09PSBcIlRFWFRcIlxuICAgICkgYXMgVGV4dE5vZGUgfCBudWxsO1xuXG4gICAgcmVzdWx0W25hbWVdID0gbm9kZT8uY2hhcmFjdGVycztcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmVudW0gSEVBRExJTkVfTk9ERVMge1xuICBIRUFETElORSA9IFwiaGVhZGxpbmVcIixcbiAgU1VCSEVBRCA9IFwic3ViaGVhZFwiLFxuICBTT1VSQ0UgPSBcInNvdXJjZVwiLFxufVxuaW50ZXJmYWNlIHNldEhlYWRsaW5lc0FuZFNvdXJjZVByb3BzIHtcbiAgcGFnZU5vZGU6IFBhZ2VOb2RlO1xuICBoZWFkbGluZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBzdWJoZWFkOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIHNvdXJjZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xufVxuYXN5bmMgZnVuY3Rpb24gc2V0SGVhZGxpbmVzQW5kU291cmNlKHByb3BzOiBzZXRIZWFkbGluZXNBbmRTb3VyY2VQcm9wcykge1xuICBjb25zdCB7IHBhZ2VOb2RlIH0gPSBwcm9wcztcbiAgY29uc3QgZnJhbWVzID0gcGFnZU5vZGUuZmluZENoaWxkcmVuKChub2RlKSA9PiBub2RlLnR5cGUgPT09IFwiRlJBTUVcIik7XG4gIGNvbnN0IG1vc3RMZWZ0UG9zID0gTWF0aC5taW4oLi4uZnJhbWVzLm1hcCgobm9kZSkgPT4gbm9kZS54KSk7XG4gIGNvbnN0IG1vc3RUb3BQb3MgPSBNYXRoLm1pbiguLi5mcmFtZXMubWFwKChub2RlKSA9PiBub2RlLnkpKTtcblxuICBPYmplY3QudmFsdWVzKEhFQURMSU5FX05PREVTKS5mb3JFYWNoKGFzeW5jIChuYW1lLCBfaSkgPT4ge1xuICAgIGxldCBub2RlID0gcGFnZU5vZGUuZmluZENoaWxkKFxuICAgICAgKG5vZGUpID0+IG5vZGUubmFtZSA9PT0gbmFtZSAmJiBub2RlLnR5cGUgPT09IFwiVEVYVFwiXG4gICAgKSBhcyBUZXh0Tm9kZSB8IG51bGw7XG4gICAgY29uc3QgdGV4dENvbnRlbnQgPSBwcm9wc1tuYW1lXTtcblxuICAgIC8vIFJlbW92ZSBub2RlIGlmIHRoZXJlJ3Mgbm8gdGV4dCBjb250ZW50XG4gICAgaWYgKCF0ZXh0Q29udGVudCkge1xuICAgICAgaWYgKG5vZGUpIG5vZGUucmVtb3ZlKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gQ3JlYXRlIG5vZGUgaWYgaXQgZG9lc24ndCBleGlzdFxuICAgIGlmICghbm9kZSkge1xuICAgICAgbm9kZSA9IGZpZ21hLmNyZWF0ZVRleHQoKTtcbiAgICAgIG5vZGUubmFtZSA9IG5hbWU7XG5cbiAgICAgIGxldCB5ID0gbW9zdFRvcFBvcyAtIDYwO1xuICAgICAgaWYgKG5hbWUgPT09IEhFQURMSU5FX05PREVTLkhFQURMSU5FKSB7XG4gICAgICAgIHkgLT0gNjA7XG4gICAgICB9IGVsc2UgaWYgKG5hbWUgPT09IEhFQURMSU5FX05PREVTLlNVQkhFQUQpIHtcbiAgICAgICAgeSAtPSAzMDtcbiAgICAgIH1cblxuICAgICAgbm9kZS5yZWxhdGl2ZVRyYW5zZm9ybSA9IFtcbiAgICAgICAgWzEsIDAsIG1vc3RMZWZ0UG9zXSxcbiAgICAgICAgWzAsIDEsIHldLFxuICAgICAgXTtcbiAgICB9XG5cbiAgICAvLyBFbnN1cmUgdGV4dCBub2RlIGlzIGxvY2tlZFxuICAgIG5vZGUubG9ja2VkID0gdHJ1ZTtcblxuICAgIC8vIExvYWQgZm9udFxuICAgIGNvbnN0IGZvbnROYW1lID1cbiAgICAgIG5vZGUuZm9udE5hbWUgIT09IGZpZ21hLm1peGVkID8gbm9kZS5mb250TmFtZS5mYW1pbHkgOiBcIlJvYm90b1wiO1xuICAgIGNvbnN0IGZvbnRTdHlsZSA9XG4gICAgICBub2RlLmZvbnROYW1lICE9PSBmaWdtYS5taXhlZCA/IG5vZGUuZm9udE5hbWUuc3R5bGUgOiBcIlJlZ3VsYXJcIjtcbiAgICBhd2FpdCBmaWdtYS5sb2FkRm9udEFzeW5jKHsgZmFtaWx5OiBmb250TmFtZSwgc3R5bGU6IGZvbnRTdHlsZSB9KTtcblxuICAgIC8vIFNldCB0ZXh0IG5vZGUgY29udGVudFxuICAgIG5vZGUuY2hhcmFjdGVycyA9IHByb3BzW25hbWVdIHx8IFwiXCI7XG4gIH0pO1xufVxuXG5pbnRlcmZhY2UgTXNnQ2xvc2VJbnRlcmZhY2Uge1xuICB0eXBlOiBNU0dfRVZFTlRTLkNMT1NFO1xufVxuaW50ZXJmYWNlIE1zZ0RvbVJlYWR5SW50ZXJmYWNlIHtcbiAgdHlwZTogTVNHX0VWRU5UUy5ET01fUkVBRFk7XG59XG5cbmludGVyZmFjZSBNc2dSZW5kZXJJbnRlcmZhY2Uge1xuICB0eXBlOiBNU0dfRVZFTlRTLlJFTkRFUjtcbiAgZnJhbWVJZDogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgTXNnRXJyb3JJbnRlcmZhY2Uge1xuICB0eXBlOiBNU0dfRVZFTlRTLkVSUk9SO1xufVxuXG5pbnRlcmZhY2UgTXNnUmVzaXplSW50ZXJmYWNlIHtcbiAgdHlwZTogTVNHX0VWRU5UUy5SRVNJWkU7XG4gIHdpZHRoOiBudW1iZXI7XG4gIGhlaWdodDogbnVtYmVyO1xufVxuXG5pbnRlcmZhY2UgTXNnSGVhZGxpbmVzSW50ZXJmYWNlIHtcbiAgdHlwZTogTVNHX0VWRU5UUy5VUERBVEVfSEVBRExJTkVTO1xuICBoZWFkbGluZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBzdWJoZWFkOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIHNvdXJjZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xufVxuXG5leHBvcnQgdHlwZSBQb3N0TXNnID1cbiAgfCBNc2dDb21wcmVzc2VkSW1hZ2VUeXBlXG4gIHwgTXNnRXJyb3JJbnRlcmZhY2VcbiAgfCBNc2dDbG9zZUludGVyZmFjZVxuICB8IE1zZ0RvbVJlYWR5SW50ZXJmYWNlXG4gIHwgTXNnUmVzaXplSW50ZXJmYWNlXG4gIHwgTXNnUmVuZGVySW50ZXJmYWNlXG4gIHwgTXNnSGVhZGxpbmVzSW50ZXJmYWNlO1xuXG4vLyBIYW5kbGUgbWVzc2FnZXMgZnJvbSB0aGUgVUlcbmZ1bmN0aW9uIGhhbmRsZVJlY2VpdmVkTXNnKG1zZzogUG9zdE1zZykge1xuICBzd2l0Y2ggKG1zZy50eXBlKSB7XG4gICAgY2FzZSBNU0dfRVZFTlRTLkVSUk9SOlxuICAgICAgY29uc29sZS5sb2coXCJwbHVnaW4gbXNnOiBlcnJvclwiKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSBNU0dfRVZFTlRTLkNMT1NFOlxuICAgICAgY29uc29sZS5sb2coXCJwbHVnaW4gbXNnOiBjbG9zZVwiKTtcbiAgICAgIGZpZ21hLmNsb3NlUGx1Z2luKCk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgTVNHX0VWRU5UUy5ET01fUkVBRFk6XG4gICAgICBjb25zb2xlLmxvZyhcInBsdWdpbiBtc2c6IERPTSBSRUFEWVwiKTtcbiAgICAgIGdldFJvb3RGcmFtZXMoKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSBNU0dfRVZFTlRTLlJFTkRFUjpcbiAgICAgIGNvbnN0IHsgZnJhbWVJZCB9ID0gbXNnO1xuICAgICAgY29uc29sZS5sb2coXCJwbHVnaW4gbXNnOiByZW5kZXJcIiwgZnJhbWVJZCk7XG4gICAgICBoYW5kbGVSZW5kZXIoZnJhbWVJZCk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgTVNHX0VWRU5UUy5SRVNJWkU6XG4gICAgICBjb25zdCB7IHdpZHRoLCBoZWlnaHQgfSA9IG1zZztcbiAgICAgIGNvbnNvbGUubG9nKFwicGx1Z2luIG1zZzogcmVzaXplXCIpO1xuICAgICAgZmlnbWEudWkucmVzaXplKHdpZHRoLCBoZWlnaHQpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIE1TR19FVkVOVFMuVVBEQVRFX0hFQURMSU5FUzpcbiAgICAgIGNvbnN0IHsgaGVhZGxpbmUsIHN1YmhlYWQsIHNvdXJjZSB9ID0gbXNnO1xuICAgICAgc2V0SGVhZGxpbmVzQW5kU291cmNlKHtcbiAgICAgICAgcGFnZU5vZGU6IGZpZ21hLmN1cnJlbnRQYWdlLFxuICAgICAgICBoZWFkbGluZSxcbiAgICAgICAgc3ViaGVhZCxcbiAgICAgICAgc291cmNlLFxuICAgICAgfSk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgTVNHX0VWRU5UUy5DT01QUkVTU0VEX0lNQUdFOlxuICAgICAgaGFuZGxlQ29tcHJlc3NlZE1zZyhtc2cpO1xuICAgICAgYnJlYWs7XG5cbiAgICBkZWZhdWx0OlxuICAgICAgY29uc29sZS5lcnJvcihcIlVua25vd24gcG9zdCBtZXNzYWdlXCIsIG1zZyk7XG4gIH1cbn1cbiIsICJleHBvcnQgZW51bSBTVEFHRVMge1xuICBDSE9PU0VfRlJBTUVTLFxuICBQUkVWSUVXX09VVFBVVCxcbiAgUkVTUE9OU0lWRV9QUkVWSUVXLFxuICBTQVZFX09VVFBVVCxcbn1cblxuZXhwb3J0IGVudW0gTVNHX0VWRU5UUyB7XG4gIERPTV9SRUFEWSxcbiAgTk9fRlJBTUVTLFxuICBGT1VORF9GUkFNRVMsXG4gIFJFU0laRSxcbiAgUkVOREVSLFxuICBDTE9TRSxcbiAgRVJST1IsXG4gIFVQREFURV9IRUFETElORVMsXG4gIENPTVBSRVNTX0lNQUdFLFxuICBDT01QUkVTU0VEX0lNQUdFLFxufVxuXG5leHBvcnQgZW51bSBPVVRQVVRfRk9STUFUUyB7XG4gIElOTElORSxcbiAgSUZSQU1FLFxufVxuXG5leHBvcnQgY29uc3QgVUlfVEVYVCA9IHtcbiAgRVJST1JfVU5FWFBFQ1RFRDogXCJVbmV4cGVjdGVkIGVycm9yXCIsXG4gIEVSUk9SX01JU1NJTkdfRlJBTUVTOiBcIk5vIGZyYW1lcyBmb3VuZC4gUGxlYXNlIGFkZCBzb21lIGZyYW1lcyB0byB0aGUgcGFnZS5cIixcbiAgV0FSTl9OT19UQVJHRVRTOiBcIlN0YW5kYXJkIGZyYW1lcyBub3QgZm91bmQuIFBsZWFzZSBzZWxlY3QgdGFyZ2V0IGZyYW1lcy5cIixcbiAgV0FSTl9UT09fTUFOWV9UQVJHRVRTOiBcIlBsZWFzZSBzZWxlY3QgdGhyZWUgdGFyZ2V0IGZyYW1lc1wiLFxuICBJTkZPX1BSRVZJRVc6IFwiUHJldmlldyBlYWNoIGZyYW1lIG91dHB1dFwiLFxuICBUSVRMRV9DSE9PU0VfRlJBTUU6IFwiQ2hvb3NlIHdoaWNoIGZyYW1lcyB0byBleHBvcnRcIixcbiAgVElUTEVfUFJFVklFVzogXCJQcmV2aWV3XCIsXG4gIFRJVExFX1JFU1BPTlNJVkVfUFJFVklFVzogXCJSZXNwb25zaXZlIHByZXZpZXdcIixcbiAgVElMRV9PVVRQVVQ6IFwiRXhwb3J0XCIsXG4gIEJVVFRPTl9ORVhUOiBcIk5leHRcIixcbiAgQlVUVE9OX0RPV05MT0FEOiBcIkRvd25sb2FkXCIsXG4gIEJVVFRPTl9QUkVWSU9VUzogXCJCYWNrXCIsXG59O1xuXG5leHBvcnQgY29uc3QgSU5JVElBTF9VSV9TSVpFID0ge1xuICB3aWR0aDogNDgwLFxuICBoZWlnaHQ6IDUwMCxcbiAgbWF4V2lkdGg6IDEyMDAsXG4gIG1heEhlaWdodDogOTAwLFxuICBtaW5XaWR0aDogNDIwLFxuICBtaW5IZWlnaHQ6IDQ4MCxcbn07XG5cbmV4cG9ydCBjb25zdCBGUkFNRV9XQVJOSU5HX1NJWkUgPSAzMDA7XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7OztBQUFBO0FBV0EsVUFBTSxHQUFHLEdBQUcsV0FBVyxDQUFDLE1BQU0sa0JBQWtCO0FBSWhELFVBQU0sT0FBTztBQUdiLFVBQU0sQ0FBRSxPQUFPLFVBQVcsTUFBTSxTQUFTO0FBQ3pDLFVBQU0sQ0FBRSxRQUFTLE1BQU07QUFDdkIsVUFBTSxxQkFBcUIsS0FBSyxNQUFNLFFBQVE7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
