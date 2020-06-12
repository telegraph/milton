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
        const fills = node.fills === figma.mixed ? [] : [...node.fills];
        await Promise.all(fills.map(async (paint) => {
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
        const [fill] = fills === figma.mixed ? [] : fills;
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL2luZGV4LnRzeCIsICJzcmMvY29uc3RhbnRzLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgeyBNU0dfRVZFTlRTIH0gZnJvbSBcIi4vY29uc3RhbnRzXCI7XG5cbmltcG9ydCB7XG4gIE1zZ0ZyYW1lc1R5cGUsXG4gIE1zZ05vRnJhbWVzVHlwZSxcbiAgTXNnUmVuZGVyVHlwZSxcbiAgTXNnRXJyb3JUeXBlLFxuICBNc2dDb21wcmVzc2VkSW1hZ2VUeXBlLFxufSBmcm9tIFwiLi91aVwiO1xuXG4vLyBMaXN0ZW4gZm9yIG1lc3NhZ2VzIGZyb20gdGhlIFVJXG4vLyBOT1RFOiBMaXN0ZW4gZm9yIERPTV9SRUFEWSBtZXNzYWdlIHRvIGtpY2stb2ZmIG1haW4gZnVuY3Rpb25cbmZpZ21hLnVpLm9uKFwibWVzc2FnZVwiLCAoZSkgPT4gaGFuZGxlUmVjZWl2ZWRNc2coZSkpO1xuXG4vLyBSZW5kZXIgdGhlIERPTVxuLy8gTk9URTogb24gc3VjY2Vzc2Z1bCBVSSByZW5kZXIgYSBwb3N0IG1lc3NhZ2UgaXMgc2VuZCBiYWNrIG9mIERPTV9SRUFEWVxuZmlnbWEuc2hvd1VJKF9faHRtbF9fKTtcblxuLy8gUmVzaXplIFVJIHRvIG1heCB2aWV3cG9ydCBkaW1lbnNpb25zXG5jb25zdCB7IHdpZHRoLCBoZWlnaHQgfSA9IGZpZ21hLnZpZXdwb3J0LmJvdW5kcztcbmNvbnN0IHsgem9vbSB9ID0gZmlnbWEudmlld3BvcnQ7XG5jb25zdCBpbml0aWFsV2luZG93V2lkdGggPSBNYXRoLnJvdW5kKHdpZHRoICogem9vbSk7XG5jb25zdCBpbml0aWFsV2luZG93SGVpZ2h0ID0gTWF0aC5yb3VuZChoZWlnaHQgKiB6b29tKTtcbmZpZ21hLnVpLnJlc2l6ZShpbml0aWFsV2luZG93V2lkdGgsIGluaXRpYWxXaW5kb3dIZWlnaHQpO1xuXG5jb25zdCBjb21wcmVzc2lvblBvb2w6IHtcbiAgdWlkOiBzdHJpbmc7XG4gIGNhbGxiYWNrOiAoaW1nOiBVaW50OEFycmF5KSA9PiB2b2lkO1xufVtdID0gW107XG5cbmZ1bmN0aW9uIGhhbmRsZUNvbXByZXNzZWRNc2cobXNnOiBNc2dDb21wcmVzc2VkSW1hZ2VUeXBlKSB7XG4gIGNvbnN0IHsgdWlkLCBpbWFnZSB9ID0gbXNnO1xuXG4gIGNvbnN0IHBvb2xJdGVtSW5kZXggPSBjb21wcmVzc2lvblBvb2wuZmluZEluZGV4KChpdGVtKSA9PiBpdGVtLnVpZCA9PT0gdWlkKTtcbiAgaWYgKHBvb2xJdGVtSW5kZXggPiAtMSkge1xuICAgIGNvbXByZXNzaW9uUG9vbFtwb29sSXRlbUluZGV4XS5jYWxsYmFjayhpbWFnZSk7XG4gICAgY29tcHJlc3Npb25Qb29sLnNwbGljZShwb29sSXRlbUluZGV4LCAxKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRSb290RnJhbWVzKCkge1xuICBjb25zdCB7IGN1cnJlbnRQYWdlIH0gPSBmaWdtYTtcbiAgY29uc3Qgcm9vdEZyYW1lcyA9IGN1cnJlbnRQYWdlLmNoaWxkcmVuLmZpbHRlcihcbiAgICAobm9kZSkgPT4gbm9kZS50eXBlID09PSBcIkZSQU1FXCJcbiAgKSBhcyBGcmFtZU5vZGVbXTtcblxuICAvLyBSZXR1cm4gZXJyb3IgaWYgdGhlcmUncyBubyBmcmFtZXMgb24gdGhlIGN1cnJlbnQgcGFnZVxuICBpZiAocm9vdEZyYW1lcy5sZW5ndGggPCAxKSB7XG4gICAgY29uc29sZS53YXJuKFwiTm8gZnJhbWVzXCIpO1xuICAgIGZpZ21hLnVpLnBvc3RNZXNzYWdlKHsgdHlwZTogTVNHX0VWRU5UUy5OT19GUkFNRVMgfSBhcyBNc2dOb0ZyYW1lc1R5cGUpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IGhlYWRsaW5lc0FuZFNvdXJjZSA9IGdldEhlYWRsaW5lc0FuZFNvdXJjZShjdXJyZW50UGFnZSk7XG5cbiAgY29uc3QgZnJhbWVzRGF0YSA9IHJvb3RGcmFtZXMubWFwKChmcmFtZSkgPT4ge1xuICAgIGNvbnN0IHsgbmFtZSwgd2lkdGgsIGhlaWdodCwgaWQgfSA9IGZyYW1lO1xuICAgIGNvbnN0IHRleHROb2RlcyA9IGdldFRleHROb2RlcyhmcmFtZSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgbmFtZSxcbiAgICAgIHdpZHRoLFxuICAgICAgaGVpZ2h0LFxuICAgICAgaWQsXG4gICAgICB0ZXh0Tm9kZXMsXG4gICAgICByZXNwb25zaXZlOiBmYWxzZSxcbiAgICAgIHNlbGVjdGVkOiB0cnVlLFxuICAgIH07XG4gIH0pO1xuXG4gIGZpZ21hLnVpLnBvc3RNZXNzYWdlKHtcbiAgICB0eXBlOiBNU0dfRVZFTlRTLkZPVU5EX0ZSQU1FUyxcbiAgICBmcmFtZXM6IGZyYW1lc0RhdGEsXG4gICAgd2luZG93V2lkdGg6IGluaXRpYWxXaW5kb3dXaWR0aCxcbiAgICB3aW5kb3dIZWlnaHQ6IGluaXRpYWxXaW5kb3dIZWlnaHQsXG4gICAgLi4uaGVhZGxpbmVzQW5kU291cmNlLFxuICB9IGFzIE1zZ0ZyYW1lc1R5cGUpO1xufVxuXG5mdW5jdGlvbiBjb21wcmVzc0ltYWdlKG5vZGU6IERlZmF1bHRTaGFwZU1peGluKTogUHJvbWlzZTx2b2lkPiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShhc3luYyAocmVzb2x2ZSwgX3JlamVjdCkgPT4ge1xuICAgIGNvbnN0IG5ld0ZpbGxzOiBhbnlbXSA9IFtdO1xuICAgIGNvbnN0IGZpbGxzID0gbm9kZS5maWxscyA9PT0gZmlnbWEubWl4ZWQgPyBbXSA6IFsuLi5ub2RlLmZpbGxzXTtcblxuICAgIGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgZmlsbHMubWFwKGFzeW5jIChwYWludCkgPT4ge1xuICAgICAgICBpZiAocGFpbnQudHlwZSA9PT0gXCJJTUFHRVwiICYmIHBhaW50LmltYWdlSGFzaCkge1xuICAgICAgICAgIGNvbnN0IGltYWdlID0gZmlnbWEuZ2V0SW1hZ2VCeUhhc2gocGFpbnQuaW1hZ2VIYXNoKTtcbiAgICAgICAgICBjb25zdCBpbWFnZUJ5dGVzID0gYXdhaXQgaW1hZ2UuZ2V0Qnl0ZXNBc3luYygpO1xuICAgICAgICAgIGNvbnN0IHVpZCA9IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzIpO1xuXG4gICAgICAgICAgLy8gU2VuZCBwb3N0IG1lc3NhZ2VcbiAgICAgICAgICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7XG4gICAgICAgICAgICB0eXBlOiBNU0dfRVZFTlRTLkNPTVBSRVNTX0lNQUdFLFxuICAgICAgICAgICAgaW1hZ2U6IGltYWdlQnl0ZXMsXG4gICAgICAgICAgICB3aWR0aDogbm9kZS53aWR0aCxcbiAgICAgICAgICAgIGhlaWdodDogbm9kZS5oZWlnaHQsXG4gICAgICAgICAgICB1aWQsXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzKSA9PiB7XG4gICAgICAgICAgICBjb21wcmVzc2lvblBvb2wucHVzaCh7XG4gICAgICAgICAgICAgIHVpZCxcblxuICAgICAgICAgICAgICBjYWxsYmFjazogKGltYWdlOiBVaW50OEFycmF5KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3UGFpbnQgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHBhaW50KSk7XG4gICAgICAgICAgICAgICAgbmV3UGFpbnQuaW1hZ2VIYXNoID0gZmlnbWEuY3JlYXRlSW1hZ2UoaW1hZ2UpLmhhc2g7XG4gICAgICAgICAgICAgICAgbmV3RmlsbHMucHVzaChuZXdQYWludCk7XG4gICAgICAgICAgICAgICAgcmVzKCk7XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICApO1xuXG4gICAgbm9kZS5maWxscyA9IG5ld0ZpbGxzO1xuICAgIHJlc29sdmUoKTtcbiAgfSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZVJlbmRlcihmcmFtZUlkOiBzdHJpbmcpIHtcbiAgbGV0IGNsb25lO1xuXG4gIHRyeSB7XG4gICAgY29uc3QgZnJhbWUgPSBmaWdtYS5nZXROb2RlQnlJZChmcmFtZUlkKTtcbiAgICBpZiAoIWZyYW1lIHx8IGZyYW1lLnR5cGUgIT09IFwiRlJBTUVcIikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyBmcmFtZVwiKTtcbiAgICB9XG5cbiAgICBjbG9uZSA9IGZyYW1lLmNsb25lKCk7XG4gICAgY2xvbmUubmFtZSA9IGBbdGVtcF0gJHtmcmFtZS5uYW1lfWA7XG5cbiAgICBjb25zdCBjbG9uZVRleHROb2RlcyA9IGNsb25lLmZpbmRDaGlsZHJlbigobm9kZSkgPT4gbm9kZS50eXBlID09PSBcIlRFWFRcIik7XG4gICAgY2xvbmVUZXh0Tm9kZXMuZm9yRWFjaCgobm9kZSkgPT4gbm9kZS5yZW1vdmUoKSk7XG5cbiAgICBjb25zdCBub2Rlc1dpdGhQYWludEltYWdlcyA9IGNsb25lLmZpbmRDaGlsZHJlbihcbiAgICAgIC8vIEB0cy1leHBlY3QtZXJyb3JcbiAgICAgIChub2RlKSA9PiBub2RlPy5maWxscz8uc29tZSgoZmlsbCkgPT4gZmlsbD8uaW1hZ2VIYXNoKVxuICAgICkgYXMgRGVmYXVsdFNoYXBlTWl4aW5bXTtcblxuICAgIGF3YWl0IFByb21pc2UuYWxsKG5vZGVzV2l0aFBhaW50SW1hZ2VzLm1hcChjb21wcmVzc0ltYWdlKSk7XG5cbiAgICAvLyBXYWl0IGZvciBGaWdtYSB0byBwcm9jZXNzIGltYWdlIGhhc2ggb3RoZXJ3aXNlIHRoZSBwYWludCBmaWxsIHdpdGggaGF2ZVxuICAgIC8vIGFuIGluY29ycmVjdCB0cmFuc2Zvcm0gc2NhbGVcbiAgICAvLyBUT0RPOiBGaW5kIGJldHRlciB3YXlcbiAgICBpZiAobm9kZXNXaXRoUGFpbnRJbWFnZXMubGVuZ3RoID4gMCkge1xuICAgICAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMTAwMCkpO1xuICAgIH1cblxuICAgIGNvbnNvbGUubG9nKFwiUkVOREVSSU5HIFNWR1wiKTtcbiAgICBjb25zdCBzdmcgPSBhd2FpdCBjbG9uZS5leHBvcnRBc3luYyh7XG4gICAgICBmb3JtYXQ6IFwiU1ZHXCIsXG4gICAgICBzdmdPdXRsaW5lVGV4dDogZmFsc2UsXG4gICAgICBzdmdTaW1wbGlmeVN0cm9rZTogdHJ1ZSxcbiAgICB9KTtcblxuICAgIGZpZ21hLnVpLnBvc3RNZXNzYWdlKHtcbiAgICAgIHR5cGU6IE1TR19FVkVOVFMuUkVOREVSLFxuICAgICAgZnJhbWVJZCxcbiAgICAgIHN2ZyxcbiAgICB9IGFzIE1zZ1JlbmRlclR5cGUpO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7XG4gICAgICB0eXBlOiBNU0dfRVZFTlRTLkVSUk9SLFxuICAgICAgZXJyb3JUZXh0OiBgUmVuZGVyIGZhaWxlZDogJHtlcnIgPz8gZXJyLm1lc3NhZ2V9YCxcbiAgICB9IGFzIE1zZ0Vycm9yVHlwZSk7XG4gIH0gZmluYWxseSB7XG4gICAgLy8gUmVtb3ZpbmcgY2xvbmVcbiAgICBjbG9uZT8ucmVtb3ZlKCk7XG4gIH1cbn1cblxuZXhwb3J0IHR5cGUgdGV4dE5vZGVTZWxlY3RlZFByb3BzID0gUGljazxcbiAgVGV4dE5vZGUsXG4gIHwgXCJ4XCJcbiAgfCBcInlcIlxuICB8IFwid2lkdGhcIlxuICB8IFwiaGVpZ2h0XCJcbiAgfCBcImNoYXJhY3RlcnNcIlxuICB8IFwibGluZUhlaWdodFwiXG4gIHwgXCJsZXR0ZXJTcGFjaW5nXCJcbiAgfCBcInRleHRBbGlnbkhvcml6b250YWxcIlxuICB8IFwidGV4dEFsaWduVmVydGljYWxcIlxuPjtcblxuZXhwb3J0IGludGVyZmFjZSB0ZXh0RGF0YSBleHRlbmRzIHRleHROb2RlU2VsZWN0ZWRQcm9wcyB7XG4gIGNvbG91cjogeyByOiBudW1iZXI7IGc6IG51bWJlcjsgYjogbnVtYmVyOyBhOiBudW1iZXIgfTtcbiAgZm9udFNpemU6IG51bWJlcjtcbiAgZm9udEZhbWlseTogc3RyaW5nO1xuICBmb250U3R5bGU6IHN0cmluZztcbn1cblxuLy8gRXh0cmFjdCBvYmplY3QgcHJvcGVydGllcyBmcm9tIHRleHROb2RlIGZvciBwYXNzaW5nIHZpYSBwb3N0TWVzc2FnZVxuZnVuY3Rpb24gZ2V0VGV4dE5vZGVzKGZyYW1lOiBGcmFtZU5vZGUpOiB0ZXh0RGF0YVtdIHtcbiAgY29uc3QgdGV4dE5vZGVzID0gZnJhbWUuZmluZEFsbCgoeyB0eXBlIH0pID0+IHR5cGUgPT09IFwiVEVYVFwiKSBhcyBUZXh0Tm9kZVtdO1xuICBjb25zdCB7IGFic29sdXRlVHJhbnNmb3JtIH0gPSBmcmFtZTtcbiAgY29uc3Qgcm9vdFggPSBhYnNvbHV0ZVRyYW5zZm9ybVswXVsyXTtcbiAgY29uc3Qgcm9vdFkgPSBhYnNvbHV0ZVRyYW5zZm9ybVsxXVsyXTtcblxuICByZXR1cm4gdGV4dE5vZGVzLm1hcChcbiAgICAobm9kZSk6IHRleHREYXRhID0+IHtcbiAgICAgIGNvbnN0IHtcbiAgICAgICAgYWJzb2x1dGVUcmFuc2Zvcm0sXG4gICAgICAgIHdpZHRoLFxuICAgICAgICBoZWlnaHQsXG4gICAgICAgIGZvbnRTaXplOiBmb250U2l6ZURhdGEsXG4gICAgICAgIGZvbnROYW1lLFxuICAgICAgICBmaWxscyxcbiAgICAgICAgY2hhcmFjdGVycyxcbiAgICAgICAgbGluZUhlaWdodCxcbiAgICAgICAgbGV0dGVyU3BhY2luZyxcbiAgICAgICAgdGV4dEFsaWduSG9yaXpvbnRhbCxcbiAgICAgICAgdGV4dEFsaWduVmVydGljYWwsXG4gICAgICB9ID0gbm9kZTtcblxuICAgICAgLy8gTk9URTogRmlnbWEgbm9kZSB4LCB5IGFyZSByZWxhdGl2ZSB0byBmaXJzdCBwYXJlbnQsIHdlIHdhbnQgdGhlbVxuICAgICAgLy8gcmVsYXRpdmUgdG8gdGhlIHJvb3QgZnJhbWVcbiAgICAgIGNvbnN0IHRleHRYID0gYWJzb2x1dGVUcmFuc2Zvcm1bMF1bMl07XG4gICAgICBjb25zdCB0ZXh0WSA9IGFic29sdXRlVHJhbnNmb3JtWzFdWzJdO1xuICAgICAgY29uc3QgeCA9IHRleHRYIC0gcm9vdFg7XG4gICAgICBjb25zdCB5ID0gdGV4dFkgLSByb290WTtcblxuICAgICAgLy8gRXh0cmFjdCBiYXNpYyBmaWxsIGNvbG91clxuICAgICAgY29uc3QgW2ZpbGxdID0gZmlsbHMgPT09IGZpZ21hLm1peGVkID8gW10gOiBmaWxscztcbiAgICAgIGxldCBjb2xvdXIgPSB7IHI6IDAsIGc6IDAsIGI6IDAsIGE6IDEgfTtcbiAgICAgIGlmIChmaWxsLnR5cGUgPT09IFwiU09MSURcIikge1xuICAgICAgICBjb2xvdXIgPSB7IC4uLmNvbG91ciwgYTogZmlsbC5vcGFjaXR5IHx8IDEgfTtcbiAgICAgIH1cblxuICAgICAgLy8gRXh0cmFjdCBmb250IGZhbWlseVxuICAgICAgbGV0IGZvbnRTaXplID0gMTY7XG4gICAgICBpZiAoZm9udFNpemVEYXRhICE9PSBmaWdtYS5taXhlZCkge1xuICAgICAgICBmb250U2l6ZSA9IGZvbnRTaXplRGF0YTtcbiAgICAgIH1cblxuICAgICAgLy8gRXh0cmFjdCBmb250IGZhbWlseVxuICAgICAgLy8gVE9ETzogQ29uZmlybSBmYWxsYmFjayBmb250c1xuICAgICAgbGV0IGZvbnRGYW1pbHkgPSBcIkFyaWFsXCI7XG4gICAgICBsZXQgZm9udFN0eWxlID0gXCJSZWd1bGFyXCI7XG4gICAgICBpZiAoZm9udE5hbWUgIT09IGZpZ21hLm1peGVkKSB7XG4gICAgICAgIGZvbnRGYW1pbHkgPSBmb250TmFtZS5mYW1pbHk7XG4gICAgICAgIGZvbnRTdHlsZSA9IGZvbnROYW1lLnN0eWxlO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4ge1xuICAgICAgICB4LFxuICAgICAgICB5LFxuICAgICAgICB3aWR0aCxcbiAgICAgICAgaGVpZ2h0LFxuICAgICAgICBmb250U2l6ZSxcbiAgICAgICAgZm9udEZhbWlseSxcbiAgICAgICAgZm9udFN0eWxlLFxuICAgICAgICBjb2xvdXIsXG4gICAgICAgIGNoYXJhY3RlcnMsXG4gICAgICAgIGxpbmVIZWlnaHQsXG4gICAgICAgIGxldHRlclNwYWNpbmcsXG4gICAgICAgIHRleHRBbGlnbkhvcml6b250YWwsXG4gICAgICAgIHRleHRBbGlnblZlcnRpY2FsLFxuICAgICAgfTtcbiAgICB9XG4gICk7XG59XG5cbmZ1bmN0aW9uIGdldEhlYWRsaW5lc0FuZFNvdXJjZShwYWdlTm9kZTogUGFnZU5vZGUpIHtcbiAgY29uc3QgTk9ERV9OQU1FUyA9IFtcImhlYWRsaW5lXCIsIFwic3ViaGVhZFwiLCBcInNvdXJjZVwiXTtcblxuICBjb25zdCByZXN1bHQ6IHsgW2lkOiBzdHJpbmddOiBzdHJpbmcgfCB1bmRlZmluZWQgfSA9IHt9O1xuICBmb3IgKGNvbnN0IG5hbWUgb2YgTk9ERV9OQU1FUykge1xuICAgIGNvbnN0IG5vZGUgPSBwYWdlTm9kZS5maW5kQ2hpbGQoXG4gICAgICAobm9kZSkgPT4gbm9kZS5uYW1lID09PSBuYW1lICYmIG5vZGUudHlwZSA9PT0gXCJURVhUXCJcbiAgICApIGFzIFRleHROb2RlIHwgbnVsbDtcblxuICAgIHJlc3VsdFtuYW1lXSA9IG5vZGU/LmNoYXJhY3RlcnM7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5lbnVtIEhFQURMSU5FX05PREVTIHtcbiAgSEVBRExJTkUgPSBcImhlYWRsaW5lXCIsXG4gIFNVQkhFQUQgPSBcInN1YmhlYWRcIixcbiAgU09VUkNFID0gXCJzb3VyY2VcIixcbn1cbmludGVyZmFjZSBzZXRIZWFkbGluZXNBbmRTb3VyY2VQcm9wcyB7XG4gIHBhZ2VOb2RlOiBQYWdlTm9kZTtcbiAgaGVhZGxpbmU6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgc3ViaGVhZDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBzb3VyY2U6IHN0cmluZyB8IHVuZGVmaW5lZDtcbn1cbmFzeW5jIGZ1bmN0aW9uIHNldEhlYWRsaW5lc0FuZFNvdXJjZShwcm9wczogc2V0SGVhZGxpbmVzQW5kU291cmNlUHJvcHMpIHtcbiAgY29uc3QgeyBwYWdlTm9kZSB9ID0gcHJvcHM7XG4gIGNvbnN0IGZyYW1lcyA9IHBhZ2VOb2RlLmZpbmRDaGlsZHJlbigobm9kZSkgPT4gbm9kZS50eXBlID09PSBcIkZSQU1FXCIpO1xuICBjb25zdCBtb3N0TGVmdFBvcyA9IE1hdGgubWluKC4uLmZyYW1lcy5tYXAoKG5vZGUpID0+IG5vZGUueCkpO1xuICBjb25zdCBtb3N0VG9wUG9zID0gTWF0aC5taW4oLi4uZnJhbWVzLm1hcCgobm9kZSkgPT4gbm9kZS55KSk7XG5cbiAgT2JqZWN0LnZhbHVlcyhIRUFETElORV9OT0RFUykuZm9yRWFjaChhc3luYyAobmFtZSwgX2kpID0+IHtcbiAgICBsZXQgbm9kZSA9IHBhZ2VOb2RlLmZpbmRDaGlsZChcbiAgICAgIChub2RlKSA9PiBub2RlLm5hbWUgPT09IG5hbWUgJiYgbm9kZS50eXBlID09PSBcIlRFWFRcIlxuICAgICkgYXMgVGV4dE5vZGUgfCBudWxsO1xuICAgIGNvbnN0IHRleHRDb250ZW50ID0gcHJvcHNbbmFtZV07XG5cbiAgICAvLyBSZW1vdmUgbm9kZSBpZiB0aGVyZSdzIG5vIHRleHQgY29udGVudFxuICAgIGlmICghdGV4dENvbnRlbnQpIHtcbiAgICAgIGlmIChub2RlKSBub2RlLnJlbW92ZSgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIENyZWF0ZSBub2RlIGlmIGl0IGRvZXNuJ3QgZXhpc3RcbiAgICBpZiAoIW5vZGUpIHtcbiAgICAgIG5vZGUgPSBmaWdtYS5jcmVhdGVUZXh0KCk7XG4gICAgICBub2RlLm5hbWUgPSBuYW1lO1xuXG4gICAgICBsZXQgeSA9IG1vc3RUb3BQb3MgLSA2MDtcbiAgICAgIGlmIChuYW1lID09PSBIRUFETElORV9OT0RFUy5IRUFETElORSkge1xuICAgICAgICB5IC09IDYwO1xuICAgICAgfSBlbHNlIGlmIChuYW1lID09PSBIRUFETElORV9OT0RFUy5TVUJIRUFEKSB7XG4gICAgICAgIHkgLT0gMzA7XG4gICAgICB9XG5cbiAgICAgIG5vZGUucmVsYXRpdmVUcmFuc2Zvcm0gPSBbXG4gICAgICAgIFsxLCAwLCBtb3N0TGVmdFBvc10sXG4gICAgICAgIFswLCAxLCB5XSxcbiAgICAgIF07XG4gICAgfVxuXG4gICAgLy8gRW5zdXJlIHRleHQgbm9kZSBpcyBsb2NrZWRcbiAgICBub2RlLmxvY2tlZCA9IHRydWU7XG5cbiAgICAvLyBMb2FkIGZvbnRcbiAgICBjb25zdCBmb250TmFtZSA9XG4gICAgICBub2RlLmZvbnROYW1lICE9PSBmaWdtYS5taXhlZCA/IG5vZGUuZm9udE5hbWUuZmFtaWx5IDogXCJSb2JvdG9cIjtcbiAgICBjb25zdCBmb250U3R5bGUgPVxuICAgICAgbm9kZS5mb250TmFtZSAhPT0gZmlnbWEubWl4ZWQgPyBub2RlLmZvbnROYW1lLnN0eWxlIDogXCJSZWd1bGFyXCI7XG4gICAgYXdhaXQgZmlnbWEubG9hZEZvbnRBc3luYyh7IGZhbWlseTogZm9udE5hbWUsIHN0eWxlOiBmb250U3R5bGUgfSk7XG5cbiAgICAvLyBTZXQgdGV4dCBub2RlIGNvbnRlbnRcbiAgICBub2RlLmNoYXJhY3RlcnMgPSBwcm9wc1tuYW1lXSB8fCBcIlwiO1xuICB9KTtcbn1cblxuaW50ZXJmYWNlIE1zZ0Nsb3NlSW50ZXJmYWNlIHtcbiAgdHlwZTogTVNHX0VWRU5UUy5DTE9TRTtcbn1cbmludGVyZmFjZSBNc2dEb21SZWFkeUludGVyZmFjZSB7XG4gIHR5cGU6IE1TR19FVkVOVFMuRE9NX1JFQURZO1xufVxuXG5pbnRlcmZhY2UgTXNnUmVuZGVySW50ZXJmYWNlIHtcbiAgdHlwZTogTVNHX0VWRU5UUy5SRU5ERVI7XG4gIGZyYW1lSWQ6IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIE1zZ0Vycm9ySW50ZXJmYWNlIHtcbiAgdHlwZTogTVNHX0VWRU5UUy5FUlJPUjtcbn1cblxuaW50ZXJmYWNlIE1zZ1Jlc2l6ZUludGVyZmFjZSB7XG4gIHR5cGU6IE1TR19FVkVOVFMuUkVTSVpFO1xuICB3aWR0aDogbnVtYmVyO1xuICBoZWlnaHQ6IG51bWJlcjtcbn1cblxuaW50ZXJmYWNlIE1zZ0hlYWRsaW5lc0ludGVyZmFjZSB7XG4gIHR5cGU6IE1TR19FVkVOVFMuVVBEQVRFX0hFQURMSU5FUztcbiAgaGVhZGxpbmU6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgc3ViaGVhZDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBzb3VyY2U6IHN0cmluZyB8IHVuZGVmaW5lZDtcbn1cblxuZXhwb3J0IHR5cGUgUG9zdE1zZyA9XG4gIHwgTXNnQ29tcHJlc3NlZEltYWdlVHlwZVxuICB8IE1zZ0Vycm9ySW50ZXJmYWNlXG4gIHwgTXNnQ2xvc2VJbnRlcmZhY2VcbiAgfCBNc2dEb21SZWFkeUludGVyZmFjZVxuICB8IE1zZ1Jlc2l6ZUludGVyZmFjZVxuICB8IE1zZ1JlbmRlckludGVyZmFjZVxuICB8IE1zZ0hlYWRsaW5lc0ludGVyZmFjZTtcblxuLy8gSGFuZGxlIG1lc3NhZ2VzIGZyb20gdGhlIFVJXG5mdW5jdGlvbiBoYW5kbGVSZWNlaXZlZE1zZyhtc2c6IFBvc3RNc2cpIHtcbiAgc3dpdGNoIChtc2cudHlwZSkge1xuICAgIGNhc2UgTVNHX0VWRU5UUy5FUlJPUjpcbiAgICAgIGNvbnNvbGUubG9nKFwicGx1Z2luIG1zZzogZXJyb3JcIik7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgTVNHX0VWRU5UUy5DTE9TRTpcbiAgICAgIGNvbnNvbGUubG9nKFwicGx1Z2luIG1zZzogY2xvc2VcIik7XG4gICAgICBmaWdtYS5jbG9zZVBsdWdpbigpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIE1TR19FVkVOVFMuRE9NX1JFQURZOlxuICAgICAgY29uc29sZS5sb2coXCJwbHVnaW4gbXNnOiBET00gUkVBRFlcIik7XG4gICAgICBnZXRSb290RnJhbWVzKCk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgTVNHX0VWRU5UUy5SRU5ERVI6XG4gICAgICBjb25zdCB7IGZyYW1lSWQgfSA9IG1zZztcbiAgICAgIGNvbnNvbGUubG9nKFwicGx1Z2luIG1zZzogcmVuZGVyXCIsIGZyYW1lSWQpO1xuICAgICAgaGFuZGxlUmVuZGVyKGZyYW1lSWQpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIE1TR19FVkVOVFMuUkVTSVpFOlxuICAgICAgY29uc3QgeyB3aWR0aCwgaGVpZ2h0IH0gPSBtc2c7XG4gICAgICBjb25zb2xlLmxvZyhcInBsdWdpbiBtc2c6IHJlc2l6ZVwiKTtcbiAgICAgIGZpZ21hLnVpLnJlc2l6ZSh3aWR0aCwgaGVpZ2h0KTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSBNU0dfRVZFTlRTLlVQREFURV9IRUFETElORVM6XG4gICAgICBjb25zdCB7IGhlYWRsaW5lLCBzdWJoZWFkLCBzb3VyY2UgfSA9IG1zZztcbiAgICAgIHNldEhlYWRsaW5lc0FuZFNvdXJjZSh7XG4gICAgICAgIHBhZ2VOb2RlOiBmaWdtYS5jdXJyZW50UGFnZSxcbiAgICAgICAgaGVhZGxpbmUsXG4gICAgICAgIHN1YmhlYWQsXG4gICAgICAgIHNvdXJjZSxcbiAgICAgIH0pO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIE1TR19FVkVOVFMuQ09NUFJFU1NFRF9JTUFHRTpcbiAgICAgIGhhbmRsZUNvbXByZXNzZWRNc2cobXNnKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgZGVmYXVsdDpcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJVbmtub3duIHBvc3QgbWVzc2FnZVwiLCBtc2cpO1xuICB9XG59XG4iLCAiZXhwb3J0IGVudW0gU1RBR0VTIHtcbiAgQ0hPT1NFX0ZSQU1FUyxcbiAgUFJFVklFV19PVVRQVVQsXG4gIFJFU1BPTlNJVkVfUFJFVklFVyxcbiAgU0FWRV9PVVRQVVQsXG59XG5cbmV4cG9ydCBlbnVtIE1TR19FVkVOVFMge1xuICBET01fUkVBRFksXG4gIE5PX0ZSQU1FUyxcbiAgRk9VTkRfRlJBTUVTLFxuICBSRVNJWkUsXG4gIFJFTkRFUixcbiAgQ0xPU0UsXG4gIEVSUk9SLFxuICBVUERBVEVfSEVBRExJTkVTLFxuICBDT01QUkVTU19JTUFHRSxcbiAgQ09NUFJFU1NFRF9JTUFHRSxcbn1cblxuZXhwb3J0IGVudW0gT1VUUFVUX0ZPUk1BVFMge1xuICBJTkxJTkUsXG4gIElGUkFNRSxcbn1cblxuZXhwb3J0IGNvbnN0IFVJX1RFWFQgPSB7XG4gIEVSUk9SX1VORVhQRUNURUQ6IFwiVW5leHBlY3RlZCBlcnJvclwiLFxuICBFUlJPUl9NSVNTSU5HX0ZSQU1FUzogXCJObyBmcmFtZXMgZm91bmQuIFBsZWFzZSBhZGQgc29tZSBmcmFtZXMgdG8gdGhlIHBhZ2UuXCIsXG4gIFdBUk5fTk9fVEFSR0VUUzogXCJTdGFuZGFyZCBmcmFtZXMgbm90IGZvdW5kLiBQbGVhc2Ugc2VsZWN0IHRhcmdldCBmcmFtZXMuXCIsXG4gIFdBUk5fVE9PX01BTllfVEFSR0VUUzogXCJQbGVhc2Ugc2VsZWN0IHRocmVlIHRhcmdldCBmcmFtZXNcIixcbiAgSU5GT19QUkVWSUVXOiBcIlByZXZpZXcgZWFjaCBmcmFtZSBvdXRwdXRcIixcbiAgVElUTEVfQ0hPT1NFX0ZSQU1FOiBcIkNob29zZSB3aGljaCBmcmFtZXMgdG8gZXhwb3J0XCIsXG4gIFRJVExFX1BSRVZJRVc6IFwiUHJldmlld1wiLFxuICBUSVRMRV9SRVNQT05TSVZFX1BSRVZJRVc6IFwiUmVzcG9uc2l2ZSBwcmV2aWV3XCIsXG4gIFRJTEVfT1VUUFVUOiBcIkV4cG9ydFwiLFxuICBCVVRUT05fTkVYVDogXCJOZXh0XCIsXG4gIEJVVFRPTl9ET1dOTE9BRDogXCJEb3dubG9hZFwiLFxuICBCVVRUT05fUFJFVklPVVM6IFwiQmFja1wiLFxufTtcblxuZXhwb3J0IGNvbnN0IElOSVRJQUxfVUlfU0laRSA9IHtcbiAgd2lkdGg6IDQ4MCxcbiAgaGVpZ2h0OiA1MDAsXG4gIG1heFdpZHRoOiAxMjAwLFxuICBtYXhIZWlnaHQ6IDkwMCxcbiAgbWluV2lkdGg6IDQyMCxcbiAgbWluSGVpZ2h0OiA0ODAsXG59O1xuXG5leHBvcnQgY29uc3QgRlJBTUVfV0FSTklOR19TSVpFID0gMzAwO1xuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7QUFBQTtBQVlBLFVBQU0sR0FBRyxHQUFHLFdBQVcsQ0FBQyxNQUFNLGtCQUFrQjtBQUloRCxVQUFNLE9BQU87QUFH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
