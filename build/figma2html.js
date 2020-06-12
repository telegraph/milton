(() => {
  let __assign = Object.assign;

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
  var HEADLINE_NODE_NAMES;
  (function(HEADLINE_NODE_NAMES2) {
    HEADLINE_NODE_NAMES2["HEADLINE"] = "headline";
    HEADLINE_NODE_NAMES2["SUBHEAD"] = "subhead";
    HEADLINE_NODE_NAMES2["SOURCE"] = "source";
  })(HEADLINE_NODE_NAMES || (HEADLINE_NODE_NAMES = {}));

  // src/index.tsx
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
      clearTimeout(compressionPool[poolItemIndex].timeout);
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
            const timeout = setTimeout(() => {
              _reject("Compress image response timed out.");
            }, 5e3);
            compressionPool.push({
              uid,
              callback: (image2) => {
                const newPaint = JSON.parse(JSON.stringify(paint));
                newPaint.imageHash = figma.createImage(image2).hash;
                newFills.push(newPaint);
                res();
              },
              timeout
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
        errorText: `Render failed: ${err == null ? void 0 : err.message}`
      });
    } finally {
      console.warn("Inside render finallay");
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
  async function setHeadlinesAndSource(props) {
    const {pageNode} = props;
    const frames = pageNode.findChildren((node) => node.type === "FRAME");
    const mostLeftPos = Math.min(...frames.map((node) => node.x));
    const mostTopPos = Math.min(...frames.map((node) => node.y));
    Object.values(HEADLINE_NODE_NAMES).forEach(async (name, _i) => {
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
        if (name === HEADLINE_NODE_NAMES.HEADLINE) {
          y -= 60;
        } else if (name === HEADLINE_NODE_NAMES.SUBHEAD) {
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
})();
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL2NvbnN0YW50cy50cyIsICJzcmMvaW5kZXgudHN4Il0sCiAgInNvdXJjZXNDb250ZW50IjogWyJleHBvcnQgZW51bSBTVEFHRVMge1xuICBDSE9PU0VfRlJBTUVTLFxuICBQUkVWSUVXX09VVFBVVCxcbiAgUkVTUE9OU0lWRV9QUkVWSUVXLFxuICBTQVZFX09VVFBVVCxcbn1cblxuZXhwb3J0IGVudW0gTVNHX0VWRU5UUyB7XG4gIERPTV9SRUFEWSxcbiAgTk9fRlJBTUVTLFxuICBGT1VORF9GUkFNRVMsXG4gIFJFU0laRSxcbiAgUkVOREVSLFxuICBDTE9TRSxcbiAgRVJST1IsXG4gIFVQREFURV9IRUFETElORVMsXG4gIENPTVBSRVNTX0lNQUdFLFxuICBDT01QUkVTU0VEX0lNQUdFLFxufVxuXG5leHBvcnQgZW51bSBPVVRQVVRfRk9STUFUUyB7XG4gIElOTElORSxcbiAgSUZSQU1FLFxufVxuXG5leHBvcnQgY29uc3QgVUlfVEVYVCA9IHtcbiAgRVJST1JfVU5FWFBFQ1RFRDogXCJVbmV4cGVjdGVkIGVycm9yXCIsXG4gIEVSUk9SX01JU1NJTkdfRlJBTUVTOiBcIk5vIGZyYW1lcyBmb3VuZC4gUGxlYXNlIGFkZCBzb21lIGZyYW1lcyB0byB0aGUgcGFnZS5cIixcbiAgV0FSTl9OT19UQVJHRVRTOiBcIlN0YW5kYXJkIGZyYW1lcyBub3QgZm91bmQuIFBsZWFzZSBzZWxlY3QgdGFyZ2V0IGZyYW1lcy5cIixcbiAgV0FSTl9UT09fTUFOWV9UQVJHRVRTOiBcIlBsZWFzZSBzZWxlY3QgdGhyZWUgdGFyZ2V0IGZyYW1lc1wiLFxuICBJTkZPX1BSRVZJRVc6IFwiUHJldmlldyBlYWNoIGZyYW1lIG91dHB1dFwiLFxuICBUSVRMRV9DSE9PU0VfRlJBTUU6IFwiQ2hvb3NlIHdoaWNoIGZyYW1lcyB0byBleHBvcnRcIixcbiAgVElUTEVfUFJFVklFVzogXCJQcmV2aWV3XCIsXG4gIFRJVExFX1JFU1BPTlNJVkVfUFJFVklFVzogXCJSZXNwb25zaXZlIHByZXZpZXdcIixcbiAgVElMRV9PVVRQVVQ6IFwiRXhwb3J0XCIsXG4gIEJVVFRPTl9ORVhUOiBcIk5leHRcIixcbiAgQlVUVE9OX0RPV05MT0FEOiBcIkRvd25sb2FkXCIsXG4gIEJVVFRPTl9QUkVWSU9VUzogXCJCYWNrXCIsXG59O1xuXG5leHBvcnQgY29uc3QgSU5JVElBTF9VSV9TSVpFID0ge1xuICB3aWR0aDogNDgwLFxuICBoZWlnaHQ6IDUwMCxcbiAgbWF4V2lkdGg6IDEyMDAsXG4gIG1heEhlaWdodDogOTAwLFxuICBtaW5XaWR0aDogNDIwLFxuICBtaW5IZWlnaHQ6IDQ4MCxcbn07XG5cbmV4cG9ydCBjb25zdCBGUkFNRV9XQVJOSU5HX1NJWkUgPSAzMDA7XG5cbmV4cG9ydCBlbnVtIEhFQURMSU5FX05PREVfTkFNRVMge1xuICBIRUFETElORSA9IFwiaGVhZGxpbmVcIixcbiAgU1VCSEVBRCA9IFwic3ViaGVhZFwiLFxuICBTT1VSQ0UgPSBcInNvdXJjZVwiLFxufVxuIiwgImltcG9ydCB7IE1TR19FVkVOVFMsIEhFQURMSU5FX05PREVfTkFNRVMgfSBmcm9tIFwiLi9jb25zdGFudHNcIjtcbmltcG9ydCB0eXBlIHtcbiAgTXNnRnJhbWVzVHlwZSxcbiAgTXNnTm9GcmFtZXNUeXBlLFxuICBNc2dSZW5kZXJUeXBlLFxuICBNc2dFcnJvclR5cGUsXG4gIE1zZ0NvbXByZXNzZWRJbWFnZVR5cGUsXG4gIHRleHREYXRhLFxuICBQb3N0TXNnLFxuICBzZXRIZWFkbGluZXNBbmRTb3VyY2VQcm9wcyxcbn0gZnJvbSBcInR5cGVzXCI7XG5cbi8vIExpc3RlbiBmb3IgbWVzc2FnZXMgZnJvbSB0aGUgVUlcbi8vIE5PVEU6IExpc3RlbiBmb3IgRE9NX1JFQURZIG1lc3NhZ2UgdG8ga2ljay1vZmYgbWFpbiBmdW5jdGlvblxuZmlnbWEudWkub24oXCJtZXNzYWdlXCIsIChlKSA9PiBoYW5kbGVSZWNlaXZlZE1zZyhlKSk7XG5cbi8vIFJlbmRlciB0aGUgRE9NXG4vLyBOT1RFOiBvbiBzdWNjZXNzZnVsIFVJIHJlbmRlciBhIHBvc3QgbWVzc2FnZSBpcyBzZW5kIGJhY2sgb2YgRE9NX1JFQURZXG5maWdtYS5zaG93VUkoX19odG1sX18pO1xuXG4vLyBSZXNpemUgVUkgdG8gbWF4IHZpZXdwb3J0IGRpbWVuc2lvbnNcbmNvbnN0IHsgd2lkdGgsIGhlaWdodCB9ID0gZmlnbWEudmlld3BvcnQuYm91bmRzO1xuY29uc3QgeyB6b29tIH0gPSBmaWdtYS52aWV3cG9ydDtcbmNvbnN0IGluaXRpYWxXaW5kb3dXaWR0aCA9IE1hdGgucm91bmQod2lkdGggKiB6b29tKTtcbmNvbnN0IGluaXRpYWxXaW5kb3dIZWlnaHQgPSBNYXRoLnJvdW5kKGhlaWdodCAqIHpvb20pO1xuZmlnbWEudWkucmVzaXplKGluaXRpYWxXaW5kb3dXaWR0aCwgaW5pdGlhbFdpbmRvd0hlaWdodCk7XG5cbmNvbnN0IGNvbXByZXNzaW9uUG9vbDoge1xuICB1aWQ6IHN0cmluZztcbiAgY2FsbGJhY2s6IChpbWc6IFVpbnQ4QXJyYXkpID0+IHZvaWQ7XG4gIHRpbWVvdXQ6IG51bWJlcjtcbn1bXSA9IFtdO1xuXG5mdW5jdGlvbiBoYW5kbGVDb21wcmVzc2VkTXNnKG1zZzogTXNnQ29tcHJlc3NlZEltYWdlVHlwZSkge1xuICBjb25zdCB7IHVpZCwgaW1hZ2UgfSA9IG1zZztcblxuICBjb25zdCBwb29sSXRlbUluZGV4ID0gY29tcHJlc3Npb25Qb29sLmZpbmRJbmRleCgoaXRlbSkgPT4gaXRlbS51aWQgPT09IHVpZCk7XG4gIGlmIChwb29sSXRlbUluZGV4ID4gLTEpIHtcbiAgICBjb21wcmVzc2lvblBvb2xbcG9vbEl0ZW1JbmRleF0uY2FsbGJhY2soaW1hZ2UpO1xuICAgIGNsZWFyVGltZW91dChjb21wcmVzc2lvblBvb2xbcG9vbEl0ZW1JbmRleF0udGltZW91dCk7XG4gICAgY29tcHJlc3Npb25Qb29sLnNwbGljZShwb29sSXRlbUluZGV4LCAxKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRSb290RnJhbWVzKCkge1xuICBjb25zdCB7IGN1cnJlbnRQYWdlIH0gPSBmaWdtYTtcbiAgY29uc3Qgcm9vdEZyYW1lcyA9IGN1cnJlbnRQYWdlLmNoaWxkcmVuLmZpbHRlcihcbiAgICAobm9kZSkgPT4gbm9kZS50eXBlID09PSBcIkZSQU1FXCJcbiAgKSBhcyBGcmFtZU5vZGVbXTtcblxuICAvLyBSZXR1cm4gZXJyb3IgaWYgdGhlcmUncyBubyBmcmFtZXMgb24gdGhlIGN1cnJlbnQgcGFnZVxuICBpZiAocm9vdEZyYW1lcy5sZW5ndGggPCAxKSB7XG4gICAgY29uc29sZS53YXJuKFwiTm8gZnJhbWVzXCIpO1xuICAgIGZpZ21hLnVpLnBvc3RNZXNzYWdlKHsgdHlwZTogTVNHX0VWRU5UUy5OT19GUkFNRVMgfSBhcyBNc2dOb0ZyYW1lc1R5cGUpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IGhlYWRsaW5lc0FuZFNvdXJjZSA9IGdldEhlYWRsaW5lc0FuZFNvdXJjZShjdXJyZW50UGFnZSk7XG5cbiAgY29uc3QgZnJhbWVzRGF0YSA9IHJvb3RGcmFtZXMubWFwKChmcmFtZSkgPT4ge1xuICAgIGNvbnN0IHsgbmFtZSwgd2lkdGgsIGhlaWdodCwgaWQgfSA9IGZyYW1lO1xuICAgIGNvbnN0IHRleHROb2RlcyA9IGdldFRleHROb2RlcyhmcmFtZSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgbmFtZSxcbiAgICAgIHdpZHRoLFxuICAgICAgaGVpZ2h0LFxuICAgICAgaWQsXG4gICAgICB0ZXh0Tm9kZXMsXG4gICAgICByZXNwb25zaXZlOiBmYWxzZSxcbiAgICAgIHNlbGVjdGVkOiB0cnVlLFxuICAgIH07XG4gIH0pO1xuXG4gIGZpZ21hLnVpLnBvc3RNZXNzYWdlKHtcbiAgICB0eXBlOiBNU0dfRVZFTlRTLkZPVU5EX0ZSQU1FUyxcbiAgICBmcmFtZXM6IGZyYW1lc0RhdGEsXG4gICAgd2luZG93V2lkdGg6IGluaXRpYWxXaW5kb3dXaWR0aCxcbiAgICB3aW5kb3dIZWlnaHQ6IGluaXRpYWxXaW5kb3dIZWlnaHQsXG4gICAgLi4uaGVhZGxpbmVzQW5kU291cmNlLFxuICB9IGFzIE1zZ0ZyYW1lc1R5cGUpO1xufVxuXG5mdW5jdGlvbiBjb21wcmVzc0ltYWdlKG5vZGU6IERlZmF1bHRTaGFwZU1peGluKTogUHJvbWlzZTx2b2lkPiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShhc3luYyAocmVzb2x2ZSwgX3JlamVjdCkgPT4ge1xuICAgIGNvbnN0IG5ld0ZpbGxzOiBhbnlbXSA9IFtdO1xuICAgIGNvbnN0IGZpbGxzID0gbm9kZS5maWxscyA9PT0gZmlnbWEubWl4ZWQgPyBbXSA6IFsuLi5ub2RlLmZpbGxzXTtcblxuICAgIGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgZmlsbHMubWFwKGFzeW5jIChwYWludCkgPT4ge1xuICAgICAgICBpZiAocGFpbnQudHlwZSA9PT0gXCJJTUFHRVwiICYmIHBhaW50LmltYWdlSGFzaCkge1xuICAgICAgICAgIGNvbnN0IGltYWdlID0gZmlnbWEuZ2V0SW1hZ2VCeUhhc2gocGFpbnQuaW1hZ2VIYXNoKTtcbiAgICAgICAgICBjb25zdCBpbWFnZUJ5dGVzID0gYXdhaXQgaW1hZ2UuZ2V0Qnl0ZXNBc3luYygpO1xuICAgICAgICAgIGNvbnN0IHVpZCA9IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzIpO1xuXG4gICAgICAgICAgLy8gU2VuZCBwb3N0IG1lc3NhZ2VcbiAgICAgICAgICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7XG4gICAgICAgICAgICB0eXBlOiBNU0dfRVZFTlRTLkNPTVBSRVNTX0lNQUdFLFxuICAgICAgICAgICAgaW1hZ2U6IGltYWdlQnl0ZXMsXG4gICAgICAgICAgICB3aWR0aDogbm9kZS53aWR0aCxcbiAgICAgICAgICAgIGhlaWdodDogbm9kZS5oZWlnaHQsXG4gICAgICAgICAgICB1aWQsXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0aW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgIF9yZWplY3QoXCJDb21wcmVzcyBpbWFnZSByZXNwb25zZSB0aW1lZCBvdXQuXCIpO1xuICAgICAgICAgICAgfSwgNTAwMCk7XG5cbiAgICAgICAgICAgIGNvbXByZXNzaW9uUG9vbC5wdXNoKHtcbiAgICAgICAgICAgICAgdWlkLFxuXG4gICAgICAgICAgICAgIGNhbGxiYWNrOiAoaW1hZ2U6IFVpbnQ4QXJyYXkpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdQYWludCA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkocGFpbnQpKTtcbiAgICAgICAgICAgICAgICBuZXdQYWludC5pbWFnZUhhc2ggPSBmaWdtYS5jcmVhdGVJbWFnZShpbWFnZSkuaGFzaDtcbiAgICAgICAgICAgICAgICBuZXdGaWxscy5wdXNoKG5ld1BhaW50KTtcbiAgICAgICAgICAgICAgICByZXMoKTtcbiAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICB0aW1lb3V0LFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgKTtcblxuICAgIG5vZGUuZmlsbHMgPSBuZXdGaWxscztcbiAgICByZXNvbHZlKCk7XG4gIH0pO1xufVxuXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVSZW5kZXIoZnJhbWVJZDogc3RyaW5nKSB7XG4gIGxldCBjbG9uZTtcblxuICB0cnkge1xuICAgIGNvbnN0IGZyYW1lID0gZmlnbWEuZ2V0Tm9kZUJ5SWQoZnJhbWVJZCk7XG4gICAgaWYgKCFmcmFtZSB8fCBmcmFtZS50eXBlICE9PSBcIkZSQU1FXCIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgZnJhbWVcIik7XG4gICAgfVxuXG4gICAgY2xvbmUgPSBmcmFtZS5jbG9uZSgpO1xuICAgIGNsb25lLm5hbWUgPSBgW3RlbXBdICR7ZnJhbWUubmFtZX1gO1xuXG4gICAgY29uc3QgY2xvbmVUZXh0Tm9kZXMgPSBjbG9uZS5maW5kQ2hpbGRyZW4oKG5vZGUpID0+IG5vZGUudHlwZSA9PT0gXCJURVhUXCIpO1xuICAgIGNsb25lVGV4dE5vZGVzLmZvckVhY2goKG5vZGUpID0+IG5vZGUucmVtb3ZlKCkpO1xuXG4gICAgY29uc3Qgbm9kZXNXaXRoUGFpbnRJbWFnZXMgPSBjbG9uZS5maW5kQ2hpbGRyZW4oXG4gICAgICAvLyBAdHMtZXhwZWN0LWVycm9yXG4gICAgICAobm9kZSkgPT4gbm9kZT8uZmlsbHM/LnNvbWUoKGZpbGwpID0+IGZpbGw/LmltYWdlSGFzaClcbiAgICApIGFzIERlZmF1bHRTaGFwZU1peGluW107XG5cbiAgICBhd2FpdCBQcm9taXNlLmFsbChub2Rlc1dpdGhQYWludEltYWdlcy5tYXAoY29tcHJlc3NJbWFnZSkpO1xuXG4gICAgLy8gV2FpdCBmb3IgRmlnbWEgdG8gcHJvY2VzcyBpbWFnZSBoYXNoIG90aGVyd2lzZSB0aGUgcGFpbnQgZmlsbCB3aXRoIGhhdmVcbiAgICAvLyBhbiBpbmNvcnJlY3QgdHJhbnNmb3JtIHNjYWxlXG4gICAgLy8gVE9ETzogRmluZCBiZXR0ZXIgd2F5XG4gICAgaWYgKG5vZGVzV2l0aFBhaW50SW1hZ2VzLmxlbmd0aCA+IDApIHtcbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDEwMDApKTtcbiAgICB9XG5cbiAgICBjb25zb2xlLmxvZyhcIlJFTkRFUklORyBTVkdcIik7XG4gICAgY29uc3Qgc3ZnID0gYXdhaXQgY2xvbmUuZXhwb3J0QXN5bmMoe1xuICAgICAgZm9ybWF0OiBcIlNWR1wiLFxuICAgICAgc3ZnT3V0bGluZVRleHQ6IGZhbHNlLFxuICAgICAgc3ZnU2ltcGxpZnlTdHJva2U6IHRydWUsXG4gICAgfSk7XG5cbiAgICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7XG4gICAgICB0eXBlOiBNU0dfRVZFTlRTLlJFTkRFUixcbiAgICAgIGZyYW1lSWQsXG4gICAgICBzdmcsXG4gICAgfSBhcyBNc2dSZW5kZXJUeXBlKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgZmlnbWEudWkucG9zdE1lc3NhZ2Uoe1xuICAgICAgdHlwZTogTVNHX0VWRU5UUy5FUlJPUixcbiAgICAgIGVycm9yVGV4dDogYFJlbmRlciBmYWlsZWQ6ICR7ZXJyPy5tZXNzYWdlfWAsXG4gICAgfSBhcyBNc2dFcnJvclR5cGUpO1xuICB9IGZpbmFsbHkge1xuICAgIGNvbnNvbGUud2FybihcIkluc2lkZSByZW5kZXIgZmluYWxsYXlcIik7XG4gICAgLy8gUmVtb3ZpbmcgY2xvbmVcbiAgICBjbG9uZT8ucmVtb3ZlKCk7XG4gIH1cbn1cblxuLy8gRXh0cmFjdCBvYmplY3QgcHJvcGVydGllcyBmcm9tIHRleHROb2RlIGZvciBwYXNzaW5nIHZpYSBwb3N0TWVzc2FnZVxuZnVuY3Rpb24gZ2V0VGV4dE5vZGVzKGZyYW1lOiBGcmFtZU5vZGUpOiB0ZXh0RGF0YVtdIHtcbiAgY29uc3QgdGV4dE5vZGVzID0gZnJhbWUuZmluZEFsbCgoeyB0eXBlIH0pID0+IHR5cGUgPT09IFwiVEVYVFwiKSBhcyBUZXh0Tm9kZVtdO1xuICBjb25zdCB7IGFic29sdXRlVHJhbnNmb3JtIH0gPSBmcmFtZTtcbiAgY29uc3Qgcm9vdFggPSBhYnNvbHV0ZVRyYW5zZm9ybVswXVsyXTtcbiAgY29uc3Qgcm9vdFkgPSBhYnNvbHV0ZVRyYW5zZm9ybVsxXVsyXTtcblxuICByZXR1cm4gdGV4dE5vZGVzLm1hcChcbiAgICAobm9kZSk6IHRleHREYXRhID0+IHtcbiAgICAgIGNvbnN0IHtcbiAgICAgICAgYWJzb2x1dGVUcmFuc2Zvcm0sXG4gICAgICAgIHdpZHRoLFxuICAgICAgICBoZWlnaHQsXG4gICAgICAgIGZvbnRTaXplOiBmb250U2l6ZURhdGEsXG4gICAgICAgIGZvbnROYW1lLFxuICAgICAgICBmaWxscyxcbiAgICAgICAgY2hhcmFjdGVycyxcbiAgICAgICAgbGluZUhlaWdodCxcbiAgICAgICAgbGV0dGVyU3BhY2luZyxcbiAgICAgICAgdGV4dEFsaWduSG9yaXpvbnRhbCxcbiAgICAgICAgdGV4dEFsaWduVmVydGljYWwsXG4gICAgICB9ID0gbm9kZTtcblxuICAgICAgLy8gTk9URTogRmlnbWEgbm9kZSB4LCB5IGFyZSByZWxhdGl2ZSB0byBmaXJzdCBwYXJlbnQsIHdlIHdhbnQgdGhlbVxuICAgICAgLy8gcmVsYXRpdmUgdG8gdGhlIHJvb3QgZnJhbWVcbiAgICAgIGNvbnN0IHRleHRYID0gYWJzb2x1dGVUcmFuc2Zvcm1bMF1bMl07XG4gICAgICBjb25zdCB0ZXh0WSA9IGFic29sdXRlVHJhbnNmb3JtWzFdWzJdO1xuICAgICAgY29uc3QgeCA9IHRleHRYIC0gcm9vdFg7XG4gICAgICBjb25zdCB5ID0gdGV4dFkgLSByb290WTtcblxuICAgICAgLy8gRXh0cmFjdCBiYXNpYyBmaWxsIGNvbG91clxuICAgICAgY29uc3QgW2ZpbGxdID0gZmlsbHMgPT09IGZpZ21hLm1peGVkID8gW10gOiBmaWxscztcbiAgICAgIGxldCBjb2xvdXIgPSB7IHI6IDAsIGc6IDAsIGI6IDAsIGE6IDEgfTtcbiAgICAgIGlmIChmaWxsLnR5cGUgPT09IFwiU09MSURcIikge1xuICAgICAgICBjb2xvdXIgPSB7IC4uLmNvbG91ciwgYTogZmlsbC5vcGFjaXR5IHx8IDEgfTtcbiAgICAgIH1cblxuICAgICAgLy8gRXh0cmFjdCBmb250IGZhbWlseVxuICAgICAgbGV0IGZvbnRTaXplID0gMTY7XG4gICAgICBpZiAoZm9udFNpemVEYXRhICE9PSBmaWdtYS5taXhlZCkge1xuICAgICAgICBmb250U2l6ZSA9IGZvbnRTaXplRGF0YTtcbiAgICAgIH1cblxuICAgICAgLy8gRXh0cmFjdCBmb250IGZhbWlseVxuICAgICAgLy8gVE9ETzogQ29uZmlybSBmYWxsYmFjayBmb250c1xuICAgICAgbGV0IGZvbnRGYW1pbHkgPSBcIkFyaWFsXCI7XG4gICAgICBsZXQgZm9udFN0eWxlID0gXCJSZWd1bGFyXCI7XG4gICAgICBpZiAoZm9udE5hbWUgIT09IGZpZ21hLm1peGVkKSB7XG4gICAgICAgIGZvbnRGYW1pbHkgPSBmb250TmFtZS5mYW1pbHk7XG4gICAgICAgIGZvbnRTdHlsZSA9IGZvbnROYW1lLnN0eWxlO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4ge1xuICAgICAgICB4LFxuICAgICAgICB5LFxuICAgICAgICB3aWR0aCxcbiAgICAgICAgaGVpZ2h0LFxuICAgICAgICBmb250U2l6ZSxcbiAgICAgICAgZm9udEZhbWlseSxcbiAgICAgICAgZm9udFN0eWxlLFxuICAgICAgICBjb2xvdXIsXG4gICAgICAgIGNoYXJhY3RlcnMsXG4gICAgICAgIGxpbmVIZWlnaHQsXG4gICAgICAgIGxldHRlclNwYWNpbmcsXG4gICAgICAgIHRleHRBbGlnbkhvcml6b250YWwsXG4gICAgICAgIHRleHRBbGlnblZlcnRpY2FsLFxuICAgICAgfTtcbiAgICB9XG4gICk7XG59XG5cbmZ1bmN0aW9uIGdldEhlYWRsaW5lc0FuZFNvdXJjZShwYWdlTm9kZTogUGFnZU5vZGUpIHtcbiAgY29uc3QgTk9ERV9OQU1FUyA9IFtcImhlYWRsaW5lXCIsIFwic3ViaGVhZFwiLCBcInNvdXJjZVwiXTtcblxuICBjb25zdCByZXN1bHQ6IHsgW2lkOiBzdHJpbmddOiBzdHJpbmcgfCB1bmRlZmluZWQgfSA9IHt9O1xuICBmb3IgKGNvbnN0IG5hbWUgb2YgTk9ERV9OQU1FUykge1xuICAgIGNvbnN0IG5vZGUgPSBwYWdlTm9kZS5maW5kQ2hpbGQoXG4gICAgICAobm9kZSkgPT4gbm9kZS5uYW1lID09PSBuYW1lICYmIG5vZGUudHlwZSA9PT0gXCJURVhUXCJcbiAgICApIGFzIFRleHROb2RlIHwgbnVsbDtcblxuICAgIHJlc3VsdFtuYW1lXSA9IG5vZGU/LmNoYXJhY3RlcnM7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5hc3luYyBmdW5jdGlvbiBzZXRIZWFkbGluZXNBbmRTb3VyY2UocHJvcHM6IHNldEhlYWRsaW5lc0FuZFNvdXJjZVByb3BzKSB7XG4gIGNvbnN0IHsgcGFnZU5vZGUgfSA9IHByb3BzO1xuICBjb25zdCBmcmFtZXMgPSBwYWdlTm9kZS5maW5kQ2hpbGRyZW4oKG5vZGUpID0+IG5vZGUudHlwZSA9PT0gXCJGUkFNRVwiKTtcbiAgY29uc3QgbW9zdExlZnRQb3MgPSBNYXRoLm1pbiguLi5mcmFtZXMubWFwKChub2RlKSA9PiBub2RlLngpKTtcbiAgY29uc3QgbW9zdFRvcFBvcyA9IE1hdGgubWluKC4uLmZyYW1lcy5tYXAoKG5vZGUpID0+IG5vZGUueSkpO1xuXG4gIE9iamVjdC52YWx1ZXMoSEVBRExJTkVfTk9ERV9OQU1FUykuZm9yRWFjaChhc3luYyAobmFtZSwgX2kpID0+IHtcbiAgICBsZXQgbm9kZSA9IHBhZ2VOb2RlLmZpbmRDaGlsZChcbiAgICAgIChub2RlKSA9PiBub2RlLm5hbWUgPT09IG5hbWUgJiYgbm9kZS50eXBlID09PSBcIlRFWFRcIlxuICAgICkgYXMgVGV4dE5vZGUgfCBudWxsO1xuICAgIGNvbnN0IHRleHRDb250ZW50ID0gcHJvcHNbbmFtZV07XG5cbiAgICAvLyBSZW1vdmUgbm9kZSBpZiB0aGVyZSdzIG5vIHRleHQgY29udGVudFxuICAgIGlmICghdGV4dENvbnRlbnQpIHtcbiAgICAgIGlmIChub2RlKSBub2RlLnJlbW92ZSgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIENyZWF0ZSBub2RlIGlmIGl0IGRvZXNuJ3QgZXhpc3RcbiAgICBpZiAoIW5vZGUpIHtcbiAgICAgIG5vZGUgPSBmaWdtYS5jcmVhdGVUZXh0KCk7XG4gICAgICBub2RlLm5hbWUgPSBuYW1lO1xuXG4gICAgICBsZXQgeSA9IG1vc3RUb3BQb3MgLSA2MDtcbiAgICAgIGlmIChuYW1lID09PSBIRUFETElORV9OT0RFX05BTUVTLkhFQURMSU5FKSB7XG4gICAgICAgIHkgLT0gNjA7XG4gICAgICB9IGVsc2UgaWYgKG5hbWUgPT09IEhFQURMSU5FX05PREVfTkFNRVMuU1VCSEVBRCkge1xuICAgICAgICB5IC09IDMwO1xuICAgICAgfVxuXG4gICAgICBub2RlLnJlbGF0aXZlVHJhbnNmb3JtID0gW1xuICAgICAgICBbMSwgMCwgbW9zdExlZnRQb3NdLFxuICAgICAgICBbMCwgMSwgeV0sXG4gICAgICBdO1xuICAgIH1cblxuICAgIC8vIEVuc3VyZSB0ZXh0IG5vZGUgaXMgbG9ja2VkXG4gICAgbm9kZS5sb2NrZWQgPSB0cnVlO1xuXG4gICAgLy8gTG9hZCBmb250XG4gICAgY29uc3QgZm9udE5hbWUgPVxuICAgICAgbm9kZS5mb250TmFtZSAhPT0gZmlnbWEubWl4ZWQgPyBub2RlLmZvbnROYW1lLmZhbWlseSA6IFwiUm9ib3RvXCI7XG4gICAgY29uc3QgZm9udFN0eWxlID1cbiAgICAgIG5vZGUuZm9udE5hbWUgIT09IGZpZ21hLm1peGVkID8gbm9kZS5mb250TmFtZS5zdHlsZSA6IFwiUmVndWxhclwiO1xuICAgIGF3YWl0IGZpZ21hLmxvYWRGb250QXN5bmMoeyBmYW1pbHk6IGZvbnROYW1lLCBzdHlsZTogZm9udFN0eWxlIH0pO1xuXG4gICAgLy8gU2V0IHRleHQgbm9kZSBjb250ZW50XG4gICAgbm9kZS5jaGFyYWN0ZXJzID0gcHJvcHNbbmFtZV0gfHwgXCJcIjtcbiAgfSk7XG59XG5cbi8vIEhhbmRsZSBtZXNzYWdlcyBmcm9tIHRoZSBVSVxuZnVuY3Rpb24gaGFuZGxlUmVjZWl2ZWRNc2cobXNnOiBQb3N0TXNnKSB7XG4gIHN3aXRjaCAobXNnLnR5cGUpIHtcbiAgICBjYXNlIE1TR19FVkVOVFMuRVJST1I6XG4gICAgICBjb25zb2xlLmxvZyhcInBsdWdpbiBtc2c6IGVycm9yXCIpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIE1TR19FVkVOVFMuQ0xPU0U6XG4gICAgICBjb25zb2xlLmxvZyhcInBsdWdpbiBtc2c6IGNsb3NlXCIpO1xuICAgICAgZmlnbWEuY2xvc2VQbHVnaW4oKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSBNU0dfRVZFTlRTLkRPTV9SRUFEWTpcbiAgICAgIGNvbnNvbGUubG9nKFwicGx1Z2luIG1zZzogRE9NIFJFQURZXCIpO1xuICAgICAgZ2V0Um9vdEZyYW1lcygpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIE1TR19FVkVOVFMuUkVOREVSOlxuICAgICAgY29uc3QgeyBmcmFtZUlkIH0gPSBtc2c7XG4gICAgICBjb25zb2xlLmxvZyhcInBsdWdpbiBtc2c6IHJlbmRlclwiLCBmcmFtZUlkKTtcbiAgICAgIGhhbmRsZVJlbmRlcihmcmFtZUlkKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSBNU0dfRVZFTlRTLlJFU0laRTpcbiAgICAgIGNvbnN0IHsgd2lkdGgsIGhlaWdodCB9ID0gbXNnO1xuICAgICAgY29uc29sZS5sb2coXCJwbHVnaW4gbXNnOiByZXNpemVcIik7XG4gICAgICBmaWdtYS51aS5yZXNpemUod2lkdGgsIGhlaWdodCk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgTVNHX0VWRU5UUy5VUERBVEVfSEVBRExJTkVTOlxuICAgICAgY29uc3QgeyBoZWFkbGluZSwgc3ViaGVhZCwgc291cmNlIH0gPSBtc2c7XG4gICAgICBzZXRIZWFkbGluZXNBbmRTb3VyY2Uoe1xuICAgICAgICBwYWdlTm9kZTogZmlnbWEuY3VycmVudFBhZ2UsXG4gICAgICAgIGhlYWRsaW5lLFxuICAgICAgICBzdWJoZWFkLFxuICAgICAgICBzb3VyY2UsXG4gICAgICB9KTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSBNU0dfRVZFTlRTLkNPTVBSRVNTRURfSU1BR0U6XG4gICAgICBoYW5kbGVDb21wcmVzc2VkTXNnKG1zZyk7XG4gICAgICBicmVhaztcblxuICAgIGRlZmF1bHQ6XG4gICAgICBjb25zb2xlLmVycm9yKFwiVW5rbm93biBwb3N0IG1lc3NhZ2VcIiwgbXNnKTtcbiAgfVxufVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7OztBQUFBLEFBQU8sTUFBSztBQUFMLFlBQUs7QUFDVjtBQUNBO0FBQ0E7QUFDQTtLQUpVO0FBT0wsTUFBSztBQUFMLFlBQUs7QUFDVjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtL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
