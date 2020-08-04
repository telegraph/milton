(() => {
  var __assign = Object.assign;

  // src/constants.ts
  var STAGES;
  (function(STAGES2) {
    STAGES2[STAGES2["CHOOSE_FRAMES"] = 0] = "CHOOSE_FRAMES";
    STAGES2[STAGES2["RESPONSIVE_PREVIEW"] = 1] = "RESPONSIVE_PREVIEW";
    STAGES2[STAGES2["SAVE_OUTPUT"] = 2] = "SAVE_OUTPUT";
  })(STAGES || (STAGES = {}));
  var MSG_EVENTS;
  (function(MSG_EVENTS3) {
    MSG_EVENTS3[MSG_EVENTS3["FOUND_FRAMES"] = 0] = "FOUND_FRAMES";
    MSG_EVENTS3[MSG_EVENTS3["NO_FRAMES"] = 1] = "NO_FRAMES";
    MSG_EVENTS3[MSG_EVENTS3["RENDER"] = 2] = "RENDER";
    MSG_EVENTS3[MSG_EVENTS3["CLOSE"] = 3] = "CLOSE";
    MSG_EVENTS3[MSG_EVENTS3["ERROR"] = 4] = "ERROR";
    MSG_EVENTS3[MSG_EVENTS3["UPDATE_HEADLINES"] = 5] = "UPDATE_HEADLINES";
    MSG_EVENTS3[MSG_EVENTS3["COMPRESS_IMAGE"] = 6] = "COMPRESS_IMAGE";
    MSG_EVENTS3[MSG_EVENTS3["GET_ROOT_FRAMES"] = 7] = "GET_ROOT_FRAMES";
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

  // src/utils/messages.ts
  class Postman {
    constructor(props) {
      this.TIMEOUT = 3e4;
      this.receive = async (event) => {
        var _a;
        const msgBody = this.inFigmaSandbox ? event : (_a = event == null ? void 0 : event.data) == null ? void 0 : _a.pluginMessage;
        const {data, workload, name, uid, returning, err} = msgBody || {};
        try {
          if (this.name !== name)
            return;
          if (returning && !this.callbackStore[uid]) {
            throw new Error(`Missing callback: ${uid}`);
          }
          if (!returning && !this.workers[workload]) {
            throw new Error(`No workload registered: ${workload}`);
          }
          if (returning) {
            this.callbackStore[uid](data, err);
          } else {
            const workloadResult = await this.workers[workload](data);
            this.postBack({data: workloadResult, uid});
          }
        } catch (err2) {
          this.postBack({uid, err: "Postman failed"});
          console.error("Postman failed", err2);
        }
      };
      this.registerWorker = (eventType, fn) => {
        this.workers[eventType] = fn;
      };
      this.postBack = (props) => this.postMessage({
        name: this.name,
        uid: props.uid,
        data: props.data,
        returning: true,
        err: props.err
      });
      this.postMessage = (messageBody) => this.inFigmaSandbox ? figma.ui.postMessage(messageBody) : parent.postMessage({pluginMessage: messageBody}, "*");
      this.send = (props) => {
        return new Promise((resolve, reject) => {
          const {workload, data} = props;
          const randomId = Math.random().toString(36).substr(5);
          this.postMessage({
            name: this.name,
            uid: randomId,
            workload,
            data
          });
          this.callbackStore[randomId] = (result, err) => {
            if (err) {
              reject(err);
            } else {
              resolve(result);
            }
          };
          setTimeout(() => reject(new Error("Timed out")), this.TIMEOUT);
        });
      };
      this.name = (props == null ? void 0 : props.messageName) || "POSTMAN";
      this.inFigmaSandbox = typeof figma === "object";
      this.callbackStore = {};
      this.workers = {};
      this.inFigmaSandbox ? figma.ui.on("message", this.receive) : window.addEventListener("message", this.receive);
    }
  }
  const postMan = new Postman();

  // src/helpers/figmaText.ts
  function getNodeText(rootNode, nodeName) {
    const foundNode = rootNode.findChild((node) => node.name === nodeName);
    return foundNode && foundNode.type === "TEXT" ? foundNode.characters : void 0;
  }
  var RANGE_TYPES;
  (function(RANGE_TYPES2) {
    RANGE_TYPES2[RANGE_TYPES2["LETTER_SPACING"] = 0] = "LETTER_SPACING";
    RANGE_TYPES2[RANGE_TYPES2["LINE_HEIGHT"] = 1] = "LINE_HEIGHT";
    RANGE_TYPES2[RANGE_TYPES2["FONT_SIZE"] = 2] = "FONT_SIZE";
    RANGE_TYPES2[RANGE_TYPES2["COLOUR"] = 3] = "COLOUR";
    RANGE_TYPES2[RANGE_TYPES2["FONT"] = 4] = "FONT";
  })(RANGE_TYPES || (RANGE_TYPES = {}));
  function getRangeVal(textNode, rangeType, start, end) {
    switch (rangeType) {
      case 0: {
        const letterSpace = textNode.getRangeLetterSpacing(start, end);
        if (letterSpace === figma.mixed) {
          return letterSpace;
        } else {
          return letterSpace.unit === "PERCENT" ? `${letterSpace.value / 100}rem` : `${letterSpace.value}px`;
        }
      }
      case 1: {
        const lineHeight = textNode.getRangeLineHeight(start, end);
        if (lineHeight === figma.mixed) {
          return lineHeight;
        } else if (lineHeight.unit === "AUTO") {
          return;
        } else {
          return lineHeight.unit === "PERCENT" ? `${lineHeight.value / 100}rem` : `${lineHeight.value}px`;
        }
      }
      case 2:
        return textNode.getRangeFontSize(start, end);
      case 3: {
        const paint = textNode.getRangeFills(start, end);
        if (paint === figma.mixed) {
          return paint;
        } else if (paint[0].type === "SOLID") {
          return __assign({}, paint[0].color);
        } else {
          return {r: 0, g: 0, b: 0};
        }
      }
      case 4:
        return textNode.getRangeFontName(start, end);
      default:
        return null;
    }
  }
  function getTypeValues(textNode, rangeType) {
    const {characters} = textNode;
    const fullRangeValue = getRangeVal(textNode, rangeType, 0, characters.length);
    if (fullRangeValue !== figma.mixed) {
      return [{start: 0, end: characters.length, value: fullRangeValue}];
    }
    const values = [
      {start: 0, end: 1, value: getRangeVal(textNode, rangeType, 0, 1)}
    ];
    for (let i = 1; i <= characters.length; i++) {
      const prop = values[values.length - 1];
      prop.end = i;
      const currentValue = getRangeVal(textNode, rangeType, prop.start, i);
      if (currentValue === figma.mixed) {
        prop.end = i - 1;
        values.push({
          start: i,
          end: i + 1,
          value: getRangeVal(textNode, rangeType, i - 1, i)
        });
      }
    }
    return values;
  }
  function findItemInRange(items, start, end) {
    return items.find((item) => start >= item.start && end <= item.end);
  }
  function getTextRangeValues(textNode) {
    var _a, _b, _c, _d, _e;
    const {characters} = textNode;
    const ranges = {
      letterSpace: getTypeValues(textNode, 0),
      lineHeight: getTypeValues(textNode, 1),
      size: getTypeValues(textNode, 2),
      colour: getTypeValues(textNode, 3),
      font: getTypeValues(textNode, 4)
    };
    console.log(ranges, "ranges");
    const ends = Object.values(ranges).flatMap((range) => range.map((item) => item.end)).sort((a, b) => a > b ? 1 : -1).filter((n, i, self2) => self2.indexOf(n) === i);
    const styles = [];
    let iStart = 0;
    for (let iEnd of ends) {
      if (iStart === iEnd) {
        iEnd++;
      }
      const style = {
        start: iStart,
        end: iEnd,
        chars: characters.substring(iStart, iEnd),
        font: (_a = findItemInRange(ranges.font, iStart + 1, iEnd)) == null ? void 0 : _a.value,
        colour: (_b = findItemInRange(ranges.colour, iStart + 1, iEnd)) == null ? void 0 : _b.value,
        size: (_c = findItemInRange(ranges.size, iStart + 1, iEnd)) == null ? void 0 : _c.value,
        letterSpace: (_d = findItemInRange(ranges.letterSpace, iStart + 1, iEnd)) == null ? void 0 : _d.value,
        lineHeight: (_e = findItemInRange(ranges.lineHeight, iStart + 1, iEnd)) == null ? void 0 : _e.value
      };
      styles.push(style);
      iStart = iEnd;
    }
    return styles;
  }
  function getTextNodesFromFrame(frame) {
    const textNodes = frame.findAll(({type}) => type === "TEXT");
    const {absoluteTransform} = frame;
    const rootX = absoluteTransform[0][2];
    const rootY = absoluteTransform[1][2];
    const textCollection = [];
    for (const textNode of textNodes) {
      const {absoluteTransform: absoluteTransform2, width: width2, height: height2, characters} = textNode;
      const textX = absoluteTransform2[0][2];
      const textY = absoluteTransform2[1][2];
      const x = textX - rootX;
      const y = textY - rootY;
      const rangeStyles = getTextRangeValues(textNode);
      textCollection.push({
        x,
        y,
        width: width2,
        height: height2,
        characters,
        rangeStyles
      });
    }
    return textCollection;
  }

  // src/helpers.ts
  function supportsFills(node) {
    return node.type !== "SLICE" && node.type !== "GROUP";
  }
  async function renderFrames(frameIds) {
    const outputNode = figma.createFrame();
    outputNode.name = "output";
    try {
      const frames = figma.currentPage.children.filter(({id}) => frameIds.includes(id));
      const maxWidth = Math.max(...frames.map((f) => f.width));
      const maxHeight = Math.max(...frames.map((f) => f.height));
      outputNode.resizeWithoutConstraints(maxWidth, maxHeight);
      for (const frame of frames) {
        const clone = frame == null ? void 0 : frame.clone();
        clone.findAll((n) => n.type === "TEXT").forEach((n) => n.remove());
        outputNode.appendChild(clone);
        clone.x = 0;
        clone.y = 0;
        clone.name = frame.id;
      }
      const nodesWithImages = outputNode.findAll((node) => supportsFills(node) && node.fills !== figma.mixed && node.fills.some((fill) => fill.type === "IMAGE"));
      const imageCache = {};
      for (const node of nodesWithImages) {
        if (supportsFills(node) && node.fills !== figma.mixed) {
          const dimensions = {
            width: node.width,
            height: node.height,
            id: node.id
          };
          const imgPaint = [...node.fills].find((p) => p.type === "IMAGE");
          if ((imgPaint == null ? void 0 : imgPaint.type) === "IMAGE" && imgPaint.imageHash) {
            if (imageCache[imgPaint.imageHash]) {
              imageCache[imgPaint.imageHash].push(dimensions);
            } else {
              imageCache[imgPaint.imageHash] = [dimensions];
            }
          }
        }
      }
      for (const imageHash in imageCache) {
        const bytes = await figma.getImageByHash(imageHash).getBytesAsync();
        const compressedImage = await postMan.send({
          workload: MSG_EVENTS.COMPRESS_IMAGE,
          data: {
            imgData: bytes,
            nodeDimensions: imageCache[imageHash]
          }
        });
        const newImageHash = figma.createImage(compressedImage).hash;
        nodesWithImages.forEach((node) => {
          if (supportsFills(node) && node.fills !== figma.mixed) {
            const imgPaint = [...node.fills].find((p) => p.type === "IMAGE" && p.imageHash === imageHash);
            if (imgPaint) {
              const newPaint = JSON.parse(JSON.stringify(imgPaint));
              newPaint.imageHash = newImageHash;
              node.fills = [newPaint];
            }
          }
        });
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
      const svg = await outputNode.exportAsync({
        format: "SVG",
        svgSimplifyStroke: true,
        svgOutlineText: false,
        svgIdAttribute: true
      });
      return svg;
    } catch (err) {
      throw new Error(err);
    } finally {
      outputNode.remove();
    }
  }
  function setHeadlinesAndSource(props) {
    const pageNode = figma.currentPage;
    const frames = pageNode.findChildren((node) => node.type === "FRAME");
    const mostLeftPos = Math.min(...frames.map((node) => node.x));
    const mostTopPos = Math.min(...frames.map((node) => node.y));
    for (const name of Object.values(HEADLINE_NODE_NAMES)) {
      let node = pageNode.findChild((node2) => node2.name === name && node2.type === "TEXT") || null;
      const textContent = props[name];
      if (node && !textContent) {
        node.remove();
        return;
      }
      if (!textContent) {
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
      figma.loadFontAsync({family: fontName, style: fontStyle}).then(() => {
        node.characters = props[name] || "";
      }).catch((err) => {
        console.error("Failed to load font", err);
      });
    }
  }
  function getRootFrames() {
    const {currentPage} = figma;
    const rootFrames = currentPage.children.filter((node) => node.type === "FRAME");
    const framesData = rootFrames.map((frame) => {
      const {name, width: width2, height: height2, id} = frame;
      const textNodes = getTextNodesFromFrame(frame);
      return {
        name,
        width: width2,
        height: height2,
        id,
        textNodes
      };
    });
    return {
      frames: framesData,
      headline: getNodeText(currentPage, HEADLINE_NODE_NAMES.HEADLINE),
      subhead: getNodeText(currentPage, HEADLINE_NODE_NAMES.HEADLINE),
      source: getNodeText(currentPage, HEADLINE_NODE_NAMES.HEADLINE)
    };
  }

  // src/index.tsx
  postMan.registerWorker(MSG_EVENTS.GET_ROOT_FRAMES, getRootFrames);
  postMan.registerWorker(MSG_EVENTS.RENDER, renderFrames);
  postMan.registerWorker(MSG_EVENTS.UPDATE_HEADLINES, setHeadlinesAndSource);
  figma.showUI(__html__);
  const {width, height} = figma.viewport.bounds;
  const {zoom} = figma.viewport;
  const initialWindowWidth = Math.round(width * zoom);
  const initialWindowHeight = Math.round(height * zoom);
  figma.ui.resize(initialWindowWidth, initialWindowHeight);
})();
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL2NvbnN0YW50cy50cyIsICJzcmMvdXRpbHMvbWVzc2FnZXMudHMiLCAic3JjL2hlbHBlcnMvZmlnbWFUZXh0LnRzIiwgInNyYy9oZWxwZXJzLnRzIiwgInNyYy9pbmRleC50c3giXSwKICAic291cmNlc0NvbnRlbnQiOiBbImV4cG9ydCBlbnVtIFNUQUdFUyB7XG4gIENIT09TRV9GUkFNRVMsXG4gIFJFU1BPTlNJVkVfUFJFVklFVyxcbiAgU0FWRV9PVVRQVVQsXG59XG5cbmV4cG9ydCBlbnVtIE1TR19FVkVOVFMge1xuICBGT1VORF9GUkFNRVMsXG4gIE5PX0ZSQU1FUyxcbiAgUkVOREVSLFxuICBDTE9TRSxcbiAgRVJST1IsXG4gIFVQREFURV9IRUFETElORVMsXG4gIENPTVBSRVNTX0lNQUdFLFxuICBHRVRfUk9PVF9GUkFNRVMsXG59XG5cbmV4cG9ydCBlbnVtIE9VVFBVVF9GT1JNQVRTIHtcbiAgSU5MSU5FLFxuICBJRlJBTUUsXG59XG5cbmV4cG9ydCBjb25zdCBVSV9URVhUID0ge1xuICBFUlJPUl9VTkVYUEVDVEVEOiBcIlVuZXhwZWN0ZWQgZXJyb3JcIixcbiAgRVJST1JfTUlTU0lOR19GUkFNRVM6IFwiTm8gZnJhbWVzIGZvdW5kLiBQbGVhc2UgYWRkIHNvbWUgZnJhbWVzIHRvIHRoZSBwYWdlLlwiLFxuICBXQVJOX05PX1RBUkdFVFM6IFwiU3RhbmRhcmQgZnJhbWVzIG5vdCBmb3VuZC4gUGxlYXNlIHNlbGVjdCB0YXJnZXQgZnJhbWVzLlwiLFxuICBXQVJOX1RPT19NQU5ZX1RBUkdFVFM6IFwiUGxlYXNlIHNlbGVjdCB0aHJlZSB0YXJnZXQgZnJhbWVzXCIsXG4gIElORk9fUFJFVklFVzogXCJQcmV2aWV3IGVhY2ggZnJhbWUgb3V0cHV0XCIsXG4gIFRJVExFX0NIT09TRV9GUkFNRTogXCJDaG9vc2Ugd2hpY2ggZnJhbWVzIHRvIGV4cG9ydFwiLFxuICBUSVRMRV9QUkVWSUVXOiBcIlByZXZpZXdcIixcbiAgVElUTEVfUkVTUE9OU0lWRV9QUkVWSUVXOiBcIlJlc3BvbnNpdmUgcHJldmlld1wiLFxuICBUSUxFX09VVFBVVDogXCJFeHBvcnRcIixcbiAgQlVUVE9OX05FWFQ6IFwiTmV4dFwiLFxuICBCVVRUT05fRE9XTkxPQUQ6IFwiRG93bmxvYWRcIixcbiAgQlVUVE9OX1BSRVZJT1VTOiBcIkJhY2tcIixcbn07XG5cbmV4cG9ydCBjb25zdCBGUkFNRV9XQVJOSU5HX1NJWkUgPSAzMDA7XG5cbmV4cG9ydCBlbnVtIEhFQURMSU5FX05PREVfTkFNRVMge1xuICBIRUFETElORSA9IFwiaGVhZGxpbmVcIixcbiAgU1VCSEVBRCA9IFwic3ViaGVhZFwiLFxuICBTT1VSQ0UgPSBcInNvdXJjZVwiLFxufVxuIiwgImltcG9ydCB7IE1TR19FVkVOVFMgfSBmcm9tIFwiLi4vY29uc3RhbnRzXCI7XG5cbmludGVyZmFjZSBJUG9zdG1hbk1lc3NhZ2Uge1xuICBuYW1lOiBzdHJpbmc7XG4gIHVpZDogc3RyaW5nO1xuICB3b3JrbG9hZDogTVNHX0VWRU5UUztcbiAgZGF0YTogYW55O1xuICByZXR1cm5pbmc/OiBib29sZWFuO1xuICBlcnI/OiBzdHJpbmc7XG59XG5cbmNsYXNzIFBvc3RtYW4ge1xuICBwcml2YXRlIG5hbWU6IHN0cmluZztcbiAgcHJpdmF0ZSBpbkZpZ21hU2FuZGJveDogYm9vbGVhbjtcbiAgcHJpdmF0ZSBjYWxsYmFja1N0b3JlOiB7IFtpZDogc3RyaW5nXTogRnVuY3Rpb24gfTtcbiAgcHJpdmF0ZSB3b3JrZXJzOiB7IFtpZDogc3RyaW5nXTogRnVuY3Rpb24gfTtcblxuICBwcml2YXRlIFRJTUVPVVQgPSAzMDAwMDtcblxuICBjb25zdHJ1Y3Rvcihwcm9wcz86IHsgbWVzc2FnZU5hbWU/OiBzdHJpbmc7IHNjb3BlOiBudWxsIH0pIHtcbiAgICB0aGlzLm5hbWUgPSBwcm9wcz8ubWVzc2FnZU5hbWUgfHwgXCJQT1NUTUFOXCI7XG4gICAgdGhpcy5pbkZpZ21hU2FuZGJveCA9IHR5cGVvZiBmaWdtYSA9PT0gXCJvYmplY3RcIjtcbiAgICB0aGlzLmNhbGxiYWNrU3RvcmUgPSB7fTtcbiAgICB0aGlzLndvcmtlcnMgPSB7fTtcblxuICAgIC8vIEFkZCBtZXNzYWdlIGV2ZW50IGxpc3RlbmVyXG4gICAgdGhpcy5pbkZpZ21hU2FuZGJveFxuICAgICAgPyBmaWdtYS51aS5vbihcIm1lc3NhZ2VcIiwgdGhpcy5yZWNlaXZlKVxuICAgICAgOiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgdGhpcy5yZWNlaXZlKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVjZWl2ZSA9IGFzeW5jIChldmVudDogTWVzc2FnZUV2ZW50PElQb3N0bWFuTWVzc2FnZT4pID0+IHtcbiAgICBjb25zdCBtc2dCb2R5ID0gdGhpcy5pbkZpZ21hU2FuZGJveCA/IGV2ZW50IDogZXZlbnQ/LmRhdGE/LnBsdWdpbk1lc3NhZ2U7XG4gICAgY29uc3QgeyBkYXRhLCB3b3JrbG9hZCwgbmFtZSwgdWlkLCByZXR1cm5pbmcsIGVyciB9ID0gbXNnQm9keSB8fCB7fTtcblxuICAgIHRyeSB7XG4gICAgICAvLyBEbyBub3RoaW5nIGlkIHBvc3QgbWVzc2FnZSBpc24ndCBmb3IgdXNcbiAgICAgIGlmICh0aGlzLm5hbWUgIT09IG5hbWUpIHJldHVybjtcblxuICAgICAgaWYgKHJldHVybmluZyAmJiAhdGhpcy5jYWxsYmFja1N0b3JlW3VpZF0pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIGNhbGxiYWNrOiAke3VpZH1gKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFyZXR1cm5pbmcgJiYgIXRoaXMud29ya2Vyc1t3b3JrbG9hZF0pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyB3b3JrbG9hZCByZWdpc3RlcmVkOiAke3dvcmtsb2FkfWApO1xuICAgICAgfVxuXG4gICAgICBpZiAocmV0dXJuaW5nKSB7XG4gICAgICAgIHRoaXMuY2FsbGJhY2tTdG9yZVt1aWRdKGRhdGEsIGVycik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCB3b3JrbG9hZFJlc3VsdCA9IGF3YWl0IHRoaXMud29ya2Vyc1t3b3JrbG9hZF0oZGF0YSk7XG4gICAgICAgIHRoaXMucG9zdEJhY2soeyBkYXRhOiB3b3JrbG9hZFJlc3VsdCwgdWlkIH0pO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgdGhpcy5wb3N0QmFjayh7IHVpZCwgZXJyOiBcIlBvc3RtYW4gZmFpbGVkXCIgfSk7XG4gICAgICBjb25zb2xlLmVycm9yKFwiUG9zdG1hbiBmYWlsZWRcIiwgZXJyKTtcbiAgICB9XG4gIH07XG5cbiAgcHVibGljIHJlZ2lzdGVyV29ya2VyID0gKGV2ZW50VHlwZTogTVNHX0VWRU5UUywgZm46IEZ1bmN0aW9uKSA9PiB7XG4gICAgdGhpcy53b3JrZXJzW2V2ZW50VHlwZV0gPSBmbjtcbiAgfTtcblxuICBwcml2YXRlIHBvc3RCYWNrID0gKHByb3BzOiB7IHVpZDogc3RyaW5nOyBkYXRhPzogYW55OyBlcnI/OiBzdHJpbmcgfSkgPT5cbiAgICB0aGlzLnBvc3RNZXNzYWdlKHtcbiAgICAgIG5hbWU6IHRoaXMubmFtZSxcbiAgICAgIHVpZDogcHJvcHMudWlkLFxuICAgICAgZGF0YTogcHJvcHMuZGF0YSxcbiAgICAgIHJldHVybmluZzogdHJ1ZSxcbiAgICAgIGVycjogcHJvcHMuZXJyLFxuICAgIH0pO1xuXG4gIHByaXZhdGUgcG9zdE1lc3NhZ2UgPSAobWVzc2FnZUJvZHkpID0+XG4gICAgdGhpcy5pbkZpZ21hU2FuZGJveFxuICAgICAgPyBmaWdtYS51aS5wb3N0TWVzc2FnZShtZXNzYWdlQm9keSlcbiAgICAgIDogcGFyZW50LnBvc3RNZXNzYWdlKHsgcGx1Z2luTWVzc2FnZTogbWVzc2FnZUJvZHkgfSwgXCIqXCIpO1xuXG4gIHB1YmxpYyBzZW5kID0gKHByb3BzOiB7IHdvcmtsb2FkOiBNU0dfRVZFTlRTOyBkYXRhPzogYW55IH0pOiBQcm9taXNlPGFueT4gPT4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCB7IHdvcmtsb2FkLCBkYXRhIH0gPSBwcm9wcztcblxuICAgICAgY29uc3QgcmFuZG9tSWQgPSBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHIoNSk7XG5cbiAgICAgIHRoaXMucG9zdE1lc3NhZ2Uoe1xuICAgICAgICBuYW1lOiB0aGlzLm5hbWUsXG4gICAgICAgIHVpZDogcmFuZG9tSWQsXG4gICAgICAgIHdvcmtsb2FkLFxuICAgICAgICBkYXRhLFxuICAgICAgfSBhcyBJUG9zdG1hbk1lc3NhZ2UpO1xuXG4gICAgICB0aGlzLmNhbGxiYWNrU3RvcmVbcmFuZG9tSWRdID0gKHJlc3VsdDogYW55LCBlcnI/OiBzdHJpbmcpID0+IHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgc2V0VGltZW91dCgoKSA9PiByZWplY3QobmV3IEVycm9yKFwiVGltZWQgb3V0XCIpKSwgdGhpcy5USU1FT1VUKTtcbiAgICB9KTtcbiAgfTtcbn1cblxuZXhwb3J0IGNvbnN0IHBvc3RNYW4gPSBuZXcgUG9zdG1hbigpO1xuIiwgImltcG9ydCB7IHRleHREYXRhLCBJVGV4dFByb3BSYW5nZSB9IGZyb20gXCJ0eXBlc1wiO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Tm9kZVRleHQoXG4gIHJvb3ROb2RlOiBQYWdlTm9kZSxcbiAgbm9kZU5hbWU6IHN0cmluZ1xuKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgZm91bmROb2RlID0gcm9vdE5vZGUuZmluZENoaWxkKChub2RlKSA9PiBub2RlLm5hbWUgPT09IG5vZGVOYW1lKTtcbiAgcmV0dXJuIGZvdW5kTm9kZSAmJiBmb3VuZE5vZGUudHlwZSA9PT0gXCJURVhUXCJcbiAgICA/IGZvdW5kTm9kZS5jaGFyYWN0ZXJzXG4gICAgOiB1bmRlZmluZWQ7XG59XG5cbmZ1bmN0aW9uIGNhbGN1bGF0ZUxldHRlclNwYWNpbmcoXG4gIGZvbnRGYW1pbHk6IHN0cmluZyxcbiAgbGV0dGVyU3BhY2luZzogTGV0dGVyU3BhY2luZ1xuKSB7XG4gIGNvbnN0IHsgdW5pdDogbGV0dGVyVW5pdCwgdmFsdWU6IGxldHRlclZhbCB9ID0gbGV0dGVyU3BhY2luZztcbiAgbGV0IGxldHRlclNwYWNlVmFsdWUgPSBcIjBcIjtcblxuICBzd2l0Y2ggKGxldHRlclVuaXQpIHtcbiAgICBjYXNlIFwiUElYRUxTXCI6XG4gICAgICAvLyBUT0RPOiBGSVggTUVcbiAgICAgIGlmIChmb250RmFtaWx5ID09PSBcIlRlbGVzYW5zIFRleHRcIikge1xuICAgICAgICBsZXR0ZXJTcGFjZVZhbHVlID0gYCR7bGV0dGVyVmFsIC0gMC4zM31weGA7XG4gICAgICB9IGVsc2UgaWYgKGZvbnRGYW1pbHkgPT09IFwiVGVsZXNhbnMgQWdhdGVcIikge1xuICAgICAgICBsZXR0ZXJTcGFjZVZhbHVlID0gYCR7bGV0dGVyVmFsIC0gMC4xOX1weGA7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsZXR0ZXJTcGFjZVZhbHVlID0gYCR7bGV0dGVyVmFsfXB4YDtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgXCJQRVJDRU5UXCI6XG4gICAgICBsZXR0ZXJTcGFjZVZhbHVlID0gYCR7bGV0dGVyVmFsIC8gMTAwfWVtYDtcblxuICAgICAgaWYgKGZvbnRGYW1pbHkgPT09IFwiVGVsZXNhbnMgVGV4dFwiKSB7XG4gICAgICAgIGxldHRlclNwYWNlVmFsdWUgPSBgJHtsZXR0ZXJWYWwgLyAxMDAgLSAwLjAyMn1lbWA7XG4gICAgICB9IGVsc2UgaWYgKGZvbnRGYW1pbHkgPT09IFwiVGVsZXNhbnMgQWdhdGVcIikge1xuICAgICAgICBsZXR0ZXJTcGFjZVZhbHVlID0gYCR7bGV0dGVyVmFsIC8gMTAwIC0gMC4wMTV9ZW1gO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGV0dGVyU3BhY2VWYWx1ZSA9IGAke2xldHRlclZhbCAvIDEwMH1lbWA7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgaWYgKGZvbnRGYW1pbHkgPT09IFwiVGVsZXNhbnMgVGV4dFwiKSB7XG4gICAgICAgIGxldHRlclNwYWNlVmFsdWUgPSBcIi0wLjM3cHhcIjtcbiAgICAgIH0gZWxzZSBpZiAoZm9udEZhbWlseSA9PT0gXCJUZWxlc2FucyBBZ2F0ZVwiKSB7XG4gICAgICAgIGxldHRlclNwYWNlVmFsdWUgPSBcIi0wLjE5cHhcIjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxldHRlclNwYWNlVmFsdWUgPSBgMGA7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgfVxuXG4gIHJldHVybiBsZXR0ZXJTcGFjZVZhbHVlO1xufVxuXG5lbnVtIFJBTkdFX1RZUEVTIHtcbiAgTEVUVEVSX1NQQUNJTkcsXG4gIExJTkVfSEVJR0hULFxuICBGT05UX1NJWkUsXG4gIENPTE9VUixcbiAgRk9OVCxcbn1cblxuZnVuY3Rpb24gZ2V0UmFuZ2VWYWwoXG4gIHRleHROb2RlOiBUZXh0Tm9kZSxcbiAgcmFuZ2VUeXBlOiBSQU5HRV9UWVBFUyxcbiAgc3RhcnQ6IG51bWJlcixcbiAgZW5kOiBudW1iZXJcbikge1xuICBzd2l0Y2ggKHJhbmdlVHlwZSkge1xuICAgIGNhc2UgUkFOR0VfVFlQRVMuTEVUVEVSX1NQQUNJTkc6IHtcbiAgICAgIGNvbnN0IGxldHRlclNwYWNlID0gdGV4dE5vZGUuZ2V0UmFuZ2VMZXR0ZXJTcGFjaW5nKHN0YXJ0LCBlbmQpO1xuICAgICAgaWYgKGxldHRlclNwYWNlID09PSBmaWdtYS5taXhlZCkge1xuICAgICAgICByZXR1cm4gbGV0dGVyU3BhY2U7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbGV0dGVyU3BhY2UudW5pdCA9PT0gXCJQRVJDRU5UXCJcbiAgICAgICAgICA/IGAke2xldHRlclNwYWNlLnZhbHVlIC8gMTAwfXJlbWBcbiAgICAgICAgICA6IGAke2xldHRlclNwYWNlLnZhbHVlfXB4YDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjYXNlIFJBTkdFX1RZUEVTLkxJTkVfSEVJR0hUOiB7XG4gICAgICBjb25zdCBsaW5lSGVpZ2h0ID0gdGV4dE5vZGUuZ2V0UmFuZ2VMaW5lSGVpZ2h0KHN0YXJ0LCBlbmQpO1xuICAgICAgaWYgKGxpbmVIZWlnaHQgPT09IGZpZ21hLm1peGVkKSB7XG4gICAgICAgIHJldHVybiBsaW5lSGVpZ2h0O1xuICAgICAgfSBlbHNlIGlmIChsaW5lSGVpZ2h0LnVuaXQgPT09IFwiQVVUT1wiKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBsaW5lSGVpZ2h0LnVuaXQgPT09IFwiUEVSQ0VOVFwiXG4gICAgICAgICAgPyBgJHtsaW5lSGVpZ2h0LnZhbHVlIC8gMTAwfXJlbWBcbiAgICAgICAgICA6IGAke2xpbmVIZWlnaHQudmFsdWV9cHhgO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNhc2UgUkFOR0VfVFlQRVMuRk9OVF9TSVpFOlxuICAgICAgcmV0dXJuIHRleHROb2RlLmdldFJhbmdlRm9udFNpemUoc3RhcnQsIGVuZCk7XG5cbiAgICBjYXNlIFJBTkdFX1RZUEVTLkNPTE9VUjoge1xuICAgICAgY29uc3QgcGFpbnQgPSB0ZXh0Tm9kZS5nZXRSYW5nZUZpbGxzKHN0YXJ0LCBlbmQpO1xuICAgICAgaWYgKHBhaW50ID09PSBmaWdtYS5taXhlZCkge1xuICAgICAgICByZXR1cm4gcGFpbnQ7XG4gICAgICB9IGVsc2UgaWYgKHBhaW50WzBdLnR5cGUgPT09IFwiU09MSURcIikge1xuICAgICAgICByZXR1cm4geyAuLi5wYWludFswXS5jb2xvciB9O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHsgcjogMCwgZzogMCwgYjogMCB9O1xuICAgICAgfVxuICAgIH1cblxuICAgIGNhc2UgUkFOR0VfVFlQRVMuRk9OVDpcbiAgICAgIHJldHVybiB0ZXh0Tm9kZS5nZXRSYW5nZUZvbnROYW1lKHN0YXJ0LCBlbmQpO1xuXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldFR5cGVWYWx1ZXMoXG4gIHRleHROb2RlOiBUZXh0Tm9kZSxcbiAgcmFuZ2VUeXBlOiBSQU5HRV9UWVBFU1xuKTogSVRleHRQcm9wUmFuZ2VbXSB7XG4gIGNvbnN0IHsgY2hhcmFjdGVycyB9ID0gdGV4dE5vZGU7XG5cbiAgLy8gSWYgdGhlcmUncyBubyBtaXhlZCBzdHlsZSB0aGVuIHNob3J0IGNpcmN1aXQgcmVzcG9uc2VcbiAgY29uc3QgZnVsbFJhbmdlVmFsdWUgPSBnZXRSYW5nZVZhbCh0ZXh0Tm9kZSwgcmFuZ2VUeXBlLCAwLCBjaGFyYWN0ZXJzLmxlbmd0aCk7XG4gIGlmIChmdWxsUmFuZ2VWYWx1ZSAhPT0gZmlnbWEubWl4ZWQpIHtcbiAgICByZXR1cm4gW3sgc3RhcnQ6IDAsIGVuZDogY2hhcmFjdGVycy5sZW5ndGgsIHZhbHVlOiBmdWxsUmFuZ2VWYWx1ZSB9XTtcbiAgfVxuXG4gIC8vIFRoZXJlJ3MgbWl4ZWQgc3R5bGVzLiBHbyB0aHJvdWdoIGVhY2ggY2hhciB0byBleHRyYWN0IHN0eWxlIHJhbmdlc1xuICAvLyBCb290c3RyYXAgcmFuZ2UgdmFsdWVzIHdpdGggZmlyc3QgY2hhcmFjdGVyIHdoaWNoIGlzIG5ldmVyIG1peGVkIHR5cGVcbiAgY29uc3QgdmFsdWVzOiBJVGV4dFByb3BSYW5nZVtdID0gW1xuICAgIHsgc3RhcnQ6IDAsIGVuZDogMSwgdmFsdWU6IGdldFJhbmdlVmFsKHRleHROb2RlLCByYW5nZVR5cGUsIDAsIDEpIH0sXG4gIF07XG5cbiAgLy8gTG9vcCB0aHJvdWdoIGVhY2ggY2hhcmFjdGVyIHRvIGZpbmQgcmFuZ2VzLlxuICAvLyBXaGVuIGEgbWl4ZWQgcmFuZ2UgaXMgZm91bmQgdXBkYXRlIHRoZSBjdXJyZW50IGVuZCBwb3NpdGlvbiBhbmRcbiAgLy8gY3JlYXRlIGEgbmV3IHJhbmdlIHdpdGggdGhlIG5leHQgc3R5bGVcbiAgZm9yIChsZXQgaSA9IDE7IGkgPD0gY2hhcmFjdGVycy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IHByb3AgPSB2YWx1ZXNbdmFsdWVzLmxlbmd0aCAtIDFdO1xuXG4gICAgLy8gVXBkYXRlIGVuZCBwb3NpdGlvbiBvZiBjdXJyZW50IHN0eWxlXG4gICAgcHJvcC5lbmQgPSBpO1xuXG4gICAgY29uc3QgY3VycmVudFZhbHVlID0gZ2V0UmFuZ2VWYWwodGV4dE5vZGUsIHJhbmdlVHlwZSwgcHJvcC5zdGFydCwgaSk7XG5cbiAgICBpZiAoY3VycmVudFZhbHVlID09PSBmaWdtYS5taXhlZCkge1xuICAgICAgLy8gU2V0IGVuZCBvZiB0aGUgY3VycmVudCByYW5nZVxuICAgICAgcHJvcC5lbmQgPSBpIC0gMTtcblxuICAgICAgLy8gQ3JlYXRlIGFuZCBzdG9yZSBuZXh0IHJhbmdlIHN0eWxlXG4gICAgICB2YWx1ZXMucHVzaCh7XG4gICAgICAgIHN0YXJ0OiBpLFxuICAgICAgICBlbmQ6IGkgKyAxLFxuICAgICAgICB2YWx1ZTogZ2V0UmFuZ2VWYWwodGV4dE5vZGUsIHJhbmdlVHlwZSwgaSAtIDEsIGkpLFxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHZhbHVlcztcbn1cblxuZnVuY3Rpb24gZmluZEl0ZW1JblJhbmdlKGl0ZW1zOiBhbnlbXSwgc3RhcnQ6IG51bWJlciwgZW5kOiBudW1iZXIpOiBhbnkge1xuICByZXR1cm4gaXRlbXMuZmluZCgoaXRlbSkgPT4gc3RhcnQgPj0gaXRlbS5zdGFydCAmJiBlbmQgPD0gaXRlbS5lbmQpO1xufVxuXG5mdW5jdGlvbiBnZXRUZXh0UmFuZ2VWYWx1ZXModGV4dE5vZGU6IFRleHROb2RlKSB7XG4gIGNvbnN0IHsgY2hhcmFjdGVycyB9ID0gdGV4dE5vZGU7XG5cbiAgY29uc3QgcmFuZ2VzID0ge1xuICAgIGxldHRlclNwYWNlOiBnZXRUeXBlVmFsdWVzKHRleHROb2RlLCBSQU5HRV9UWVBFUy5MRVRURVJfU1BBQ0lORyksXG4gICAgbGluZUhlaWdodDogZ2V0VHlwZVZhbHVlcyh0ZXh0Tm9kZSwgUkFOR0VfVFlQRVMuTElORV9IRUlHSFQpLFxuICAgIHNpemU6IGdldFR5cGVWYWx1ZXModGV4dE5vZGUsIFJBTkdFX1RZUEVTLkZPTlRfU0laRSksXG4gICAgY29sb3VyOiBnZXRUeXBlVmFsdWVzKHRleHROb2RlLCBSQU5HRV9UWVBFUy5DT0xPVVIpLFxuICAgIGZvbnQ6IGdldFR5cGVWYWx1ZXModGV4dE5vZGUsIFJBTkdFX1RZUEVTLkZPTlQpLFxuICB9O1xuXG4gIGNvbnNvbGUubG9nKHJhbmdlcywgXCJyYW5nZXNcIik7XG5cbiAgLy8gQ29sbGVjdCBhbGwgZW5kIGluZGV4ZWQsIHNvcnQgYWNjZW5kaW5nIGFuZCByZW1vdmUgZHVwbGljYXRlc1xuICBjb25zdCBlbmRzID0gT2JqZWN0LnZhbHVlcyhyYW5nZXMpXG4gICAgLmZsYXRNYXAoKHJhbmdlKSA9PiByYW5nZS5tYXAoKGl0ZW0pID0+IGl0ZW0uZW5kKSlcbiAgICAuc29ydCgoYSwgYikgPT4gKGEgPiBiID8gMSA6IC0xKSlcbiAgICAuZmlsdGVyKChuLCBpLCBzZWxmKSA9PiBzZWxmLmluZGV4T2YobikgPT09IGkpO1xuXG4gIC8vIFRPRE86IFNpbXBsaWZ5IGVuZCBpbmRleCBsb2dpY1xuICBjb25zdCBzdHlsZXMgPSBbXTtcbiAgbGV0IGlTdGFydCA9IDA7XG4gIGZvciAobGV0IGlFbmQgb2YgZW5kcykge1xuICAgIGlmIChpU3RhcnQgPT09IGlFbmQpIHtcbiAgICAgIGlFbmQrKztcbiAgICB9XG5cbiAgICBjb25zdCBzdHlsZSA9IHtcbiAgICAgIHN0YXJ0OiBpU3RhcnQsXG4gICAgICBlbmQ6IGlFbmQsXG4gICAgICBjaGFyczogY2hhcmFjdGVycy5zdWJzdHJpbmcoaVN0YXJ0LCBpRW5kKSxcbiAgICAgIGZvbnQ6IGZpbmRJdGVtSW5SYW5nZShyYW5nZXMuZm9udCwgaVN0YXJ0ICsgMSwgaUVuZCk/LnZhbHVlLFxuICAgICAgY29sb3VyOiBmaW5kSXRlbUluUmFuZ2UocmFuZ2VzLmNvbG91ciwgaVN0YXJ0ICsgMSwgaUVuZCk/LnZhbHVlLFxuICAgICAgc2l6ZTogZmluZEl0ZW1JblJhbmdlKHJhbmdlcy5zaXplLCBpU3RhcnQgKyAxLCBpRW5kKT8udmFsdWUsXG4gICAgICBsZXR0ZXJTcGFjZTogZmluZEl0ZW1JblJhbmdlKHJhbmdlcy5sZXR0ZXJTcGFjZSwgaVN0YXJ0ICsgMSwgaUVuZCk/LnZhbHVlLFxuICAgICAgbGluZUhlaWdodDogZmluZEl0ZW1JblJhbmdlKHJhbmdlcy5saW5lSGVpZ2h0LCBpU3RhcnQgKyAxLCBpRW5kKT8udmFsdWUsXG4gICAgfTtcblxuICAgIHN0eWxlcy5wdXNoKHN0eWxlKTtcbiAgICBpU3RhcnQgPSBpRW5kO1xuICB9XG5cbiAgcmV0dXJuIHN0eWxlcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFRleHROb2Rlc0Zyb21GcmFtZShmcmFtZTogRnJhbWVOb2RlKTogdGV4dERhdGFbXSB7XG4gIGNvbnN0IHRleHROb2RlcyA9IGZyYW1lLmZpbmRBbGwoKHsgdHlwZSB9KSA9PiB0eXBlID09PSBcIlRFWFRcIikgYXMgVGV4dE5vZGVbXTtcbiAgY29uc3QgeyBhYnNvbHV0ZVRyYW5zZm9ybSB9ID0gZnJhbWU7XG4gIGNvbnN0IHJvb3RYID0gYWJzb2x1dGVUcmFuc2Zvcm1bMF1bMl07XG4gIGNvbnN0IHJvb3RZID0gYWJzb2x1dGVUcmFuc2Zvcm1bMV1bMl07XG5cbiAgY29uc3QgdGV4dENvbGxlY3Rpb246IHRleHREYXRhW10gPSBbXTtcbiAgZm9yIChjb25zdCB0ZXh0Tm9kZSBvZiB0ZXh0Tm9kZXMpIHtcbiAgICBjb25zdCB7IGFic29sdXRlVHJhbnNmb3JtLCB3aWR0aCwgaGVpZ2h0LCBjaGFyYWN0ZXJzIH0gPSB0ZXh0Tm9kZTtcblxuICAgIC8vIE5PVEU6IEZpZ21hIG5vZGUgeCwgeSBhcmUgcmVsYXRpdmUgdG8gZmlyc3QgcGFyZW50LCB3ZSB3YW50IHRoZW1cbiAgICAvLyByZWxhdGl2ZSB0byB0aGUgcm9vdCBmcmFtZVxuICAgIGNvbnN0IHRleHRYID0gYWJzb2x1dGVUcmFuc2Zvcm1bMF1bMl07XG4gICAgY29uc3QgdGV4dFkgPSBhYnNvbHV0ZVRyYW5zZm9ybVsxXVsyXTtcbiAgICBjb25zdCB4ID0gdGV4dFggLSByb290WDtcbiAgICBjb25zdCB5ID0gdGV4dFkgLSByb290WTtcblxuICAgIC8vIEdldCBmb250IHNpemVzIHJhbmdlc1xuICAgIGNvbnN0IHJhbmdlU3R5bGVzID0gZ2V0VGV4dFJhbmdlVmFsdWVzKHRleHROb2RlKTtcblxuICAgIHRleHRDb2xsZWN0aW9uLnB1c2goe1xuICAgICAgeCxcbiAgICAgIHksXG4gICAgICB3aWR0aCxcbiAgICAgIGhlaWdodCxcbiAgICAgIGNoYXJhY3RlcnMsXG4gICAgICByYW5nZVN0eWxlcyxcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiB0ZXh0Q29sbGVjdGlvbjtcbn1cbiIsICJpbXBvcnQgeyBzZXRIZWFkbGluZXNBbmRTb3VyY2VQcm9wcywgSUZyYW1lRGF0YSB9IGZyb20gXCJ0eXBlc1wiO1xuaW1wb3J0IHsgZ2V0Tm9kZVRleHQsIGdldFRleHROb2Rlc0Zyb21GcmFtZSB9IGZyb20gXCJoZWxwZXJzL2ZpZ21hVGV4dFwiO1xuaW1wb3J0IHsgSEVBRExJTkVfTk9ERV9OQU1FUywgTVNHX0VWRU5UUyB9IGZyb20gXCIuL2NvbnN0YW50c1wiO1xuaW1wb3J0IHsgcG9zdE1hbiB9IGZyb20gXCJ1dGlscy9tZXNzYWdlc1wiO1xuaW1wb3J0IHsgcmVzaXplQW5kT3B0aW1pc2VJbWFnZSB9IGZyb20gXCIuL2hlbHBlcnMvaW1hZ2VIZWxwZXJcIjtcblxuLyoqXG4gKiBDb21wcmVzcyBpbWFnZSB1c2luZyBicm93c2VyJ3MgbmF0aXZlIGltYWdlIGRlY29kaW5nIHN1cHBvcnRcbiAqIEBjb250ZXh0IEJyb3dzZXIgKFVJKVxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcHJlc3NJbWFnZShwcm9wczoge1xuICBpbWdEYXRhOiBVaW50OEFycmF5O1xuICBub2RlRGltZW5zaW9uczogeyB3aWR0aDogbnVtYmVyOyBoZWlnaHQ6IG51bWJlciB9W107XG59KTogUHJvbWlzZTxVaW50OEFycmF5PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgY29uc3QgaW1nID0gbmV3IEltYWdlKCk7XG4gICAgY29uc3QgeyBpbWdEYXRhLCBub2RlRGltZW5zaW9ucyB9ID0gcHJvcHM7XG5cbiAgICBpbWcuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRcIiwgKCkgPT4ge1xuICAgICAgcmVzaXplQW5kT3B0aW1pc2VJbWFnZSh7XG4gICAgICAgIGltZyxcbiAgICAgICAgaW1nRGF0YSxcbiAgICAgICAgbm9kZURpbWVuc2lvbnMsXG4gICAgICAgIHJlc29sdmUsXG4gICAgICAgIHJlamVjdCxcbiAgICAgIH0pLmNhdGNoKChlcnIpID0+IHJlamVjdChlcnIpKTtcbiAgICB9KTtcblxuICAgIGltZy5hZGRFdmVudExpc3RlbmVyKFwiZXJyb3JcIiwgKGVycikgPT4ge1xuICAgICAgY29uc29sZS5lcnJvcihcIkVycm9yIGxvYWRpbmcgY29tcHJlc3NlZCBpbWFnZVwiKTtcbiAgICAgIHJlamVjdChlcnIpO1xuICAgIH0pO1xuXG4gICAgY29uc3QgYmxvYiA9IG5ldyBCbG9iKFtpbWdEYXRhXSwgeyB0eXBlOiBcImltYWdlL3BuZ1wiIH0pO1xuICAgIGNvbnN0IGltZ1VybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG4gICAgaW1nLnNyYyA9IGltZ1VybDtcbiAgfSk7XG59XG5cbi8qKlxuICogVGVzdCBpZiBGaWdtYSBub2RlIHN1cHBvcnRzIGZpbGwgcHJvcGVydHkgdHlwZVxuICovXG5mdW5jdGlvbiBzdXBwb3J0c0ZpbGxzKFxuICBub2RlOiBTY2VuZU5vZGVcbik6IG5vZGUgaXMgRXhjbHVkZTxTY2VuZU5vZGUsIFNsaWNlTm9kZSB8IEdyb3VwTm9kZT4ge1xuICByZXR1cm4gbm9kZS50eXBlICE9PSBcIlNMSUNFXCIgJiYgbm9kZS50eXBlICE9PSBcIkdST1VQXCI7XG59XG5cbi8qKlxuICogUmVuZGVyIGFsbCBzcGVjaWZpZWQgZnJhbWVzIG91dCBhcyBTVkcgZWxlbWVudC5cbiAqIEltYWdlcyBhcmUgb3B0aW1pc2VkIGZvciBzaXplIGFuZCBpbWFnZSB0eXBlIGNvbXByZXNzaW9uIHZpYSB0aGUgZnJvbnRlbmQgVUlcbiAqXG4gKiBAY29udGV4dCBmaWdtYVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVuZGVyRnJhbWVzKGZyYW1lSWRzOiBzdHJpbmdbXSk6IFByb21pc2U8VWludDhBcnJheT4ge1xuICBjb25zdCBvdXRwdXROb2RlID0gZmlnbWEuY3JlYXRlRnJhbWUoKTtcbiAgb3V0cHV0Tm9kZS5uYW1lID0gXCJvdXRwdXRcIjtcblxuICB0cnkge1xuICAgIC8vIENsb25lIGVhY2ggc2VsZWN0ZWQgZnJhbWUgYWRkaW5nIHRoZW0gdG8gdGhlIHRlbXBvcmFyeSBjb250YWluZXIgZnJhbWVcbiAgICBjb25zdCBmcmFtZXMgPSBmaWdtYS5jdXJyZW50UGFnZS5jaGlsZHJlbi5maWx0ZXIoKHsgaWQgfSkgPT5cbiAgICAgIGZyYW1lSWRzLmluY2x1ZGVzKGlkKVxuICAgICk7XG5cbiAgICAvLyBDYWxjdWxhdGUgdGhlIG1heCBkaW1lbnNpb25zIGZvciBvdXRwdXQgY29udGFpbmVyIGZyYW1lXG4gICAgY29uc3QgbWF4V2lkdGggPSBNYXRoLm1heCguLi5mcmFtZXMubWFwKChmKSA9PiBmLndpZHRoKSk7XG4gICAgY29uc3QgbWF4SGVpZ2h0ID0gTWF0aC5tYXgoLi4uZnJhbWVzLm1hcCgoZikgPT4gZi5oZWlnaHQpKTtcbiAgICBvdXRwdXROb2RlLnJlc2l6ZVdpdGhvdXRDb25zdHJhaW50cyhtYXhXaWR0aCwgbWF4SGVpZ2h0KTtcblxuICAgIGZvciAoY29uc3QgZnJhbWUgb2YgZnJhbWVzKSB7XG4gICAgICBjb25zdCBjbG9uZSA9IGZyYW1lPy5jbG9uZSgpIGFzIEZyYW1lTm9kZTtcblxuICAgICAgLy8gRmluZCBhbmQgcmVtb3ZlIGFsbCB0ZXh0IG5vZGVzXG4gICAgICBjbG9uZS5maW5kQWxsKChuKSA9PiBuLnR5cGUgPT09IFwiVEVYVFwiKS5mb3JFYWNoKChuKSA9PiBuLnJlbW92ZSgpKTtcblxuICAgICAgLy8gQXBwZW5kIGNsb25lZCBmcmFtZSB0byB0ZW1wIG91dHB1dCBmcmFtZSBhbmQgcG9zaXRpb24gaW4gdG9wIGxlZnRcbiAgICAgIG91dHB1dE5vZGUuYXBwZW5kQ2hpbGQoY2xvbmUpO1xuICAgICAgY2xvbmUueCA9IDA7XG4gICAgICBjbG9uZS55ID0gMDtcblxuICAgICAgLy8gU3RvcmUgdGhlIGZyYW1lIElEIGFzIG5vZGUgbmFtZSAoZXhwb3J0ZWQgaW4gU1ZHIHByb3BzKVxuICAgICAgY2xvbmUubmFtZSA9IGZyYW1lLmlkO1xuICAgIH1cblxuICAgIC8vIEZpbmQgYWxsIG5vZGVzIHdpdGggaW1hZ2UgZmlsbHNcbiAgICBjb25zdCBub2Rlc1dpdGhJbWFnZXMgPSBvdXRwdXROb2RlLmZpbmRBbGwoXG4gICAgICAobm9kZSkgPT5cbiAgICAgICAgc3VwcG9ydHNGaWxscyhub2RlKSAmJlxuICAgICAgICBub2RlLmZpbGxzICE9PSBmaWdtYS5taXhlZCAmJlxuICAgICAgICBub2RlLmZpbGxzLnNvbWUoKGZpbGwpID0+IGZpbGwudHlwZSA9PT0gXCJJTUFHRVwiKVxuICAgICk7XG5cbiAgICAvLyBBIHNpbmdsZSBpbWFnZSBjYW4gYmUgdXNlZCBtdWx0aXBsZSB0aW1lcyBvbiBkaWZmZXJlbnQgbm9kZXMgaW4gZGlmZmVyZW50XG4gICAgLy8gZnJhbWVzLiBUbyBlbnN1cmUgaW1hZ2VzIGFyZSBvbmx5IG9wdGltaXNlZCBvbmNlIGEgY2FjaGUgaXMgY3JlYXRlZFxuICAgIC8vIG9mIHVuaXF1ZSBpbWFnZXMgYW5kIHVzZWQgdG8gcmVwbGFjZSBvcmlnaW5hbCBhZnRlciB0aGUgYXN5bmMgcHJvY2Vzc2luZ1xuICAgIC8vIGlzIGNvbXBsZXRlZC5cbiAgICBjb25zdCBpbWFnZUNhY2hlOiB7XG4gICAgICBbaWQ6IHN0cmluZ106IHsgd2lkdGg6IG51bWJlcjsgaGVpZ2h0OiBudW1iZXI7IGlkOiBzdHJpbmcgfVtdO1xuICAgIH0gPSB7fTtcblxuICAgIGZvciAoY29uc3Qgbm9kZSBvZiBub2Rlc1dpdGhJbWFnZXMpIHtcbiAgICAgIGlmIChzdXBwb3J0c0ZpbGxzKG5vZGUpICYmIG5vZGUuZmlsbHMgIT09IGZpZ21hLm1peGVkKSB7XG4gICAgICAgIC8vIFRoZSBmcm9udGVuZCBVSSB3aGljaCBoYW5kbGVzIHRoZSBpbWFnZSBvcHRpbWlzYXRpb24gbmVlZHMgdG8ga25vd1xuICAgICAgICAvLyB0aGUgc2l6ZXMgb2YgZWFjaCBub2RlIHRoYXQgdXNlcyB0aGUgaW1hZ2UuIFRoZSBkaW1lbnNpb25zIGFyZSBzdG9yZWRcbiAgICAgICAgLy8gd2l0aCB0aGUgaW1hZ2UgaGFzaCBJRCBpbiB0aGUgY2FjaGUgZm9yIGxhdGVyIHVzZS5cbiAgICAgICAgY29uc3QgZGltZW5zaW9ucyA9IHtcbiAgICAgICAgICB3aWR0aDogbm9kZS53aWR0aCxcbiAgICAgICAgICBoZWlnaHQ6IG5vZGUuaGVpZ2h0LFxuICAgICAgICAgIGlkOiBub2RlLmlkLFxuICAgICAgICB9O1xuICAgICAgICBjb25zdCBpbWdQYWludCA9IFsuLi5ub2RlLmZpbGxzXS5maW5kKChwKSA9PiBwLnR5cGUgPT09IFwiSU1BR0VcIik7XG5cbiAgICAgICAgaWYgKGltZ1BhaW50Py50eXBlID09PSBcIklNQUdFXCIgJiYgaW1nUGFpbnQuaW1hZ2VIYXNoKSB7XG4gICAgICAgICAgLy8gQWRkIHRoZSBpbWFnZSBkaW1lbnNpb25zIHRvIHRoZSBjYWNoZSwgb3IgdXBkYXRlIGFuZCBleGlzdGluZyBjYWNoZVxuICAgICAgICAgIC8vIGl0ZW0gd2l0aCBhbm90aGVyIG5vZGVzIGRpbWVuc2lvbnNcbiAgICAgICAgICBpZiAoaW1hZ2VDYWNoZVtpbWdQYWludC5pbWFnZUhhc2hdKSB7XG4gICAgICAgICAgICBpbWFnZUNhY2hlW2ltZ1BhaW50LmltYWdlSGFzaF0ucHVzaChkaW1lbnNpb25zKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaW1hZ2VDYWNoZVtpbWdQYWludC5pbWFnZUhhc2hdID0gW2RpbWVuc2lvbnNdO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFNlbmQgZWFjaCBpbWFnZSBmcm9tIHRoZSBpbWFnZUNhY2hlIHRvIHRoZSBmcm9udGVuZCBmb3Igb3B0aW1pc2F0aW9uLlxuICAgIC8vIFRoZSBvcGVyYXRpb24gaXMgYXN5bmMgYW5kIGNhbiB0YWtlIHNvbWUgdGltZSBpZiB0aGUgaW1hZ2VzIGFyZSBsYXJnZS5cbiAgICBmb3IgKGNvbnN0IGltYWdlSGFzaCBpbiBpbWFnZUNhY2hlKSB7XG4gICAgICBjb25zdCBieXRlcyA9IGF3YWl0IGZpZ21hLmdldEltYWdlQnlIYXNoKGltYWdlSGFzaCkuZ2V0Qnl0ZXNBc3luYygpO1xuICAgICAgY29uc3QgY29tcHJlc3NlZEltYWdlOiBVaW50OEFycmF5ID0gYXdhaXQgcG9zdE1hbi5zZW5kKHtcbiAgICAgICAgd29ya2xvYWQ6IE1TR19FVkVOVFMuQ09NUFJFU1NfSU1BR0UsXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICBpbWdEYXRhOiBieXRlcyxcbiAgICAgICAgICBub2RlRGltZW5zaW9uczogaW1hZ2VDYWNoZVtpbWFnZUhhc2hdLFxuICAgICAgICB9LFxuICAgICAgfSk7XG5cbiAgICAgIC8vIFN0b3JlIHRoZSBuZXcgaW1hZ2UgaW4gZmlnbWEgYW5kIGdldCB0aGUgbmV3IGltYWdlIGhhc2hcbiAgICAgIGNvbnN0IG5ld0ltYWdlSGFzaCA9IGZpZ21hLmNyZWF0ZUltYWdlKGNvbXByZXNzZWRJbWFnZSkuaGFzaDtcblxuICAgICAgLy8gVXBkYXRlIG5vZGVzIHdpdGggbmV3IGltYWdlIHBhaW50IGZpbGxcbiAgICAgIG5vZGVzV2l0aEltYWdlcy5mb3JFYWNoKChub2RlKSA9PiB7XG4gICAgICAgIGlmIChzdXBwb3J0c0ZpbGxzKG5vZGUpICYmIG5vZGUuZmlsbHMgIT09IGZpZ21hLm1peGVkKSB7XG4gICAgICAgICAgY29uc3QgaW1nUGFpbnQgPSBbLi4ubm9kZS5maWxsc10uZmluZChcbiAgICAgICAgICAgIChwKSA9PiBwLnR5cGUgPT09IFwiSU1BR0VcIiAmJiBwLmltYWdlSGFzaCA9PT0gaW1hZ2VIYXNoXG4gICAgICAgICAgKTtcblxuICAgICAgICAgIGlmIChpbWdQYWludCkge1xuICAgICAgICAgICAgY29uc3QgbmV3UGFpbnQgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGltZ1BhaW50KSk7XG4gICAgICAgICAgICBuZXdQYWludC5pbWFnZUhhc2ggPSBuZXdJbWFnZUhhc2g7XG4gICAgICAgICAgICBub2RlLmZpbGxzID0gW25ld1BhaW50XTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEhBQ0shIEZpZ21hIHRha2VzIHNvbWUgdGltZSB0byB1cGRhdGUgdGhlIGltYWdlIGZpbGxzLiBXYWl0aW5nIHNvbWVcbiAgICAvLyBhbW91bnQgaXMgcmVxdWlyZWQgb3RoZXJ3aXNlIHRoZSBpbWFnZXMgYXBwZWFyIGJsYW5rLlxuICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDMwMCkpO1xuXG4gICAgLy8gUmVuZGVyIG91dHB1dCBjb250YWluZXIgZnJhbWVzIHRvIFNWRyBtYXJrLXVwIChpbiBhIHVpbnQ4IGJ5dGUgYXJyYXkpXG4gICAgY29uc3Qgc3ZnID0gYXdhaXQgb3V0cHV0Tm9kZS5leHBvcnRBc3luYyh7XG4gICAgICBmb3JtYXQ6IFwiU1ZHXCIsXG4gICAgICBzdmdTaW1wbGlmeVN0cm9rZTogdHJ1ZSxcbiAgICAgIHN2Z091dGxpbmVUZXh0OiBmYWxzZSxcbiAgICAgIHN2Z0lkQXR0cmlidXRlOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHN2ZztcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGVycik7XG4gIH0gZmluYWxseSB7XG4gICAgLy8gUmVtb3ZlIHRoZSBvdXRwdXQgZnJhbWUgd2hhdGV2ZXIgaGFwcGVuc1xuICAgIG91dHB1dE5vZGUucmVtb3ZlKCk7XG4gIH1cbn1cblxuLyoqXG4gKiBDcmVhdGUsIHVwZGF0ZSBvciBkZWxldGUgaGVhZGxpbmUgdGV4dCBpbiBmaWdtYSBkb2N1bWVudCBmcm9tIHBsdWdpbiBVSVxuICpcbiAqIEBjb250ZXh0IGZpZ21hXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXRIZWFkbGluZXNBbmRTb3VyY2UocHJvcHM6IHNldEhlYWRsaW5lc0FuZFNvdXJjZVByb3BzKTogdm9pZCB7XG4gIGNvbnN0IHBhZ2VOb2RlID0gZmlnbWEuY3VycmVudFBhZ2U7XG4gIGNvbnN0IGZyYW1lcyA9IHBhZ2VOb2RlLmZpbmRDaGlsZHJlbigobm9kZSkgPT4gbm9kZS50eXBlID09PSBcIkZSQU1FXCIpO1xuICBjb25zdCBtb3N0TGVmdFBvcyA9IE1hdGgubWluKC4uLmZyYW1lcy5tYXAoKG5vZGUpID0+IG5vZGUueCkpO1xuICBjb25zdCBtb3N0VG9wUG9zID0gTWF0aC5taW4oLi4uZnJhbWVzLm1hcCgobm9kZSkgPT4gbm9kZS55KSk7XG5cbiAgLy8gTG9vcCB0aHJvdWdoIGVhY2ggaGVhZGxpbmUgbm9kZSBuYW1lc1xuICBmb3IgKGNvbnN0IG5hbWUgb2YgT2JqZWN0LnZhbHVlcyhIRUFETElORV9OT0RFX05BTUVTKSkge1xuICAgIGxldCBub2RlID1cbiAgICAgIChwYWdlTm9kZS5maW5kQ2hpbGQoXG4gICAgICAgIChub2RlKSA9PiBub2RlLm5hbWUgPT09IG5hbWUgJiYgbm9kZS50eXBlID09PSBcIlRFWFRcIlxuICAgICAgKSBhcyBUZXh0Tm9kZSkgfHwgbnVsbDtcbiAgICBjb25zdCB0ZXh0Q29udGVudCA9IHByb3BzW25hbWVdO1xuXG4gICAgLy8gUmVtb3ZlIG5vZGUgaWYgdGhlcmUncyBubyB0ZXh0IGNvbnRlbnRcbiAgICBpZiAobm9kZSAmJiAhdGV4dENvbnRlbnQpIHtcbiAgICAgIG5vZGUucmVtb3ZlKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gRG8gbm90aGluZyBpcyB0aGVyZSdzIG5vIHRleHQgY29udGVudFxuICAgIGlmICghdGV4dENvbnRlbnQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgbm9kZSBpZiBpdCBkb2Vzbid0IGFscmVhZHkgZXhpc3RcbiAgICBpZiAoIW5vZGUpIHtcbiAgICAgIG5vZGUgPSBmaWdtYS5jcmVhdGVUZXh0KCk7XG4gICAgICBub2RlLm5hbWUgPSBuYW1lO1xuXG4gICAgICAvLyBQb3NpdGlvbiBuZXcgdGV4dCBub2RlIHRvcC1sZWZ0IG9mIHRoZSBmaXJzdCBmcmFtZSBpbiB0aGUgcGFnZVxuICAgICAgbGV0IHkgPSBtb3N0VG9wUG9zIC0gNjA7XG4gICAgICBpZiAobmFtZSA9PT0gSEVBRExJTkVfTk9ERV9OQU1FUy5IRUFETElORSkge1xuICAgICAgICB5IC09IDYwO1xuICAgICAgfSBlbHNlIGlmIChuYW1lID09PSBIRUFETElORV9OT0RFX05BTUVTLlNVQkhFQUQpIHtcbiAgICAgICAgeSAtPSAzMDtcbiAgICAgIH1cblxuICAgICAgbm9kZS5yZWxhdGl2ZVRyYW5zZm9ybSA9IFtcbiAgICAgICAgWzEsIDAsIG1vc3RMZWZ0UG9zXSxcbiAgICAgICAgWzAsIDEsIHldLFxuICAgICAgXTtcbiAgICB9XG5cbiAgICAvLyBFbnN1cmUgdGV4dCBub2RlIGlzIGxvY2tlZFxuICAgIG5vZGUubG9ja2VkID0gdHJ1ZTtcblxuICAgIC8vIExvYWQgZm9udFxuICAgIGNvbnN0IGZvbnROYW1lID1cbiAgICAgIG5vZGUuZm9udE5hbWUgIT09IGZpZ21hLm1peGVkID8gbm9kZS5mb250TmFtZS5mYW1pbHkgOiBcIlJvYm90b1wiO1xuICAgIGNvbnN0IGZvbnRTdHlsZSA9XG4gICAgICBub2RlLmZvbnROYW1lICE9PSBmaWdtYS5taXhlZCA/IG5vZGUuZm9udE5hbWUuc3R5bGUgOiBcIlJlZ3VsYXJcIjtcbiAgICBmaWdtYVxuICAgICAgLmxvYWRGb250QXN5bmMoeyBmYW1pbHk6IGZvbnROYW1lLCBzdHlsZTogZm9udFN0eWxlIH0pXG4gICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgIC8vIFNldCB0ZXh0IG5vZGUgY29udGVudFxuICAgICAgICBub2RlLmNoYXJhY3RlcnMgPSBwcm9wc1tuYW1lXSB8fCBcIlwiO1xuICAgICAgfSlcbiAgICAgIC5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgdG8gbG9hZCBmb250XCIsIGVycik7XG4gICAgICB9KTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Um9vdEZyYW1lcygpOiBJRnJhbWVEYXRhIHtcbiAgY29uc3QgeyBjdXJyZW50UGFnZSB9ID0gZmlnbWE7XG4gIGNvbnN0IHJvb3RGcmFtZXMgPSBjdXJyZW50UGFnZS5jaGlsZHJlbi5maWx0ZXIoXG4gICAgKG5vZGUpID0+IG5vZGUudHlwZSA9PT0gXCJGUkFNRVwiXG4gICkgYXMgRnJhbWVOb2RlW107XG5cbiAgY29uc3QgZnJhbWVzRGF0YSA9IHJvb3RGcmFtZXMubWFwKChmcmFtZSkgPT4ge1xuICAgIGNvbnN0IHsgbmFtZSwgd2lkdGgsIGhlaWdodCwgaWQgfSA9IGZyYW1lO1xuICAgIGNvbnN0IHRleHROb2RlcyA9IGdldFRleHROb2Rlc0Zyb21GcmFtZShmcmFtZSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgbmFtZSxcbiAgICAgIHdpZHRoLFxuICAgICAgaGVpZ2h0LFxuICAgICAgaWQsXG4gICAgICB0ZXh0Tm9kZXMsXG4gICAgfTtcbiAgfSk7XG5cbiAgcmV0dXJuIHtcbiAgICBmcmFtZXM6IGZyYW1lc0RhdGEsXG4gICAgaGVhZGxpbmU6IGdldE5vZGVUZXh0KGN1cnJlbnRQYWdlLCBIRUFETElORV9OT0RFX05BTUVTLkhFQURMSU5FKSxcbiAgICBzdWJoZWFkOiBnZXROb2RlVGV4dChjdXJyZW50UGFnZSwgSEVBRExJTkVfTk9ERV9OQU1FUy5IRUFETElORSksXG4gICAgc291cmNlOiBnZXROb2RlVGV4dChjdXJyZW50UGFnZSwgSEVBRExJTkVfTk9ERV9OQU1FUy5IRUFETElORSksXG4gIH07XG59XG4iLCAiaW1wb3J0IHsgTVNHX0VWRU5UUyB9IGZyb20gXCIuL2NvbnN0YW50c1wiO1xuaW1wb3J0IHsgcG9zdE1hbiB9IGZyb20gXCIuL3V0aWxzL21lc3NhZ2VzXCI7XG5pbXBvcnQgeyBnZXRSb290RnJhbWVzLCByZW5kZXJGcmFtZXMsIHNldEhlYWRsaW5lc0FuZFNvdXJjZSB9IGZyb20gXCIuL2hlbHBlcnNcIjtcblxuLy8gUmVnaXN0ZXIgbWVzc2VuZ2VyIGV2ZW50IGZ1bmN0aW9uc1xucG9zdE1hbi5yZWdpc3RlcldvcmtlcihNU0dfRVZFTlRTLkdFVF9ST09UX0ZSQU1FUywgZ2V0Um9vdEZyYW1lcyk7XG5wb3N0TWFuLnJlZ2lzdGVyV29ya2VyKE1TR19FVkVOVFMuUkVOREVSLCByZW5kZXJGcmFtZXMpO1xucG9zdE1hbi5yZWdpc3RlcldvcmtlcihNU0dfRVZFTlRTLlVQREFURV9IRUFETElORVMsIHNldEhlYWRsaW5lc0FuZFNvdXJjZSk7XG5cbi8vIFJlbmRlciB0aGUgRE9NXG5maWdtYS5zaG93VUkoX19odG1sX18pO1xuXG4vLyBSZXNpemUgVUkgdG8gbWF4IHZpZXdwb3J0IGRpbWVuc2lvbnNcbmNvbnN0IHsgd2lkdGgsIGhlaWdodCB9ID0gZmlnbWEudmlld3BvcnQuYm91bmRzO1xuY29uc3QgeyB6b29tIH0gPSBmaWdtYS52aWV3cG9ydDtcbmNvbnN0IGluaXRpYWxXaW5kb3dXaWR0aCA9IE1hdGgucm91bmQod2lkdGggKiB6b29tKTtcbmNvbnN0IGluaXRpYWxXaW5kb3dIZWlnaHQgPSBNYXRoLnJvdW5kKGhlaWdodCAqIHpvb20pO1xuZmlnbWEudWkucmVzaXplKGluaXRpYWxXaW5kb3dXaWR0aCwgaW5pdGlhbFdpbmRv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
