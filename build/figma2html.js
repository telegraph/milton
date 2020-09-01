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
  (function(MSG_EVENTS2) {
    MSG_EVENTS2[MSG_EVENTS2["FOUND_FRAMES"] = 0] = "FOUND_FRAMES";
    MSG_EVENTS2[MSG_EVENTS2["NO_FRAMES"] = 1] = "NO_FRAMES";
    MSG_EVENTS2[MSG_EVENTS2["RENDER"] = 2] = "RENDER";
    MSG_EVENTS2[MSG_EVENTS2["CLOSE"] = 3] = "CLOSE";
    MSG_EVENTS2[MSG_EVENTS2["ERROR"] = 4] = "ERROR";
    MSG_EVENTS2[MSG_EVENTS2["UPDATE_HEADLINES"] = 5] = "UPDATE_HEADLINES";
    MSG_EVENTS2[MSG_EVENTS2["COMPRESS_IMAGE"] = 6] = "COMPRESS_IMAGE";
    MSG_EVENTS2[MSG_EVENTS2["GET_ROOT_FRAMES"] = 7] = "GET_ROOT_FRAMES";
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
          return "normal";
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
        return void 0;
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
    const ends = Object.values(ranges).flatMap((range) => range.map((item) => item.end)).sort((a, b) => a > b ? 1 : -1).filter((n, i, self) => self.indexOf(n) === i);
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
    const textNodes = frame.findAll((node) => node.type === "TEXT" && node.characters.length > 0);
    const {absoluteTransform} = frame;
    const rootX = absoluteTransform[0][2];
    const rootY = absoluteTransform[1][2];
    const textCollection = [];
    for (const textNode of textNodes) {
      const {
        absoluteTransform: absoluteTransform2,
        width: width2,
        height: height2,
        characters,
        textAlignHorizontal,
        textAlignVertical,
        constraints,
        strokes,
        strokeWeight,
        id
      } = textNode;
      console.log(strokes, strokeWeight);
      let strokeDetails = {};
      const strokeColour = strokes.find((paint) => paint.type === "SOLID");
      if (strokeColour) {
        strokeDetails = {
          strokeWeight,
          strokeColour: `rgb(${Object.values(strokeColour.color).map((val) => val * 255).join(",")})`
        };
      }
      const textX = absoluteTransform2[0][2];
      const textY = absoluteTransform2[1][2];
      const x = textX - rootX;
      const y = textY - rootY;
      const rangeStyles = getTextRangeValues(textNode);
      textCollection.push(__assign({
        x,
        y,
        width: width2,
        height: height2,
        characters,
        textAlignHorizontal,
        textAlignVertical,
        constraints,
        rangeStyles,
        id
      }, strokeDetails));
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
      const frames = figma.currentPage.findAll(({id}) => frameIds.includes(id));
      const maxWidth = Math.max(...frames.map((f) => f.width));
      const maxHeight = Math.max(...frames.map((f) => f.height));
      outputNode.resizeWithoutConstraints(maxWidth, maxHeight);
      for (const frame of frames) {
        const clone = frame == null ? void 0 : frame.clone();
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
    const mostLeftPos = Math.min(...pageNode.children.map((node) => node.x));
    const mostTopPos = Math.min(...pageNode.children.map((node) => node.y));
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
    let selectedFrames = currentPage.selection.filter((node) => node.type === "FRAME");
    if (selectedFrames.length === 0) {
      selectedFrames = currentPage.children.filter((node) => node.type === "FRAME");
    }
    const framesData = selectedFrames.map((frame) => {
      const {name, width: width2, height: height2, id} = frame;
      const textNodes = getTextNodesFromFrame(frame);
      const fixedPositionNodes = frame.children.slice(frame.children.length - frame.numberOfFixedChildren).map((node) => node.id);
      return {
        name,
        width: width2,
        height: height2,
        id,
        textNodes,
        fixedPositionNodes
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL2NvbnN0YW50cy50cyIsICJzcmMvdXRpbHMvbWVzc2FnZXMudHMiLCAic3JjL2hlbHBlcnMvZmlnbWFUZXh0LnRzIiwgInNyYy9oZWxwZXJzLnRzIiwgInNyYy9pbmRleC50c3giXSwKICAic291cmNlc0NvbnRlbnQiOiBbImV4cG9ydCBlbnVtIFNUQUdFUyB7XG4gIENIT09TRV9GUkFNRVMsXG4gIFJFU1BPTlNJVkVfUFJFVklFVyxcbiAgU0FWRV9PVVRQVVQsXG59XG5cbmV4cG9ydCBlbnVtIE1TR19FVkVOVFMge1xuICBGT1VORF9GUkFNRVMsXG4gIE5PX0ZSQU1FUyxcbiAgUkVOREVSLFxuICBDTE9TRSxcbiAgRVJST1IsXG4gIFVQREFURV9IRUFETElORVMsXG4gIENPTVBSRVNTX0lNQUdFLFxuICBHRVRfUk9PVF9GUkFNRVMsXG59XG5cbmV4cG9ydCBlbnVtIE9VVFBVVF9GT1JNQVRTIHtcbiAgSU5MSU5FLFxuICBJRlJBTUUsXG59XG5cbmV4cG9ydCBjb25zdCBVSV9URVhUID0ge1xuICBFUlJPUl9VTkVYUEVDVEVEOiBcIlVuZXhwZWN0ZWQgZXJyb3JcIixcbiAgRVJST1JfTUlTU0lOR19GUkFNRVM6IFwiTm8gZnJhbWVzIGZvdW5kLiBQbGVhc2UgYWRkIHNvbWUgZnJhbWVzIHRvIHRoZSBwYWdlLlwiLFxuICBXQVJOX05PX1RBUkdFVFM6IFwiU3RhbmRhcmQgZnJhbWVzIG5vdCBmb3VuZC4gUGxlYXNlIHNlbGVjdCB0YXJnZXQgZnJhbWVzLlwiLFxuICBXQVJOX1RPT19NQU5ZX1RBUkdFVFM6IFwiUGxlYXNlIHNlbGVjdCB0aHJlZSB0YXJnZXQgZnJhbWVzXCIsXG4gIElORk9fUFJFVklFVzogXCJQcmV2aWV3IGVhY2ggZnJhbWUgb3V0cHV0XCIsXG4gIFRJVExFX0NIT09TRV9GUkFNRTogXCJDaG9vc2Ugd2hpY2ggZnJhbWVzIHRvIGV4cG9ydFwiLFxuICBUSVRMRV9QUkVWSUVXOiBcIlByZXZpZXdcIixcbiAgVElUTEVfUkVTUE9OU0lWRV9QUkVWSUVXOiBcIlJlc3BvbnNpdmUgcHJldmlld1wiLFxuICBUSUxFX09VVFBVVDogXCJFeHBvcnRcIixcbiAgQlVUVE9OX05FWFQ6IFwiTmV4dFwiLFxuICBCVVRUT05fRE9XTkxPQUQ6IFwiRG93bmxvYWRcIixcbiAgQlVUVE9OX1BSRVZJT1VTOiBcIkJhY2tcIixcbn07XG5cbmV4cG9ydCBjb25zdCBGUkFNRV9XQVJOSU5HX1NJWkUgPSAzMDA7XG5cbmV4cG9ydCBlbnVtIEhFQURMSU5FX05PREVfTkFNRVMge1xuICBIRUFETElORSA9IFwiaGVhZGxpbmVcIixcbiAgU1VCSEVBRCA9IFwic3ViaGVhZFwiLFxuICBTT1VSQ0UgPSBcInNvdXJjZVwiLFxufVxuIiwgImltcG9ydCB7IE1TR19FVkVOVFMgfSBmcm9tIFwiLi4vY29uc3RhbnRzXCI7XG5cbmludGVyZmFjZSBJUG9zdG1hbk1lc3NhZ2Uge1xuICBuYW1lOiBzdHJpbmc7XG4gIHVpZDogc3RyaW5nO1xuICB3b3JrbG9hZDogTVNHX0VWRU5UUztcbiAgZGF0YTogYW55O1xuICByZXR1cm5pbmc/OiBib29sZWFuO1xuICBlcnI/OiBzdHJpbmc7XG59XG5cbmNsYXNzIFBvc3RtYW4ge1xuICBwcml2YXRlIG5hbWU6IHN0cmluZztcbiAgcHJpdmF0ZSBpbkZpZ21hU2FuZGJveDogYm9vbGVhbjtcbiAgcHJpdmF0ZSBjYWxsYmFja1N0b3JlOiB7IFtpZDogc3RyaW5nXTogRnVuY3Rpb24gfTtcbiAgcHJpdmF0ZSB3b3JrZXJzOiB7IFtpZDogc3RyaW5nXTogRnVuY3Rpb24gfTtcblxuICBwcml2YXRlIFRJTUVPVVQgPSAzMDAwMDtcblxuICBjb25zdHJ1Y3Rvcihwcm9wcz86IHsgbWVzc2FnZU5hbWU/OiBzdHJpbmc7IHNjb3BlOiBudWxsIH0pIHtcbiAgICB0aGlzLm5hbWUgPSBwcm9wcz8ubWVzc2FnZU5hbWUgfHwgXCJQT1NUTUFOXCI7XG4gICAgdGhpcy5pbkZpZ21hU2FuZGJveCA9IHR5cGVvZiBmaWdtYSA9PT0gXCJvYmplY3RcIjtcbiAgICB0aGlzLmNhbGxiYWNrU3RvcmUgPSB7fTtcbiAgICB0aGlzLndvcmtlcnMgPSB7fTtcblxuICAgIC8vIEFkZCBtZXNzYWdlIGV2ZW50IGxpc3RlbmVyXG4gICAgdGhpcy5pbkZpZ21hU2FuZGJveFxuICAgICAgPyBmaWdtYS51aS5vbihcIm1lc3NhZ2VcIiwgdGhpcy5yZWNlaXZlKVxuICAgICAgOiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgdGhpcy5yZWNlaXZlKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVjZWl2ZSA9IGFzeW5jIChldmVudDogTWVzc2FnZUV2ZW50PElQb3N0bWFuTWVzc2FnZT4pID0+IHtcbiAgICBjb25zdCBtc2dCb2R5ID0gdGhpcy5pbkZpZ21hU2FuZGJveCA/IGV2ZW50IDogZXZlbnQ/LmRhdGE/LnBsdWdpbk1lc3NhZ2U7XG4gICAgY29uc3QgeyBkYXRhLCB3b3JrbG9hZCwgbmFtZSwgdWlkLCByZXR1cm5pbmcsIGVyciB9ID0gbXNnQm9keSB8fCB7fTtcblxuICAgIHRyeSB7XG4gICAgICAvLyBEbyBub3RoaW5nIGlkIHBvc3QgbWVzc2FnZSBpc24ndCBmb3IgdXNcbiAgICAgIGlmICh0aGlzLm5hbWUgIT09IG5hbWUpIHJldHVybjtcblxuICAgICAgaWYgKHJldHVybmluZyAmJiAhdGhpcy5jYWxsYmFja1N0b3JlW3VpZF0pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIGNhbGxiYWNrOiAke3VpZH1gKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFyZXR1cm5pbmcgJiYgIXRoaXMud29ya2Vyc1t3b3JrbG9hZF0pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyB3b3JrbG9hZCByZWdpc3RlcmVkOiAke3dvcmtsb2FkfWApO1xuICAgICAgfVxuXG4gICAgICBpZiAocmV0dXJuaW5nKSB7XG4gICAgICAgIHRoaXMuY2FsbGJhY2tTdG9yZVt1aWRdKGRhdGEsIGVycik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCB3b3JrbG9hZFJlc3VsdCA9IGF3YWl0IHRoaXMud29ya2Vyc1t3b3JrbG9hZF0oZGF0YSk7XG4gICAgICAgIHRoaXMucG9zdEJhY2soeyBkYXRhOiB3b3JrbG9hZFJlc3VsdCwgdWlkIH0pO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgdGhpcy5wb3N0QmFjayh7IHVpZCwgZXJyOiBcIlBvc3RtYW4gZmFpbGVkXCIgfSk7XG4gICAgICBjb25zb2xlLmVycm9yKFwiUG9zdG1hbiBmYWlsZWRcIiwgZXJyKTtcbiAgICB9XG4gIH07XG5cbiAgcHVibGljIHJlZ2lzdGVyV29ya2VyID0gKGV2ZW50VHlwZTogTVNHX0VWRU5UUywgZm46IEZ1bmN0aW9uKSA9PiB7XG4gICAgdGhpcy53b3JrZXJzW2V2ZW50VHlwZV0gPSBmbjtcbiAgfTtcblxuICBwcml2YXRlIHBvc3RCYWNrID0gKHByb3BzOiB7IHVpZDogc3RyaW5nOyBkYXRhPzogYW55OyBlcnI/OiBzdHJpbmcgfSkgPT5cbiAgICB0aGlzLnBvc3RNZXNzYWdlKHtcbiAgICAgIG5hbWU6IHRoaXMubmFtZSxcbiAgICAgIHVpZDogcHJvcHMudWlkLFxuICAgICAgZGF0YTogcHJvcHMuZGF0YSxcbiAgICAgIHJldHVybmluZzogdHJ1ZSxcbiAgICAgIGVycjogcHJvcHMuZXJyLFxuICAgIH0pO1xuXG4gIHByaXZhdGUgcG9zdE1lc3NhZ2UgPSAobWVzc2FnZUJvZHkpID0+XG4gICAgdGhpcy5pbkZpZ21hU2FuZGJveFxuICAgICAgPyBmaWdtYS51aS5wb3N0TWVzc2FnZShtZXNzYWdlQm9keSlcbiAgICAgIDogcGFyZW50LnBvc3RNZXNzYWdlKHsgcGx1Z2luTWVzc2FnZTogbWVzc2FnZUJvZHkgfSwgXCIqXCIpO1xuXG4gIHB1YmxpYyBzZW5kID0gKHByb3BzOiB7IHdvcmtsb2FkOiBNU0dfRVZFTlRTOyBkYXRhPzogYW55IH0pOiBQcm9taXNlPGFueT4gPT4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCB7IHdvcmtsb2FkLCBkYXRhIH0gPSBwcm9wcztcblxuICAgICAgY29uc3QgcmFuZG9tSWQgPSBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHIoNSk7XG5cbiAgICAgIHRoaXMucG9zdE1lc3NhZ2Uoe1xuICAgICAgICBuYW1lOiB0aGlzLm5hbWUsXG4gICAgICAgIHVpZDogcmFuZG9tSWQsXG4gICAgICAgIHdvcmtsb2FkLFxuICAgICAgICBkYXRhLFxuICAgICAgfSBhcyBJUG9zdG1hbk1lc3NhZ2UpO1xuXG4gICAgICB0aGlzLmNhbGxiYWNrU3RvcmVbcmFuZG9tSWRdID0gKHJlc3VsdDogYW55LCBlcnI/OiBzdHJpbmcpID0+IHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgc2V0VGltZW91dCgoKSA9PiByZWplY3QobmV3IEVycm9yKFwiVGltZWQgb3V0XCIpKSwgdGhpcy5USU1FT1VUKTtcbiAgICB9KTtcbiAgfTtcbn1cblxuZXhwb3J0IGNvbnN0IHBvc3RNYW4gPSBuZXcgUG9zdG1hbigpO1xuIiwgImltcG9ydCB7IHRleHREYXRhLCBJVGV4dFByb3AsIElUZXh0U3R5bGUgfSBmcm9tIFwidHlwZXNcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldE5vZGVUZXh0KFxuICByb290Tm9kZTogUGFnZU5vZGUsXG4gIG5vZGVOYW1lOiBzdHJpbmdcbik6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IGZvdW5kTm9kZSA9IHJvb3ROb2RlLmZpbmRDaGlsZCgobm9kZSkgPT4gbm9kZS5uYW1lID09PSBub2RlTmFtZSk7XG4gIHJldHVybiBmb3VuZE5vZGUgJiYgZm91bmROb2RlLnR5cGUgPT09IFwiVEVYVFwiXG4gICAgPyBmb3VuZE5vZGUuY2hhcmFjdGVyc1xuICAgIDogdW5kZWZpbmVkO1xufVxuXG4vLyBmdW5jdGlvbiBjYWxjdWxhdGVMZXR0ZXJTcGFjaW5nKFxuLy8gICBmb250RmFtaWx5OiBzdHJpbmcsXG4vLyAgIGxldHRlclNwYWNpbmc6IExldHRlclNwYWNpbmdcbi8vICkge1xuLy8gICBjb25zdCB7IHVuaXQ6IGxldHRlclVuaXQsIHZhbHVlOiBsZXR0ZXJWYWwgfSA9IGxldHRlclNwYWNpbmc7XG4vLyAgIGxldCBsZXR0ZXJTcGFjZVZhbHVlID0gXCIwXCI7XG5cbi8vICAgc3dpdGNoIChsZXR0ZXJVbml0KSB7XG4vLyAgICAgY2FzZSBcIlBJWEVMU1wiOlxuLy8gICAgICAgLy8gVE9ETzogRklYIE1FXG4vLyAgICAgICBpZiAoZm9udEZhbWlseSA9PT0gXCJUZWxlc2FucyBUZXh0XCIpIHtcbi8vICAgICAgICAgbGV0dGVyU3BhY2VWYWx1ZSA9IGAke2xldHRlclZhbCAtIDAuMzN9cHhgO1xuLy8gICAgICAgfSBlbHNlIGlmIChmb250RmFtaWx5ID09PSBcIlRlbGVzYW5zIEFnYXRlXCIpIHtcbi8vICAgICAgICAgbGV0dGVyU3BhY2VWYWx1ZSA9IGAke2xldHRlclZhbCAtIDAuMTl9cHhgO1xuLy8gICAgICAgfSBlbHNlIHtcbi8vICAgICAgICAgbGV0dGVyU3BhY2VWYWx1ZSA9IGAke2xldHRlclZhbH1weGA7XG4vLyAgICAgICB9XG4vLyAgICAgICBicmVhaztcbi8vICAgICBjYXNlIFwiUEVSQ0VOVFwiOlxuLy8gICAgICAgbGV0dGVyU3BhY2VWYWx1ZSA9IGAke2xldHRlclZhbCAvIDEwMH1lbWA7XG5cbi8vICAgICAgIGlmIChmb250RmFtaWx5ID09PSBcIlRlbGVzYW5zIFRleHRcIikge1xuLy8gICAgICAgICBsZXR0ZXJTcGFjZVZhbHVlID0gYCR7bGV0dGVyVmFsIC8gMTAwIC0gMC4wMjJ9ZW1gO1xuLy8gICAgICAgfSBlbHNlIGlmIChmb250RmFtaWx5ID09PSBcIlRlbGVzYW5zIEFnYXRlXCIpIHtcbi8vICAgICAgICAgbGV0dGVyU3BhY2VWYWx1ZSA9IGAke2xldHRlclZhbCAvIDEwMCAtIDAuMDE1fWVtYDtcbi8vICAgICAgIH0gZWxzZSB7XG4vLyAgICAgICAgIGxldHRlclNwYWNlVmFsdWUgPSBgJHtsZXR0ZXJWYWwgLyAxMDB9ZW1gO1xuLy8gICAgICAgfVxuLy8gICAgICAgYnJlYWs7XG4vLyAgICAgZGVmYXVsdDpcbi8vICAgICAgIGlmIChmb250RmFtaWx5ID09PSBcIlRlbGVzYW5zIFRleHRcIikge1xuLy8gICAgICAgICBsZXR0ZXJTcGFjZVZhbHVlID0gXCItMC4zN3B4XCI7XG4vLyAgICAgICB9IGVsc2UgaWYgKGZvbnRGYW1pbHkgPT09IFwiVGVsZXNhbnMgQWdhdGVcIikge1xuLy8gICAgICAgICBsZXR0ZXJTcGFjZVZhbHVlID0gXCItMC4xOXB4XCI7XG4vLyAgICAgICB9IGVsc2Uge1xuLy8gICAgICAgICBsZXR0ZXJTcGFjZVZhbHVlID0gYDBgO1xuLy8gICAgICAgfVxuLy8gICAgICAgYnJlYWs7XG4vLyAgIH1cblxuLy8gICByZXR1cm4gbGV0dGVyU3BhY2VWYWx1ZTtcbi8vIH1cblxuZW51bSBSQU5HRV9UWVBFUyB7XG4gIExFVFRFUl9TUEFDSU5HLFxuICBMSU5FX0hFSUdIVCxcbiAgRk9OVF9TSVpFLFxuICBDT0xPVVIsXG4gIEZPTlQsXG59XG5cbmZ1bmN0aW9uIGdldFJhbmdlVmFsKFxuICB0ZXh0Tm9kZTogVGV4dE5vZGUsXG4gIHJhbmdlVHlwZTogUkFOR0VfVFlQRVMsXG4gIHN0YXJ0OiBudW1iZXIsXG4gIGVuZDogbnVtYmVyXG4pIHtcbiAgc3dpdGNoIChyYW5nZVR5cGUpIHtcbiAgICBjYXNlIFJBTkdFX1RZUEVTLkxFVFRFUl9TUEFDSU5HOiB7XG4gICAgICBjb25zdCBsZXR0ZXJTcGFjZSA9IHRleHROb2RlLmdldFJhbmdlTGV0dGVyU3BhY2luZyhzdGFydCwgZW5kKTtcbiAgICAgIGlmIChsZXR0ZXJTcGFjZSA9PT0gZmlnbWEubWl4ZWQpIHtcbiAgICAgICAgcmV0dXJuIGxldHRlclNwYWNlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGxldHRlclNwYWNlLnVuaXQgPT09IFwiUEVSQ0VOVFwiXG4gICAgICAgICAgPyBgJHtsZXR0ZXJTcGFjZS52YWx1ZSAvIDEwMH1yZW1gXG4gICAgICAgICAgOiBgJHtsZXR0ZXJTcGFjZS52YWx1ZX1weGA7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY2FzZSBSQU5HRV9UWVBFUy5MSU5FX0hFSUdIVDoge1xuICAgICAgY29uc3QgbGluZUhlaWdodCA9IHRleHROb2RlLmdldFJhbmdlTGluZUhlaWdodChzdGFydCwgZW5kKTtcbiAgICAgIGlmIChsaW5lSGVpZ2h0ID09PSBmaWdtYS5taXhlZCkge1xuICAgICAgICByZXR1cm4gbGluZUhlaWdodDtcbiAgICAgIH0gZWxzZSBpZiAobGluZUhlaWdodC51bml0ID09PSBcIkFVVE9cIikge1xuICAgICAgICByZXR1cm4gXCJub3JtYWxcIjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBsaW5lSGVpZ2h0LnVuaXQgPT09IFwiUEVSQ0VOVFwiXG4gICAgICAgICAgPyBgJHtsaW5lSGVpZ2h0LnZhbHVlIC8gMTAwfXJlbWBcbiAgICAgICAgICA6IGAke2xpbmVIZWlnaHQudmFsdWV9cHhgO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNhc2UgUkFOR0VfVFlQRVMuRk9OVF9TSVpFOlxuICAgICAgcmV0dXJuIHRleHROb2RlLmdldFJhbmdlRm9udFNpemUoc3RhcnQsIGVuZCk7XG5cbiAgICBjYXNlIFJBTkdFX1RZUEVTLkNPTE9VUjoge1xuICAgICAgY29uc3QgcGFpbnQgPSB0ZXh0Tm9kZS5nZXRSYW5nZUZpbGxzKHN0YXJ0LCBlbmQpO1xuICAgICAgaWYgKHBhaW50ID09PSBmaWdtYS5taXhlZCkge1xuICAgICAgICByZXR1cm4gcGFpbnQ7XG4gICAgICB9IGVsc2UgaWYgKHBhaW50WzBdLnR5cGUgPT09IFwiU09MSURcIikge1xuICAgICAgICByZXR1cm4geyAuLi5wYWludFswXS5jb2xvciB9O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHsgcjogMCwgZzogMCwgYjogMCB9IGFzIFJHQjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjYXNlIFJBTkdFX1RZUEVTLkZPTlQ6XG4gICAgICByZXR1cm4gdGV4dE5vZGUuZ2V0UmFuZ2VGb250TmFtZShzdGFydCwgZW5kKTtcblxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldFR5cGVWYWx1ZXMoXG4gIHRleHROb2RlOiBUZXh0Tm9kZSxcbiAgcmFuZ2VUeXBlOiBSQU5HRV9UWVBFU1xuKTogSVRleHRQcm9wW10ge1xuICBjb25zdCB7IGNoYXJhY3RlcnMgfSA9IHRleHROb2RlO1xuXG4gIC8vIElmIHRoZXJlJ3Mgbm8gbWl4ZWQgc3R5bGUgdGhlbiBzaG9ydCBjaXJjdWl0IHJlc3BvbnNlXG4gIGNvbnN0IGZ1bGxSYW5nZVZhbHVlID0gZ2V0UmFuZ2VWYWwodGV4dE5vZGUsIHJhbmdlVHlwZSwgMCwgY2hhcmFjdGVycy5sZW5ndGgpO1xuICBpZiAoZnVsbFJhbmdlVmFsdWUgIT09IGZpZ21hLm1peGVkKSB7XG4gICAgcmV0dXJuIFt7IHN0YXJ0OiAwLCBlbmQ6IGNoYXJhY3RlcnMubGVuZ3RoLCB2YWx1ZTogZnVsbFJhbmdlVmFsdWUgfV07XG4gIH1cblxuICAvLyBUaGVyZSdzIG1peGVkIHN0eWxlcy4gR28gdGhyb3VnaCBlYWNoIGNoYXIgdG8gZXh0cmFjdCBzdHlsZSByYW5nZXNcbiAgLy8gQm9vdHN0cmFwIHJhbmdlIHZhbHVlcyB3aXRoIGZpcnN0IGNoYXJhY3RlciB3aGljaCBpcyBuZXZlciBtaXhlZCB0eXBlXG4gIGNvbnN0IHZhbHVlczogSVRleHRQcm9wW10gPSBbXG4gICAgeyBzdGFydDogMCwgZW5kOiAxLCB2YWx1ZTogZ2V0UmFuZ2VWYWwodGV4dE5vZGUsIHJhbmdlVHlwZSwgMCwgMSkgfSxcbiAgXTtcblxuICAvLyBMb29wIHRocm91Z2ggZWFjaCBjaGFyYWN0ZXIgdG8gZmluZCByYW5nZXMuXG4gIC8vIFdoZW4gYSBtaXhlZCByYW5nZSBpcyBmb3VuZCB1cGRhdGUgdGhlIGN1cnJlbnQgZW5kIHBvc2l0aW9uIGFuZFxuICAvLyBjcmVhdGUgYSBuZXcgcmFuZ2Ugd2l0aCB0aGUgbmV4dCBzdHlsZVxuICBmb3IgKGxldCBpID0gMTsgaSA8PSBjaGFyYWN0ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgcHJvcCA9IHZhbHVlc1t2YWx1ZXMubGVuZ3RoIC0gMV07XG5cbiAgICAvLyBVcGRhdGUgZW5kIHBvc2l0aW9uIG9mIGN1cnJlbnQgc3R5bGVcbiAgICBwcm9wLmVuZCA9IGk7XG5cbiAgICBjb25zdCBjdXJyZW50VmFsdWUgPSBnZXRSYW5nZVZhbCh0ZXh0Tm9kZSwgcmFuZ2VUeXBlLCBwcm9wLnN0YXJ0LCBpKTtcblxuICAgIGlmIChjdXJyZW50VmFsdWUgPT09IGZpZ21hLm1peGVkKSB7XG4gICAgICAvLyBTZXQgZW5kIG9mIHRoZSBjdXJyZW50IHJhbmdlXG4gICAgICBwcm9wLmVuZCA9IGkgLSAxO1xuXG4gICAgICAvLyBDcmVhdGUgYW5kIHN0b3JlIG5leHQgcmFuZ2Ugc3R5bGVcbiAgICAgIHZhbHVlcy5wdXNoKHtcbiAgICAgICAgc3RhcnQ6IGksXG4gICAgICAgIGVuZDogaSArIDEsXG4gICAgICAgIHZhbHVlOiBnZXRSYW5nZVZhbCh0ZXh0Tm9kZSwgcmFuZ2VUeXBlLCBpIC0gMSwgaSksXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdmFsdWVzO1xufVxuXG5mdW5jdGlvbiBmaW5kSXRlbUluUmFuZ2UoXG4gIGl0ZW1zOiBJVGV4dFByb3BbXSxcbiAgc3RhcnQ6IG51bWJlcixcbiAgZW5kOiBudW1iZXJcbik6IElUZXh0UHJvcCB8IHVuZGVmaW5lZCB7XG4gIHJldHVybiBpdGVtcy5maW5kKChpdGVtKSA9PiBzdGFydCA+PSBpdGVtLnN0YXJ0ICYmIGVuZCA8PSBpdGVtLmVuZCk7XG59XG5cbmZ1bmN0aW9uIGdldFRleHRSYW5nZVZhbHVlcyh0ZXh0Tm9kZTogVGV4dE5vZGUpOiBJVGV4dFN0eWxlW10ge1xuICBjb25zdCB7IGNoYXJhY3RlcnMgfSA9IHRleHROb2RlO1xuXG4gIGNvbnN0IHJhbmdlcyA9IHtcbiAgICBsZXR0ZXJTcGFjZTogZ2V0VHlwZVZhbHVlcyh0ZXh0Tm9kZSwgUkFOR0VfVFlQRVMuTEVUVEVSX1NQQUNJTkcpLFxuICAgIGxpbmVIZWlnaHQ6IGdldFR5cGVWYWx1ZXModGV4dE5vZGUsIFJBTkdFX1RZUEVTLkxJTkVfSEVJR0hUKSxcbiAgICBzaXplOiBnZXRUeXBlVmFsdWVzKHRleHROb2RlLCBSQU5HRV9UWVBFUy5GT05UX1NJWkUpLFxuICAgIGNvbG91cjogZ2V0VHlwZVZhbHVlcyh0ZXh0Tm9kZSwgUkFOR0VfVFlQRVMuQ09MT1VSKSxcbiAgICBmb250OiBnZXRUeXBlVmFsdWVzKHRleHROb2RlLCBSQU5HRV9UWVBFUy5GT05UKSxcbiAgfTtcblxuICAvLyBDb2xsZWN0IGFsbCBlbmQgaW5kZXhlZCwgc29ydCBhY2NlbmRpbmcgYW5kIHJlbW92ZSBkdXBsaWNhdGVzXG4gIGNvbnN0IGVuZHMgPSBPYmplY3QudmFsdWVzKHJhbmdlcylcbiAgICAuZmxhdE1hcCgocmFuZ2UpID0+IHJhbmdlLm1hcCgoaXRlbSkgPT4gaXRlbS5lbmQpKVxuICAgIC5zb3J0KChhLCBiKSA9PiAoYSA+IGIgPyAxIDogLTEpKVxuICAgIC5maWx0ZXIoKG4sIGksIHNlbGYpID0+IHNlbGYuaW5kZXhPZihuKSA9PT0gaSk7XG5cbiAgLy8gVE9ETzogU2ltcGxpZnkgZW5kIGluZGV4IGxvZ2ljXG4gIGNvbnN0IHN0eWxlcyA9IFtdO1xuICBsZXQgaVN0YXJ0ID0gMDtcbiAgZm9yIChsZXQgaUVuZCBvZiBlbmRzKSB7XG4gICAgaWYgKGlTdGFydCA9PT0gaUVuZCkge1xuICAgICAgaUVuZCsrO1xuICAgIH1cblxuICAgIGNvbnN0IHN0eWxlOiBJVGV4dFN0eWxlID0ge1xuICAgICAgc3RhcnQ6IGlTdGFydCxcbiAgICAgIGVuZDogaUVuZCxcbiAgICAgIGNoYXJzOiBjaGFyYWN0ZXJzLnN1YnN0cmluZyhpU3RhcnQsIGlFbmQpLFxuICAgICAgZm9udDogZmluZEl0ZW1JblJhbmdlKHJhbmdlcy5mb250LCBpU3RhcnQgKyAxLCBpRW5kKT8udmFsdWUsXG4gICAgICBjb2xvdXI6IGZpbmRJdGVtSW5SYW5nZShyYW5nZXMuY29sb3VyLCBpU3RhcnQgKyAxLCBpRW5kKT8udmFsdWUsXG4gICAgICBzaXplOiBmaW5kSXRlbUluUmFuZ2UocmFuZ2VzLnNpemUsIGlTdGFydCArIDEsIGlFbmQpPy52YWx1ZSxcbiAgICAgIGxldHRlclNwYWNlOiBmaW5kSXRlbUluUmFuZ2UocmFuZ2VzLmxldHRlclNwYWNlLCBpU3RhcnQgKyAxLCBpRW5kKT8udmFsdWUsXG4gICAgICBsaW5lSGVpZ2h0OiBmaW5kSXRlbUluUmFuZ2UocmFuZ2VzLmxpbmVIZWlnaHQsIGlTdGFydCArIDEsIGlFbmQpPy52YWx1ZSxcbiAgICB9O1xuXG4gICAgc3R5bGVzLnB1c2goc3R5bGUpO1xuICAgIGlTdGFydCA9IGlFbmQ7XG4gIH1cblxuICByZXR1cm4gc3R5bGVzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0VGV4dE5vZGVzRnJvbUZyYW1lKGZyYW1lOiBGcmFtZU5vZGUpOiB0ZXh0RGF0YVtdIHtcbiAgY29uc3QgdGV4dE5vZGVzID0gZnJhbWUuZmluZEFsbChcbiAgICAobm9kZSkgPT4gbm9kZS50eXBlID09PSBcIlRFWFRcIiAmJiBub2RlLmNoYXJhY3RlcnMubGVuZ3RoID4gMFxuICApIGFzIFRleHROb2RlW107XG4gIGNvbnN0IHsgYWJzb2x1dGVUcmFuc2Zvcm0gfSA9IGZyYW1lO1xuICBjb25zdCByb290WCA9IGFic29sdXRlVHJhbnNmb3JtWzBdWzJdO1xuICBjb25zdCByb290WSA9IGFic29sdXRlVHJhbnNmb3JtWzFdWzJdO1xuXG4gIGNvbnN0IHRleHRDb2xsZWN0aW9uOiB0ZXh0RGF0YVtdID0gW107XG4gIGZvciAoY29uc3QgdGV4dE5vZGUgb2YgdGV4dE5vZGVzKSB7XG4gICAgY29uc3Qge1xuICAgICAgYWJzb2x1dGVUcmFuc2Zvcm0sXG4gICAgICB3aWR0aCxcbiAgICAgIGhlaWdodCxcbiAgICAgIGNoYXJhY3RlcnMsXG4gICAgICB0ZXh0QWxpZ25Ib3Jpem9udGFsLFxuICAgICAgdGV4dEFsaWduVmVydGljYWwsXG4gICAgICBjb25zdHJhaW50cyxcbiAgICAgIHN0cm9rZXMsXG4gICAgICBzdHJva2VXZWlnaHQsXG4gICAgICBpZCxcbiAgICB9ID0gdGV4dE5vZGU7XG5cbiAgICBjb25zb2xlLmxvZyhzdHJva2VzLCBzdHJva2VXZWlnaHQpO1xuXG4gICAgbGV0IHN0cm9rZURldGFpbHMgPSB7fTtcblxuICAgIGNvbnN0IHN0cm9rZUNvbG91ciA9IHN0cm9rZXMuZmluZChcbiAgICAgIChwYWludCkgPT4gcGFpbnQudHlwZSA9PT0gXCJTT0xJRFwiXG4gICAgKSBhcyBTb2xpZFBhaW50O1xuXG4gICAgaWYgKHN0cm9rZUNvbG91cikge1xuICAgICAgc3Ryb2tlRGV0YWlscyA9IHtcbiAgICAgICAgc3Ryb2tlV2VpZ2h0OiBzdHJva2VXZWlnaHQsXG4gICAgICAgIHN0cm9rZUNvbG91cjogYHJnYigke09iamVjdC52YWx1ZXMoc3Ryb2tlQ29sb3VyLmNvbG9yKVxuICAgICAgICAgIC5tYXAoKHZhbCkgPT4gdmFsICogMjU1KVxuICAgICAgICAgIC5qb2luKFwiLFwiKX0pYCxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gTk9URTogRmlnbWEgbm9kZSB4LCB5IGFyZSByZWxhdGl2ZSB0byBmaXJzdCBwYXJlbnQsIHdlIHdhbnQgdGhlbVxuICAgIC8vIHJlbGF0aXZlIHRvIHRoZSByb290IGZyYW1lXG4gICAgY29uc3QgdGV4dFggPSBhYnNvbHV0ZVRyYW5zZm9ybVswXVsyXTtcbiAgICBjb25zdCB0ZXh0WSA9IGFic29sdXRlVHJhbnNmb3JtWzFdWzJdO1xuICAgIGNvbnN0IHggPSB0ZXh0WCAtIHJvb3RYO1xuICAgIGNvbnN0IHkgPSB0ZXh0WSAtIHJvb3RZO1xuXG4gICAgLy8gR2V0IGZvbnQgc2l6ZXMgcmFuZ2VzXG4gICAgY29uc3QgcmFuZ2VTdHlsZXMgPSBnZXRUZXh0UmFuZ2VWYWx1ZXModGV4dE5vZGUpO1xuICAgIHRleHRDb2xsZWN0aW9uLnB1c2goe1xuICAgICAgeCxcbiAgICAgIHksXG4gICAgICB3aWR0aCxcbiAgICAgIGhlaWdodCxcbiAgICAgIGNoYXJhY3RlcnMsXG4gICAgICB0ZXh0QWxpZ25Ib3Jpem9udGFsLFxuICAgICAgdGV4dEFsaWduVmVydGljYWwsXG4gICAgICBjb25zdHJhaW50cyxcbiAgICAgIHJhbmdlU3R5bGVzLFxuICAgICAgaWQsXG4gICAgICAuLi5zdHJva2VEZXRhaWxzLFxuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIHRleHRDb2xsZWN0aW9uO1xufVxuIiwgImltcG9ydCB7IHNldEhlYWRsaW5lc0FuZFNvdXJjZVByb3BzLCBJRnJhbWVEYXRhIH0gZnJvbSBcInR5cGVzXCI7XG5pbXBvcnQgeyBnZXROb2RlVGV4dCwgZ2V0VGV4dE5vZGVzRnJvbUZyYW1lIH0gZnJvbSBcImhlbHBlcnMvZmlnbWFUZXh0XCI7XG5pbXBvcnQgeyBIRUFETElORV9OT0RFX05BTUVTLCBNU0dfRVZFTlRTIH0gZnJvbSBcIi4vY29uc3RhbnRzXCI7XG5pbXBvcnQgeyBwb3N0TWFuIH0gZnJvbSBcInV0aWxzL21lc3NhZ2VzXCI7XG5pbXBvcnQgeyByZXNpemVBbmRPcHRpbWlzZUltYWdlIH0gZnJvbSBcIi4vaGVscGVycy9pbWFnZUhlbHBlclwiO1xuXG4vKipcbiAqIENvbXByZXNzIGltYWdlIHVzaW5nIGJyb3dzZXIncyBuYXRpdmUgaW1hZ2UgZGVjb2Rpbmcgc3VwcG9ydFxuICogQGNvbnRleHQgQnJvd3NlciAoVUkpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21wcmVzc0ltYWdlKHByb3BzOiB7XG4gIGltZ0RhdGE6IFVpbnQ4QXJyYXk7XG4gIG5vZGVEaW1lbnNpb25zOiB7IHdpZHRoOiBudW1iZXI7IGhlaWdodDogbnVtYmVyIH1bXTtcbn0pOiBQcm9taXNlPFVpbnQ4QXJyYXk+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBjb25zdCBpbWcgPSBuZXcgSW1hZ2UoKTtcbiAgICBjb25zdCB7IGltZ0RhdGEsIG5vZGVEaW1lbnNpb25zIH0gPSBwcm9wcztcblxuICAgIGltZy5hZGRFdmVudExpc3RlbmVyKFwibG9hZFwiLCAoKSA9PiB7XG4gICAgICByZXNpemVBbmRPcHRpbWlzZUltYWdlKHtcbiAgICAgICAgaW1nLFxuICAgICAgICBpbWdEYXRhLFxuICAgICAgICBub2RlRGltZW5zaW9ucyxcbiAgICAgICAgcmVzb2x2ZSxcbiAgICAgICAgcmVqZWN0LFxuICAgICAgfSkuY2F0Y2goKGVycikgPT4gcmVqZWN0KGVycikpO1xuICAgIH0pO1xuXG4gICAgaW1nLmFkZEV2ZW50TGlzdGVuZXIoXCJlcnJvclwiLCAoZXJyKSA9PiB7XG4gICAgICBjb25zb2xlLmVycm9yKFwiRXJyb3IgbG9hZGluZyBjb21wcmVzc2VkIGltYWdlXCIpO1xuICAgICAgcmVqZWN0KGVycik7XG4gICAgfSk7XG5cbiAgICBjb25zdCBibG9iID0gbmV3IEJsb2IoW2ltZ0RhdGFdLCB7IHR5cGU6IFwiaW1hZ2UvcG5nXCIgfSk7XG4gICAgY29uc3QgaW1nVXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcbiAgICBpbWcuc3JjID0gaW1nVXJsO1xuICB9KTtcbn1cblxuLyoqXG4gKiBUZXN0IGlmIEZpZ21hIG5vZGUgc3VwcG9ydHMgZmlsbCBwcm9wZXJ0eSB0eXBlXG4gKi9cbmZ1bmN0aW9uIHN1cHBvcnRzRmlsbHMoXG4gIG5vZGU6IFNjZW5lTm9kZVxuKTogbm9kZSBpcyBFeGNsdWRlPFNjZW5lTm9kZSwgU2xpY2VOb2RlIHwgR3JvdXBOb2RlPiB7XG4gIHJldHVybiBub2RlLnR5cGUgIT09IFwiU0xJQ0VcIiAmJiBub2RlLnR5cGUgIT09IFwiR1JPVVBcIjtcbn1cblxuLyoqXG4gKiBSZW5kZXIgYWxsIHNwZWNpZmllZCBmcmFtZXMgb3V0IGFzIFNWRyBlbGVtZW50LlxuICogSW1hZ2VzIGFyZSBvcHRpbWlzZWQgZm9yIHNpemUgYW5kIGltYWdlIHR5cGUgY29tcHJlc3Npb24gdmlhIHRoZSBmcm9udGVuZCBVSVxuICpcbiAqIEBjb250ZXh0IGZpZ21hXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZW5kZXJGcmFtZXMoZnJhbWVJZHM6IHN0cmluZ1tdKTogUHJvbWlzZTxVaW50OEFycmF5PiB7XG4gIGNvbnN0IG91dHB1dE5vZGUgPSBmaWdtYS5jcmVhdGVGcmFtZSgpO1xuICBvdXRwdXROb2RlLm5hbWUgPSBcIm91dHB1dFwiO1xuXG4gIHRyeSB7XG4gICAgLy8gQ2xvbmUgZWFjaCBzZWxlY3RlZCBmcmFtZSBhZGRpbmcgdGhlbSB0byB0aGUgdGVtcG9yYXJ5IGNvbnRhaW5lciBmcmFtZVxuICAgIGNvbnN0IGZyYW1lcyA9IGZpZ21hLmN1cnJlbnRQYWdlLmZpbmRBbGwoKHsgaWQgfSkgPT4gZnJhbWVJZHMuaW5jbHVkZXMoaWQpKTtcblxuICAgIC8vIENhbGN1bGF0ZSB0aGUgbWF4IGRpbWVuc2lvbnMgZm9yIG91dHB1dCBjb250YWluZXIgZnJhbWVcbiAgICBjb25zdCBtYXhXaWR0aCA9IE1hdGgubWF4KC4uLmZyYW1lcy5tYXAoKGYpID0+IGYud2lkdGgpKTtcbiAgICBjb25zdCBtYXhIZWlnaHQgPSBNYXRoLm1heCguLi5mcmFtZXMubWFwKChmKSA9PiBmLmhlaWdodCkpO1xuICAgIG91dHB1dE5vZGUucmVzaXplV2l0aG91dENvbnN0cmFpbnRzKG1heFdpZHRoLCBtYXhIZWlnaHQpO1xuXG4gICAgZm9yIChjb25zdCBmcmFtZSBvZiBmcmFtZXMpIHtcbiAgICAgIGNvbnN0IGNsb25lID0gZnJhbWU/LmNsb25lKCkgYXMgRnJhbWVOb2RlO1xuXG4gICAgICAvLyBOT1RFOiBQcmV2aW91c2x5IHRleHQgbm9kZXMgd2VyZSByZW1vdmVkIGhlcmUgYnV0IHRoaXMgY2F1c2VkXG4gICAgICAvLyB3aWR0aCBjaGFuZ2VzIGluIGF1dG8tbGF5b3V0LiBUZXh0IGlzIHJlbW92ZWQgYXMgcGFydCBvZiB0aGVcbiAgICAgIC8vIFNWRyBvcHRpbWlzYXRpb24gc3RlcC5cblxuICAgICAgLy8gQXBwZW5kIGNsb25lZCBmcmFtZSB0byB0ZW1wIG91dHB1dCBmcmFtZSBhbmQgcG9zaXRpb24gaW4gdG9wIGxlZnRcbiAgICAgIG91dHB1dE5vZGUuYXBwZW5kQ2hpbGQoY2xvbmUpO1xuICAgICAgY2xvbmUueCA9IDA7XG4gICAgICBjbG9uZS55ID0gMDtcblxuICAgICAgLy8gU3RvcmUgdGhlIGZyYW1lIElEIGFzIG5vZGUgbmFtZSAoZXhwb3J0ZWQgaW4gU1ZHIHByb3BzKVxuICAgICAgY2xvbmUubmFtZSA9IGZyYW1lLmlkO1xuICAgIH1cblxuICAgIC8vIEZpbmQgYWxsIG5vZGVzIHdpdGggaW1hZ2UgZmlsbHNcbiAgICBjb25zdCBub2Rlc1dpdGhJbWFnZXMgPSBvdXRwdXROb2RlLmZpbmRBbGwoXG4gICAgICAobm9kZSkgPT5cbiAgICAgICAgc3VwcG9ydHNGaWxscyhub2RlKSAmJlxuICAgICAgICBub2RlLmZpbGxzICE9PSBmaWdtYS5taXhlZCAmJlxuICAgICAgICBub2RlLmZpbGxzLnNvbWUoKGZpbGwpID0+IGZpbGwudHlwZSA9PT0gXCJJTUFHRVwiKVxuICAgICk7XG5cbiAgICAvLyBBIHNpbmdsZSBpbWFnZSBjYW4gYmUgdXNlZCBtdWx0aXBsZSB0aW1lcyBvbiBkaWZmZXJlbnQgbm9kZXMgaW4gZGlmZmVyZW50XG4gICAgLy8gZnJhbWVzLiBUbyBlbnN1cmUgaW1hZ2VzIGFyZSBvbmx5IG9wdGltaXNlZCBvbmNlIGEgY2FjaGUgaXMgY3JlYXRlZFxuICAgIC8vIG9mIHVuaXF1ZSBpbWFnZXMgYW5kIHVzZWQgdG8gcmVwbGFjZSBvcmlnaW5hbCBhZnRlciB0aGUgYXN5bmMgcHJvY2Vzc2luZ1xuICAgIC8vIGlzIGNvbXBsZXRlZC5cbiAgICBjb25zdCBpbWFnZUNhY2hlOiB7XG4gICAgICBbaWQ6IHN0cmluZ106IHsgd2lkdGg6IG51bWJlcjsgaGVpZ2h0OiBudW1iZXI7IGlkOiBzdHJpbmcgfVtdO1xuICAgIH0gPSB7fTtcblxuICAgIGZvciAoY29uc3Qgbm9kZSBvZiBub2Rlc1dpdGhJbWFnZXMpIHtcbiAgICAgIGlmIChzdXBwb3J0c0ZpbGxzKG5vZGUpICYmIG5vZGUuZmlsbHMgIT09IGZpZ21hLm1peGVkKSB7XG4gICAgICAgIC8vIFRoZSBmcm9udGVuZCBVSSB3aGljaCBoYW5kbGVzIHRoZSBpbWFnZSBvcHRpbWlzYXRpb24gbmVlZHMgdG8ga25vd1xuICAgICAgICAvLyB0aGUgc2l6ZXMgb2YgZWFjaCBub2RlIHRoYXQgdXNlcyB0aGUgaW1hZ2UuIFRoZSBkaW1lbnNpb25zIGFyZSBzdG9yZWRcbiAgICAgICAgLy8gd2l0aCB0aGUgaW1hZ2UgaGFzaCBJRCBpbiB0aGUgY2FjaGUgZm9yIGxhdGVyIHVzZS5cbiAgICAgICAgY29uc3QgZGltZW5zaW9ucyA9IHtcbiAgICAgICAgICB3aWR0aDogbm9kZS53aWR0aCxcbiAgICAgICAgICBoZWlnaHQ6IG5vZGUuaGVpZ2h0LFxuICAgICAgICAgIGlkOiBub2RlLmlkLFxuICAgICAgICB9O1xuICAgICAgICBjb25zdCBpbWdQYWludCA9IFsuLi5ub2RlLmZpbGxzXS5maW5kKChwKSA9PiBwLnR5cGUgPT09IFwiSU1BR0VcIik7XG5cbiAgICAgICAgaWYgKGltZ1BhaW50Py50eXBlID09PSBcIklNQUdFXCIgJiYgaW1nUGFpbnQuaW1hZ2VIYXNoKSB7XG4gICAgICAgICAgLy8gQWRkIHRoZSBpbWFnZSBkaW1lbnNpb25zIHRvIHRoZSBjYWNoZSwgb3IgdXBkYXRlIGFuZCBleGlzdGluZyBjYWNoZVxuICAgICAgICAgIC8vIGl0ZW0gd2l0aCBhbm90aGVyIG5vZGVzIGRpbWVuc2lvbnNcbiAgICAgICAgICBpZiAoaW1hZ2VDYWNoZVtpbWdQYWludC5pbWFnZUhhc2hdKSB7XG4gICAgICAgICAgICBpbWFnZUNhY2hlW2ltZ1BhaW50LmltYWdlSGFzaF0ucHVzaChkaW1lbnNpb25zKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaW1hZ2VDYWNoZVtpbWdQYWludC5pbWFnZUhhc2hdID0gW2RpbWVuc2lvbnNdO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFNlbmQgZWFjaCBpbWFnZSBmcm9tIHRoZSBpbWFnZUNhY2hlIHRvIHRoZSBmcm9udGVuZCBmb3Igb3B0aW1pc2F0aW9uLlxuICAgIC8vIFRoZSBvcGVyYXRpb24gaXMgYXN5bmMgYW5kIGNhbiB0YWtlIHNvbWUgdGltZSBpZiB0aGUgaW1hZ2VzIGFyZSBsYXJnZS5cbiAgICBmb3IgKGNvbnN0IGltYWdlSGFzaCBpbiBpbWFnZUNhY2hlKSB7XG4gICAgICBjb25zdCBieXRlcyA9IGF3YWl0IGZpZ21hLmdldEltYWdlQnlIYXNoKGltYWdlSGFzaCkuZ2V0Qnl0ZXNBc3luYygpO1xuICAgICAgY29uc3QgY29tcHJlc3NlZEltYWdlOiBVaW50OEFycmF5ID0gYXdhaXQgcG9zdE1hbi5zZW5kKHtcbiAgICAgICAgd29ya2xvYWQ6IE1TR19FVkVOVFMuQ09NUFJFU1NfSU1BR0UsXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICBpbWdEYXRhOiBieXRlcyxcbiAgICAgICAgICBub2RlRGltZW5zaW9uczogaW1hZ2VDYWNoZVtpbWFnZUhhc2hdLFxuICAgICAgICB9LFxuICAgICAgfSk7XG5cbiAgICAgIC8vIFN0b3JlIHRoZSBuZXcgaW1hZ2UgaW4gZmlnbWEgYW5kIGdldCB0aGUgbmV3IGltYWdlIGhhc2hcbiAgICAgIGNvbnN0IG5ld0ltYWdlSGFzaCA9IGZpZ21hLmNyZWF0ZUltYWdlKGNvbXByZXNzZWRJbWFnZSkuaGFzaDtcblxuICAgICAgLy8gVXBkYXRlIG5vZGVzIHdpdGggbmV3IGltYWdlIHBhaW50IGZpbGxcbiAgICAgIG5vZGVzV2l0aEltYWdlcy5mb3JFYWNoKChub2RlKSA9PiB7XG4gICAgICAgIGlmIChzdXBwb3J0c0ZpbGxzKG5vZGUpICYmIG5vZGUuZmlsbHMgIT09IGZpZ21hLm1peGVkKSB7XG4gICAgICAgICAgY29uc3QgaW1nUGFpbnQgPSBbLi4ubm9kZS5maWxsc10uZmluZChcbiAgICAgICAgICAgIChwKSA9PiBwLnR5cGUgPT09IFwiSU1BR0VcIiAmJiBwLmltYWdlSGFzaCA9PT0gaW1hZ2VIYXNoXG4gICAgICAgICAgKTtcblxuICAgICAgICAgIGlmIChpbWdQYWludCkge1xuICAgICAgICAgICAgY29uc3QgbmV3UGFpbnQgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGltZ1BhaW50KSk7XG4gICAgICAgICAgICBuZXdQYWludC5pbWFnZUhhc2ggPSBuZXdJbWFnZUhhc2g7XG4gICAgICAgICAgICBub2RlLmZpbGxzID0gW25ld1BhaW50XTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEhBQ0shIEZpZ21hIHRha2VzIHNvbWUgdGltZSB0byB1cGRhdGUgdGhlIGltYWdlIGZpbGxzLiBXYWl0aW5nIHNvbWVcbiAgICAvLyBhbW91bnQgaXMgcmVxdWlyZWQgb3RoZXJ3aXNlIHRoZSBpbWFnZXMgYXBwZWFyIGJsYW5rLlxuICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDMwMCkpO1xuXG4gICAgLy8gUmVuZGVyIG91dHB1dCBjb250YWluZXIgZnJhbWVzIHRvIFNWRyBtYXJrLXVwIChpbiBhIHVpbnQ4IGJ5dGUgYXJyYXkpXG4gICAgY29uc3Qgc3ZnID0gYXdhaXQgb3V0cHV0Tm9kZS5leHBvcnRBc3luYyh7XG4gICAgICBmb3JtYXQ6IFwiU1ZHXCIsXG4gICAgICBzdmdTaW1wbGlmeVN0cm9rZTogdHJ1ZSxcbiAgICAgIHN2Z091dGxpbmVUZXh0OiBmYWxzZSxcbiAgICAgIHN2Z0lkQXR0cmlidXRlOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHN2ZztcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGVycik7XG4gIH0gZmluYWxseSB7XG4gICAgLy8gUmVtb3ZlIHRoZSBvdXRwdXQgZnJhbWUgd2hhdGV2ZXIgaGFwcGVuc1xuICAgIG91dHB1dE5vZGUucmVtb3ZlKCk7XG4gIH1cbn1cblxuLyoqXG4gKiBDcmVhdGUsIHVwZGF0ZSBvciBkZWxldGUgaGVhZGxpbmUgdGV4dCBpbiBmaWdtYSBkb2N1bWVudCBmcm9tIHBsdWdpbiBVSVxuICpcbiAqIEBjb250ZXh0IGZpZ21hXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXRIZWFkbGluZXNBbmRTb3VyY2UocHJvcHM6IHNldEhlYWRsaW5lc0FuZFNvdXJjZVByb3BzKTogdm9pZCB7XG4gIGNvbnN0IHBhZ2VOb2RlID0gZmlnbWEuY3VycmVudFBhZ2U7XG4gIGNvbnN0IG1vc3RMZWZ0UG9zID0gTWF0aC5taW4oLi4ucGFnZU5vZGUuY2hpbGRyZW4ubWFwKChub2RlKSA9PiBub2RlLngpKTtcbiAgY29uc3QgbW9zdFRvcFBvcyA9IE1hdGgubWluKC4uLnBhZ2VOb2RlLmNoaWxkcmVuLm1hcCgobm9kZSkgPT4gbm9kZS55KSk7XG5cbiAgLy8gTG9vcCB0aHJvdWdoIGVhY2ggaGVhZGxpbmUgbm9kZSBuYW1lc1xuICBmb3IgKGNvbnN0IG5hbWUgb2YgT2JqZWN0LnZhbHVlcyhIRUFETElORV9OT0RFX05BTUVTKSkge1xuICAgIGxldCBub2RlID1cbiAgICAgIChwYWdlTm9kZS5maW5kQ2hpbGQoXG4gICAgICAgIChub2RlKSA9PiBub2RlLm5hbWUgPT09IG5hbWUgJiYgbm9kZS50eXBlID09PSBcIlRFWFRcIlxuICAgICAgKSBhcyBUZXh0Tm9kZSkgfHwgbnVsbDtcbiAgICBjb25zdCB0ZXh0Q29udGVudCA9IHByb3BzW25hbWVdO1xuXG4gICAgLy8gUmVtb3ZlIG5vZGUgaWYgdGhlcmUncyBubyB0ZXh0IGNvbnRlbnRcbiAgICBpZiAobm9kZSAmJiAhdGV4dENvbnRlbnQpIHtcbiAgICAgIG5vZGUucmVtb3ZlKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gRG8gbm90aGluZyBpcyB0aGVyZSdzIG5vIHRleHQgY29udGVudFxuICAgIGlmICghdGV4dENvbnRlbnQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgbm9kZSBpZiBpdCBkb2Vzbid0IGFscmVhZHkgZXhpc3RcbiAgICBpZiAoIW5vZGUpIHtcbiAgICAgIG5vZGUgPSBmaWdtYS5jcmVhdGVUZXh0KCk7XG4gICAgICBub2RlLm5hbWUgPSBuYW1lO1xuXG4gICAgICAvLyBQb3NpdGlvbiBuZXcgdGV4dCBub2RlIHRvcC1sZWZ0IG9mIHRoZSBmaXJzdCBmcmFtZSBpbiB0aGUgcGFnZVxuICAgICAgbGV0IHkgPSBtb3N0VG9wUG9zIC0gNjA7XG4gICAgICBpZiAobmFtZSA9PT0gSEVBRExJTkVfTk9ERV9OQU1FUy5IRUFETElORSkge1xuICAgICAgICB5IC09IDYwO1xuICAgICAgfSBlbHNlIGlmIChuYW1lID09PSBIRUFETElORV9OT0RFX05BTUVTLlNVQkhFQUQpIHtcbiAgICAgICAgeSAtPSAzMDtcbiAgICAgIH1cblxuICAgICAgbm9kZS5yZWxhdGl2ZVRyYW5zZm9ybSA9IFtcbiAgICAgICAgWzEsIDAsIG1vc3RMZWZ0UG9zXSxcbiAgICAgICAgWzAsIDEsIHldLFxuICAgICAgXTtcbiAgICB9XG5cbiAgICAvLyBFbnN1cmUgdGV4dCBub2RlIGlzIGxvY2tlZFxuICAgIG5vZGUubG9ja2VkID0gdHJ1ZTtcblxuICAgIC8vIExvYWQgZm9udFxuICAgIGNvbnN0IGZvbnROYW1lID1cbiAgICAgIG5vZGUuZm9udE5hbWUgIT09IGZpZ21hLm1peGVkID8gbm9kZS5mb250TmFtZS5mYW1pbHkgOiBcIlJvYm90b1wiO1xuICAgIGNvbnN0IGZvbnRTdHlsZSA9XG4gICAgICBub2RlLmZvbnROYW1lICE9PSBmaWdtYS5taXhlZCA/IG5vZGUuZm9udE5hbWUuc3R5bGUgOiBcIlJlZ3VsYXJcIjtcbiAgICBmaWdtYVxuICAgICAgLmxvYWRGb250QXN5bmMoeyBmYW1pbHk6IGZvbnROYW1lLCBzdHlsZTogZm9udFN0eWxlIH0pXG4gICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgIC8vIFNldCB0ZXh0IG5vZGUgY29udGVudFxuICAgICAgICBub2RlLmNoYXJhY3RlcnMgPSBwcm9wc1tuYW1lXSB8fCBcIlwiO1xuICAgICAgfSlcbiAgICAgIC5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgdG8gbG9hZCBmb250XCIsIGVycik7XG4gICAgICB9KTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Um9vdEZyYW1lcygpOiBJRnJhbWVEYXRhIHtcbiAgY29uc3QgeyBjdXJyZW50UGFnZSB9ID0gZmlnbWE7XG5cbiAgbGV0IHNlbGVjdGVkRnJhbWVzID0gY3VycmVudFBhZ2Uuc2VsZWN0aW9uLmZpbHRlcihcbiAgICAobm9kZSkgPT4gbm9kZS50eXBlID09PSBcIkZSQU1FXCJcbiAgKSBhcyBGcmFtZU5vZGVbXTtcblxuICBpZiAoc2VsZWN0ZWRGcmFtZXMubGVuZ3RoID09PSAwKSB7XG4gICAgc2VsZWN0ZWRGcmFtZXMgPSBjdXJyZW50UGFnZS5jaGlsZHJlbi5maWx0ZXIoXG4gICAgICAobm9kZSkgPT4gbm9kZS50eXBlID09PSBcIkZSQU1FXCJcbiAgICApIGFzIEZyYW1lTm9kZVtdO1xuICB9XG5cbiAgY29uc3QgZnJhbWVzRGF0YSA9IHNlbGVjdGVkRnJhbWVzLm1hcCgoZnJhbWUpID0+IHtcbiAgICBjb25zdCB7IG5hbWUsIHdpZHRoLCBoZWlnaHQsIGlkIH0gPSBmcmFtZTtcbiAgICBjb25zdCB0ZXh0Tm9kZXMgPSBnZXRUZXh0Tm9kZXNGcm9tRnJhbWUoZnJhbWUpO1xuXG4gICAgY29uc3QgZml4ZWRQb3NpdGlvbk5vZGVzID0gZnJhbWUuY2hpbGRyZW5cbiAgICAgIC5zbGljZShmcmFtZS5jaGlsZHJlbi5sZW5ndGggLSBmcmFtZS5udW1iZXJPZkZpeGVkQ2hpbGRyZW4pXG4gICAgICAubWFwKChub2RlKSA9PiBub2RlLmlkKTtcblxuICAgIHJldHVybiB7XG4gICAgICBuYW1lLFxuICAgICAgd2lkdGgsXG4gICAgICBoZWlnaHQsXG4gICAgICBpZCxcbiAgICAgIHRleHROb2RlcyxcbiAgICAgIGZpeGVkUG9zaXRpb25Ob2RlcyxcbiAgICB9O1xuICB9KTtcblxuICByZXR1cm4ge1xuICAgIGZyYW1lczogZnJhbWVzRGF0YSxcbiAgICBoZWFkbGluZTogZ2V0Tm9kZVRleHQoY3VycmVudFBhZ2UsIEhFQURMSU5FX05PREVfTkFNRVMuSEVBRExJTkUpLFxuICAgIHN1YmhlYWQ6IGdldE5vZGVUZXh0KGN1cnJlbnRQYWdlLCBIRUFETElORV9OT0RFX05BTUVTLkhFQURMSU5FKSxcbiAgICBzb3VyY2U6IGdldE5vZGVUZXh0KGN1cnJlbnRQYWdlLCBIRUFETElORV9OT0RFX05BTUVTLkhFQURMSU5FKSxcbiAgfTtcbn1cbiIsICJpbXBvcnQgeyBNU0dfRVZFTlRTIH0gZnJvbSBcIi4vY29uc3RhbnRzXCI7XG5pbXBvcnQgeyBwb3N0TWFuIH0gZnJvbSBcIi4vdXRpbHMvbWVzc2FnZXNcIjtcbmltcG9ydCB7IGdldFJvb3RGcmFtZXMsIHJlbmRlckZyYW1lcywgc2V0SGVhZGxpbmVzQW5kU291cmNlIH0gZnJvbSBcIi4vaGVscGVyc1wiO1xuXG4vLyBSZWdpc3RlciBtZXNzZW5nZXIgZXZlbnQgZnVuY3Rpb25zXG5wb3N0TWFuLnJlZ2lzdGVyV29ya2VyKE1TR19FVkVOVFMuR0VUX1JPT1RfRlJBTUVTLCBnZXRSb290RnJhbWVzKTtcbnBvc3RNYW4ucmVnaXN0ZXJXb3JrZXIoTVNHX0VWRU5UUy5SRU5ERVIsIHJlbmRlckZyYW1lcyk7XG5wb3N0TWFuLnJlZ2lzdGVyV29ya2VyKE1TR19FVkVOVFMuVVBEQVRFX0hFQURMSU5FUywgc2V0SGVhZGxpbmVzQW5kU291cmNlKTtcblxuLy8gUmVuZGVyIHRoZSBET01cbmZpZ21hLnNob3dVSShfX2h0bWxfXyk7XG5cbi8vIFJlc2l6ZSBVSSB0byBtYXggdmlld3BvcnQgZGltZW5zaW9uc1xuY29uc3QgeyB3aWR0aCwgaGVpZ2h0IH0gPSBmaWdtYS52aWV3cG9ydC5ib3VuZHM7XG5jb25zdCB7IHpvb20gfSA9IGZpZ21hLnZpZXdwb3J0O1xuY29uc3QgaW5pdGlhbFdpbmRvd1dpZHRoID0gTWF0aC5yb3VuZCh3aWR0aCAqIHpvb20pO1xuY29uc3QgaW5pdGlhbFdpbmRvd0hlaWdodCA9IE1hdGgucm91bmQoaGVpZ2h0ICogem9vbSk7XG5maWdtYS51aS5yZXNpemUoaW5pdGlhbFdpbmRvd1dpZHRoLCBpbml0aWFsV2luZG93SGVpZ2h0KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7QUFBTyxNQUFLO0FBQUwsWUFBSztBQUNWO0FBQ0E7QUFDQTtBQUFBLEtBSFU7QUFNTCxNQUFLO0FBQUwsWUFBSztBQUNWO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFBQSxLQVJVO0FBV0wsTUFBSztBQUFMLFlBQUs7QUFDVjtBQUNBO0FBQUEsS0FGVTtBQXNCTCxNQUFLO0FBQUwsWUFBSztBQUNWLHVDQUFXO0FBQ1gsc0NBQVU7QUFDVixxQ0FBUztBQUFBLEtBSEM7OztBQ3ZDWjtBQUFBLElBbUJFLFlBQVk7QUFGSixxQkFBVTtBQWNWLHFCQUFVLE9BQU87QUEvQjNCO0FBZ0NJLGNBQU0sVUFBVSxLQUFLLGlCQUFpQixRQUFRLHFDQUFPLFNBQVAsbUJBQWE7QUFDM0QsY0FBTSxDQUFFLE1BQU0sVUFBVSxNQUFNLEtBQUssV0FBVyxPQUFRLFdBQVc7QUFFakU7QUFFRSxjQUFJLEtBQUssU0FBUztBQUFNO0FBRXhCLGNBQUksYUFBYSxDQUFDLEtBQUssY0FBYztBQUNuQyxrQkFBTSxJQUFJLE1BQU0scUJBQXFCO0FBQUE7QUFHdkMsY0FBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLFFBQVE7QUFDOUIsa0JBQU0sSUFBSSxNQUFNLDJCQUEyQjtBQUFBO0FBRzdDLGNBQUk7QUFD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
