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
        strokeWeight
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
        rangeStyles
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL2NvbnN0YW50cy50cyIsICJzcmMvdXRpbHMvbWVzc2FnZXMudHMiLCAic3JjL2hlbHBlcnMvZmlnbWFUZXh0LnRzIiwgInNyYy9oZWxwZXJzLnRzIiwgInNyYy9pbmRleC50c3giXSwKICAic291cmNlc0NvbnRlbnQiOiBbImV4cG9ydCBlbnVtIFNUQUdFUyB7XG4gIENIT09TRV9GUkFNRVMsXG4gIFJFU1BPTlNJVkVfUFJFVklFVyxcbiAgU0FWRV9PVVRQVVQsXG59XG5cbmV4cG9ydCBlbnVtIE1TR19FVkVOVFMge1xuICBGT1VORF9GUkFNRVMsXG4gIE5PX0ZSQU1FUyxcbiAgUkVOREVSLFxuICBDTE9TRSxcbiAgRVJST1IsXG4gIFVQREFURV9IRUFETElORVMsXG4gIENPTVBSRVNTX0lNQUdFLFxuICBHRVRfUk9PVF9GUkFNRVMsXG59XG5cbmV4cG9ydCBlbnVtIE9VVFBVVF9GT1JNQVRTIHtcbiAgSU5MSU5FLFxuICBJRlJBTUUsXG59XG5cbmV4cG9ydCBjb25zdCBVSV9URVhUID0ge1xuICBFUlJPUl9VTkVYUEVDVEVEOiBcIlVuZXhwZWN0ZWQgZXJyb3JcIixcbiAgRVJST1JfTUlTU0lOR19GUkFNRVM6IFwiTm8gZnJhbWVzIGZvdW5kLiBQbGVhc2UgYWRkIHNvbWUgZnJhbWVzIHRvIHRoZSBwYWdlLlwiLFxuICBXQVJOX05PX1RBUkdFVFM6IFwiU3RhbmRhcmQgZnJhbWVzIG5vdCBmb3VuZC4gUGxlYXNlIHNlbGVjdCB0YXJnZXQgZnJhbWVzLlwiLFxuICBXQVJOX1RPT19NQU5ZX1RBUkdFVFM6IFwiUGxlYXNlIHNlbGVjdCB0aHJlZSB0YXJnZXQgZnJhbWVzXCIsXG4gIElORk9fUFJFVklFVzogXCJQcmV2aWV3IGVhY2ggZnJhbWUgb3V0cHV0XCIsXG4gIFRJVExFX0NIT09TRV9GUkFNRTogXCJDaG9vc2Ugd2hpY2ggZnJhbWVzIHRvIGV4cG9ydFwiLFxuICBUSVRMRV9QUkVWSUVXOiBcIlByZXZpZXdcIixcbiAgVElUTEVfUkVTUE9OU0lWRV9QUkVWSUVXOiBcIlJlc3BvbnNpdmUgcHJldmlld1wiLFxuICBUSUxFX09VVFBVVDogXCJFeHBvcnRcIixcbiAgQlVUVE9OX05FWFQ6IFwiTmV4dFwiLFxuICBCVVRUT05fRE9XTkxPQUQ6IFwiRG93bmxvYWRcIixcbiAgQlVUVE9OX1BSRVZJT1VTOiBcIkJhY2tcIixcbn07XG5cbmV4cG9ydCBjb25zdCBGUkFNRV9XQVJOSU5HX1NJWkUgPSAzMDA7XG5cbmV4cG9ydCBlbnVtIEhFQURMSU5FX05PREVfTkFNRVMge1xuICBIRUFETElORSA9IFwiaGVhZGxpbmVcIixcbiAgU1VCSEVBRCA9IFwic3ViaGVhZFwiLFxuICBTT1VSQ0UgPSBcInNvdXJjZVwiLFxufVxuIiwgImltcG9ydCB7IE1TR19FVkVOVFMgfSBmcm9tIFwiLi4vY29uc3RhbnRzXCI7XG5cbmludGVyZmFjZSBJUG9zdG1hbk1lc3NhZ2Uge1xuICBuYW1lOiBzdHJpbmc7XG4gIHVpZDogc3RyaW5nO1xuICB3b3JrbG9hZDogTVNHX0VWRU5UUztcbiAgZGF0YTogYW55O1xuICByZXR1cm5pbmc/OiBib29sZWFuO1xuICBlcnI/OiBzdHJpbmc7XG59XG5cbmNsYXNzIFBvc3RtYW4ge1xuICBwcml2YXRlIG5hbWU6IHN0cmluZztcbiAgcHJpdmF0ZSBpbkZpZ21hU2FuZGJveDogYm9vbGVhbjtcbiAgcHJpdmF0ZSBjYWxsYmFja1N0b3JlOiB7IFtpZDogc3RyaW5nXTogRnVuY3Rpb24gfTtcbiAgcHJpdmF0ZSB3b3JrZXJzOiB7IFtpZDogc3RyaW5nXTogRnVuY3Rpb24gfTtcblxuICBwcml2YXRlIFRJTUVPVVQgPSAzMDAwMDtcblxuICBjb25zdHJ1Y3Rvcihwcm9wcz86IHsgbWVzc2FnZU5hbWU/OiBzdHJpbmc7IHNjb3BlOiBudWxsIH0pIHtcbiAgICB0aGlzLm5hbWUgPSBwcm9wcz8ubWVzc2FnZU5hbWUgfHwgXCJQT1NUTUFOXCI7XG4gICAgdGhpcy5pbkZpZ21hU2FuZGJveCA9IHR5cGVvZiBmaWdtYSA9PT0gXCJvYmplY3RcIjtcbiAgICB0aGlzLmNhbGxiYWNrU3RvcmUgPSB7fTtcbiAgICB0aGlzLndvcmtlcnMgPSB7fTtcblxuICAgIC8vIEFkZCBtZXNzYWdlIGV2ZW50IGxpc3RlbmVyXG4gICAgdGhpcy5pbkZpZ21hU2FuZGJveFxuICAgICAgPyBmaWdtYS51aS5vbihcIm1lc3NhZ2VcIiwgdGhpcy5yZWNlaXZlKVxuICAgICAgOiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgdGhpcy5yZWNlaXZlKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVjZWl2ZSA9IGFzeW5jIChldmVudDogTWVzc2FnZUV2ZW50PElQb3N0bWFuTWVzc2FnZT4pID0+IHtcbiAgICBjb25zdCBtc2dCb2R5ID0gdGhpcy5pbkZpZ21hU2FuZGJveCA/IGV2ZW50IDogZXZlbnQ/LmRhdGE/LnBsdWdpbk1lc3NhZ2U7XG4gICAgY29uc3QgeyBkYXRhLCB3b3JrbG9hZCwgbmFtZSwgdWlkLCByZXR1cm5pbmcsIGVyciB9ID0gbXNnQm9keSB8fCB7fTtcblxuICAgIHRyeSB7XG4gICAgICAvLyBEbyBub3RoaW5nIGlkIHBvc3QgbWVzc2FnZSBpc24ndCBmb3IgdXNcbiAgICAgIGlmICh0aGlzLm5hbWUgIT09IG5hbWUpIHJldHVybjtcblxuICAgICAgaWYgKHJldHVybmluZyAmJiAhdGhpcy5jYWxsYmFja1N0b3JlW3VpZF0pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIGNhbGxiYWNrOiAke3VpZH1gKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFyZXR1cm5pbmcgJiYgIXRoaXMud29ya2Vyc1t3b3JrbG9hZF0pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyB3b3JrbG9hZCByZWdpc3RlcmVkOiAke3dvcmtsb2FkfWApO1xuICAgICAgfVxuXG4gICAgICBpZiAocmV0dXJuaW5nKSB7XG4gICAgICAgIHRoaXMuY2FsbGJhY2tTdG9yZVt1aWRdKGRhdGEsIGVycik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCB3b3JrbG9hZFJlc3VsdCA9IGF3YWl0IHRoaXMud29ya2Vyc1t3b3JrbG9hZF0oZGF0YSk7XG4gICAgICAgIHRoaXMucG9zdEJhY2soeyBkYXRhOiB3b3JrbG9hZFJlc3VsdCwgdWlkIH0pO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgdGhpcy5wb3N0QmFjayh7IHVpZCwgZXJyOiBcIlBvc3RtYW4gZmFpbGVkXCIgfSk7XG4gICAgICBjb25zb2xlLmVycm9yKFwiUG9zdG1hbiBmYWlsZWRcIiwgZXJyKTtcbiAgICB9XG4gIH07XG5cbiAgcHVibGljIHJlZ2lzdGVyV29ya2VyID0gKGV2ZW50VHlwZTogTVNHX0VWRU5UUywgZm46IEZ1bmN0aW9uKSA9PiB7XG4gICAgdGhpcy53b3JrZXJzW2V2ZW50VHlwZV0gPSBmbjtcbiAgfTtcblxuICBwcml2YXRlIHBvc3RCYWNrID0gKHByb3BzOiB7IHVpZDogc3RyaW5nOyBkYXRhPzogYW55OyBlcnI/OiBzdHJpbmcgfSkgPT5cbiAgICB0aGlzLnBvc3RNZXNzYWdlKHtcbiAgICAgIG5hbWU6IHRoaXMubmFtZSxcbiAgICAgIHVpZDogcHJvcHMudWlkLFxuICAgICAgZGF0YTogcHJvcHMuZGF0YSxcbiAgICAgIHJldHVybmluZzogdHJ1ZSxcbiAgICAgIGVycjogcHJvcHMuZXJyLFxuICAgIH0pO1xuXG4gIHByaXZhdGUgcG9zdE1lc3NhZ2UgPSAobWVzc2FnZUJvZHkpID0+XG4gICAgdGhpcy5pbkZpZ21hU2FuZGJveFxuICAgICAgPyBmaWdtYS51aS5wb3N0TWVzc2FnZShtZXNzYWdlQm9keSlcbiAgICAgIDogcGFyZW50LnBvc3RNZXNzYWdlKHsgcGx1Z2luTWVzc2FnZTogbWVzc2FnZUJvZHkgfSwgXCIqXCIpO1xuXG4gIHB1YmxpYyBzZW5kID0gKHByb3BzOiB7IHdvcmtsb2FkOiBNU0dfRVZFTlRTOyBkYXRhPzogYW55IH0pOiBQcm9taXNlPGFueT4gPT4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCB7IHdvcmtsb2FkLCBkYXRhIH0gPSBwcm9wcztcblxuICAgICAgY29uc3QgcmFuZG9tSWQgPSBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHIoNSk7XG5cbiAgICAgIHRoaXMucG9zdE1lc3NhZ2Uoe1xuICAgICAgICBuYW1lOiB0aGlzLm5hbWUsXG4gICAgICAgIHVpZDogcmFuZG9tSWQsXG4gICAgICAgIHdvcmtsb2FkLFxuICAgICAgICBkYXRhLFxuICAgICAgfSBhcyBJUG9zdG1hbk1lc3NhZ2UpO1xuXG4gICAgICB0aGlzLmNhbGxiYWNrU3RvcmVbcmFuZG9tSWRdID0gKHJlc3VsdDogYW55LCBlcnI/OiBzdHJpbmcpID0+IHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgc2V0VGltZW91dCgoKSA9PiByZWplY3QobmV3IEVycm9yKFwiVGltZWQgb3V0XCIpKSwgdGhpcy5USU1FT1VUKTtcbiAgICB9KTtcbiAgfTtcbn1cblxuZXhwb3J0IGNvbnN0IHBvc3RNYW4gPSBuZXcgUG9zdG1hbigpO1xuIiwgImltcG9ydCB7IHRleHREYXRhLCBJVGV4dFByb3AsIElUZXh0U3R5bGUgfSBmcm9tIFwidHlwZXNcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldE5vZGVUZXh0KFxuICByb290Tm9kZTogUGFnZU5vZGUsXG4gIG5vZGVOYW1lOiBzdHJpbmdcbik6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IGZvdW5kTm9kZSA9IHJvb3ROb2RlLmZpbmRDaGlsZCgobm9kZSkgPT4gbm9kZS5uYW1lID09PSBub2RlTmFtZSk7XG4gIHJldHVybiBmb3VuZE5vZGUgJiYgZm91bmROb2RlLnR5cGUgPT09IFwiVEVYVFwiXG4gICAgPyBmb3VuZE5vZGUuY2hhcmFjdGVyc1xuICAgIDogdW5kZWZpbmVkO1xufVxuXG4vLyBmdW5jdGlvbiBjYWxjdWxhdGVMZXR0ZXJTcGFjaW5nKFxuLy8gICBmb250RmFtaWx5OiBzdHJpbmcsXG4vLyAgIGxldHRlclNwYWNpbmc6IExldHRlclNwYWNpbmdcbi8vICkge1xuLy8gICBjb25zdCB7IHVuaXQ6IGxldHRlclVuaXQsIHZhbHVlOiBsZXR0ZXJWYWwgfSA9IGxldHRlclNwYWNpbmc7XG4vLyAgIGxldCBsZXR0ZXJTcGFjZVZhbHVlID0gXCIwXCI7XG5cbi8vICAgc3dpdGNoIChsZXR0ZXJVbml0KSB7XG4vLyAgICAgY2FzZSBcIlBJWEVMU1wiOlxuLy8gICAgICAgLy8gVE9ETzogRklYIE1FXG4vLyAgICAgICBpZiAoZm9udEZhbWlseSA9PT0gXCJUZWxlc2FucyBUZXh0XCIpIHtcbi8vICAgICAgICAgbGV0dGVyU3BhY2VWYWx1ZSA9IGAke2xldHRlclZhbCAtIDAuMzN9cHhgO1xuLy8gICAgICAgfSBlbHNlIGlmIChmb250RmFtaWx5ID09PSBcIlRlbGVzYW5zIEFnYXRlXCIpIHtcbi8vICAgICAgICAgbGV0dGVyU3BhY2VWYWx1ZSA9IGAke2xldHRlclZhbCAtIDAuMTl9cHhgO1xuLy8gICAgICAgfSBlbHNlIHtcbi8vICAgICAgICAgbGV0dGVyU3BhY2VWYWx1ZSA9IGAke2xldHRlclZhbH1weGA7XG4vLyAgICAgICB9XG4vLyAgICAgICBicmVhaztcbi8vICAgICBjYXNlIFwiUEVSQ0VOVFwiOlxuLy8gICAgICAgbGV0dGVyU3BhY2VWYWx1ZSA9IGAke2xldHRlclZhbCAvIDEwMH1lbWA7XG5cbi8vICAgICAgIGlmIChmb250RmFtaWx5ID09PSBcIlRlbGVzYW5zIFRleHRcIikge1xuLy8gICAgICAgICBsZXR0ZXJTcGFjZVZhbHVlID0gYCR7bGV0dGVyVmFsIC8gMTAwIC0gMC4wMjJ9ZW1gO1xuLy8gICAgICAgfSBlbHNlIGlmIChmb250RmFtaWx5ID09PSBcIlRlbGVzYW5zIEFnYXRlXCIpIHtcbi8vICAgICAgICAgbGV0dGVyU3BhY2VWYWx1ZSA9IGAke2xldHRlclZhbCAvIDEwMCAtIDAuMDE1fWVtYDtcbi8vICAgICAgIH0gZWxzZSB7XG4vLyAgICAgICAgIGxldHRlclNwYWNlVmFsdWUgPSBgJHtsZXR0ZXJWYWwgLyAxMDB9ZW1gO1xuLy8gICAgICAgfVxuLy8gICAgICAgYnJlYWs7XG4vLyAgICAgZGVmYXVsdDpcbi8vICAgICAgIGlmIChmb250RmFtaWx5ID09PSBcIlRlbGVzYW5zIFRleHRcIikge1xuLy8gICAgICAgICBsZXR0ZXJTcGFjZVZhbHVlID0gXCItMC4zN3B4XCI7XG4vLyAgICAgICB9IGVsc2UgaWYgKGZvbnRGYW1pbHkgPT09IFwiVGVsZXNhbnMgQWdhdGVcIikge1xuLy8gICAgICAgICBsZXR0ZXJTcGFjZVZhbHVlID0gXCItMC4xOXB4XCI7XG4vLyAgICAgICB9IGVsc2Uge1xuLy8gICAgICAgICBsZXR0ZXJTcGFjZVZhbHVlID0gYDBgO1xuLy8gICAgICAgfVxuLy8gICAgICAgYnJlYWs7XG4vLyAgIH1cblxuLy8gICByZXR1cm4gbGV0dGVyU3BhY2VWYWx1ZTtcbi8vIH1cblxuZW51bSBSQU5HRV9UWVBFUyB7XG4gIExFVFRFUl9TUEFDSU5HLFxuICBMSU5FX0hFSUdIVCxcbiAgRk9OVF9TSVpFLFxuICBDT0xPVVIsXG4gIEZPTlQsXG59XG5cbmZ1bmN0aW9uIGdldFJhbmdlVmFsKFxuICB0ZXh0Tm9kZTogVGV4dE5vZGUsXG4gIHJhbmdlVHlwZTogUkFOR0VfVFlQRVMsXG4gIHN0YXJ0OiBudW1iZXIsXG4gIGVuZDogbnVtYmVyXG4pIHtcbiAgc3dpdGNoIChyYW5nZVR5cGUpIHtcbiAgICBjYXNlIFJBTkdFX1RZUEVTLkxFVFRFUl9TUEFDSU5HOiB7XG4gICAgICBjb25zdCBsZXR0ZXJTcGFjZSA9IHRleHROb2RlLmdldFJhbmdlTGV0dGVyU3BhY2luZyhzdGFydCwgZW5kKTtcbiAgICAgIGlmIChsZXR0ZXJTcGFjZSA9PT0gZmlnbWEubWl4ZWQpIHtcbiAgICAgICAgcmV0dXJuIGxldHRlclNwYWNlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGxldHRlclNwYWNlLnVuaXQgPT09IFwiUEVSQ0VOVFwiXG4gICAgICAgICAgPyBgJHtsZXR0ZXJTcGFjZS52YWx1ZSAvIDEwMH1yZW1gXG4gICAgICAgICAgOiBgJHtsZXR0ZXJTcGFjZS52YWx1ZX1weGA7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY2FzZSBSQU5HRV9UWVBFUy5MSU5FX0hFSUdIVDoge1xuICAgICAgY29uc3QgbGluZUhlaWdodCA9IHRleHROb2RlLmdldFJhbmdlTGluZUhlaWdodChzdGFydCwgZW5kKTtcbiAgICAgIGlmIChsaW5lSGVpZ2h0ID09PSBmaWdtYS5taXhlZCkge1xuICAgICAgICByZXR1cm4gbGluZUhlaWdodDtcbiAgICAgIH0gZWxzZSBpZiAobGluZUhlaWdodC51bml0ID09PSBcIkFVVE9cIikge1xuICAgICAgICByZXR1cm4gXCJub3JtYWxcIjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBsaW5lSGVpZ2h0LnVuaXQgPT09IFwiUEVSQ0VOVFwiXG4gICAgICAgICAgPyBgJHtsaW5lSGVpZ2h0LnZhbHVlIC8gMTAwfXJlbWBcbiAgICAgICAgICA6IGAke2xpbmVIZWlnaHQudmFsdWV9cHhgO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNhc2UgUkFOR0VfVFlQRVMuRk9OVF9TSVpFOlxuICAgICAgcmV0dXJuIHRleHROb2RlLmdldFJhbmdlRm9udFNpemUoc3RhcnQsIGVuZCk7XG5cbiAgICBjYXNlIFJBTkdFX1RZUEVTLkNPTE9VUjoge1xuICAgICAgY29uc3QgcGFpbnQgPSB0ZXh0Tm9kZS5nZXRSYW5nZUZpbGxzKHN0YXJ0LCBlbmQpO1xuICAgICAgaWYgKHBhaW50ID09PSBmaWdtYS5taXhlZCkge1xuICAgICAgICByZXR1cm4gcGFpbnQ7XG4gICAgICB9IGVsc2UgaWYgKHBhaW50WzBdLnR5cGUgPT09IFwiU09MSURcIikge1xuICAgICAgICByZXR1cm4geyAuLi5wYWludFswXS5jb2xvciB9O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHsgcjogMCwgZzogMCwgYjogMCB9IGFzIFJHQjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjYXNlIFJBTkdFX1RZUEVTLkZPTlQ6XG4gICAgICByZXR1cm4gdGV4dE5vZGUuZ2V0UmFuZ2VGb250TmFtZShzdGFydCwgZW5kKTtcblxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldFR5cGVWYWx1ZXMoXG4gIHRleHROb2RlOiBUZXh0Tm9kZSxcbiAgcmFuZ2VUeXBlOiBSQU5HRV9UWVBFU1xuKTogSVRleHRQcm9wW10ge1xuICBjb25zdCB7IGNoYXJhY3RlcnMgfSA9IHRleHROb2RlO1xuXG4gIC8vIElmIHRoZXJlJ3Mgbm8gbWl4ZWQgc3R5bGUgdGhlbiBzaG9ydCBjaXJjdWl0IHJlc3BvbnNlXG4gIGNvbnN0IGZ1bGxSYW5nZVZhbHVlID0gZ2V0UmFuZ2VWYWwodGV4dE5vZGUsIHJhbmdlVHlwZSwgMCwgY2hhcmFjdGVycy5sZW5ndGgpO1xuICBpZiAoZnVsbFJhbmdlVmFsdWUgIT09IGZpZ21hLm1peGVkKSB7XG4gICAgcmV0dXJuIFt7IHN0YXJ0OiAwLCBlbmQ6IGNoYXJhY3RlcnMubGVuZ3RoLCB2YWx1ZTogZnVsbFJhbmdlVmFsdWUgfV07XG4gIH1cblxuICAvLyBUaGVyZSdzIG1peGVkIHN0eWxlcy4gR28gdGhyb3VnaCBlYWNoIGNoYXIgdG8gZXh0cmFjdCBzdHlsZSByYW5nZXNcbiAgLy8gQm9vdHN0cmFwIHJhbmdlIHZhbHVlcyB3aXRoIGZpcnN0IGNoYXJhY3RlciB3aGljaCBpcyBuZXZlciBtaXhlZCB0eXBlXG4gIGNvbnN0IHZhbHVlczogSVRleHRQcm9wW10gPSBbXG4gICAgeyBzdGFydDogMCwgZW5kOiAxLCB2YWx1ZTogZ2V0UmFuZ2VWYWwodGV4dE5vZGUsIHJhbmdlVHlwZSwgMCwgMSkgfSxcbiAgXTtcblxuICAvLyBMb29wIHRocm91Z2ggZWFjaCBjaGFyYWN0ZXIgdG8gZmluZCByYW5nZXMuXG4gIC8vIFdoZW4gYSBtaXhlZCByYW5nZSBpcyBmb3VuZCB1cGRhdGUgdGhlIGN1cnJlbnQgZW5kIHBvc2l0aW9uIGFuZFxuICAvLyBjcmVhdGUgYSBuZXcgcmFuZ2Ugd2l0aCB0aGUgbmV4dCBzdHlsZVxuICBmb3IgKGxldCBpID0gMTsgaSA8PSBjaGFyYWN0ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgcHJvcCA9IHZhbHVlc1t2YWx1ZXMubGVuZ3RoIC0gMV07XG5cbiAgICAvLyBVcGRhdGUgZW5kIHBvc2l0aW9uIG9mIGN1cnJlbnQgc3R5bGVcbiAgICBwcm9wLmVuZCA9IGk7XG5cbiAgICBjb25zdCBjdXJyZW50VmFsdWUgPSBnZXRSYW5nZVZhbCh0ZXh0Tm9kZSwgcmFuZ2VUeXBlLCBwcm9wLnN0YXJ0LCBpKTtcblxuICAgIGlmIChjdXJyZW50VmFsdWUgPT09IGZpZ21hLm1peGVkKSB7XG4gICAgICAvLyBTZXQgZW5kIG9mIHRoZSBjdXJyZW50IHJhbmdlXG4gICAgICBwcm9wLmVuZCA9IGkgLSAxO1xuXG4gICAgICAvLyBDcmVhdGUgYW5kIHN0b3JlIG5leHQgcmFuZ2Ugc3R5bGVcbiAgICAgIHZhbHVlcy5wdXNoKHtcbiAgICAgICAgc3RhcnQ6IGksXG4gICAgICAgIGVuZDogaSArIDEsXG4gICAgICAgIHZhbHVlOiBnZXRSYW5nZVZhbCh0ZXh0Tm9kZSwgcmFuZ2VUeXBlLCBpIC0gMSwgaSksXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdmFsdWVzO1xufVxuXG5mdW5jdGlvbiBmaW5kSXRlbUluUmFuZ2UoXG4gIGl0ZW1zOiBJVGV4dFByb3BbXSxcbiAgc3RhcnQ6IG51bWJlcixcbiAgZW5kOiBudW1iZXJcbik6IElUZXh0UHJvcCB8IHVuZGVmaW5lZCB7XG4gIHJldHVybiBpdGVtcy5maW5kKChpdGVtKSA9PiBzdGFydCA+PSBpdGVtLnN0YXJ0ICYmIGVuZCA8PSBpdGVtLmVuZCk7XG59XG5cbmZ1bmN0aW9uIGdldFRleHRSYW5nZVZhbHVlcyh0ZXh0Tm9kZTogVGV4dE5vZGUpOiBJVGV4dFN0eWxlW10ge1xuICBjb25zdCB7IGNoYXJhY3RlcnMgfSA9IHRleHROb2RlO1xuXG4gIGNvbnN0IHJhbmdlcyA9IHtcbiAgICBsZXR0ZXJTcGFjZTogZ2V0VHlwZVZhbHVlcyh0ZXh0Tm9kZSwgUkFOR0VfVFlQRVMuTEVUVEVSX1NQQUNJTkcpLFxuICAgIGxpbmVIZWlnaHQ6IGdldFR5cGVWYWx1ZXModGV4dE5vZGUsIFJBTkdFX1RZUEVTLkxJTkVfSEVJR0hUKSxcbiAgICBzaXplOiBnZXRUeXBlVmFsdWVzKHRleHROb2RlLCBSQU5HRV9UWVBFUy5GT05UX1NJWkUpLFxuICAgIGNvbG91cjogZ2V0VHlwZVZhbHVlcyh0ZXh0Tm9kZSwgUkFOR0VfVFlQRVMuQ09MT1VSKSxcbiAgICBmb250OiBnZXRUeXBlVmFsdWVzKHRleHROb2RlLCBSQU5HRV9UWVBFUy5GT05UKSxcbiAgfTtcblxuICAvLyBDb2xsZWN0IGFsbCBlbmQgaW5kZXhlZCwgc29ydCBhY2NlbmRpbmcgYW5kIHJlbW92ZSBkdXBsaWNhdGVzXG4gIGNvbnN0IGVuZHMgPSBPYmplY3QudmFsdWVzKHJhbmdlcylcbiAgICAuZmxhdE1hcCgocmFuZ2UpID0+IHJhbmdlLm1hcCgoaXRlbSkgPT4gaXRlbS5lbmQpKVxuICAgIC5zb3J0KChhLCBiKSA9PiAoYSA+IGIgPyAxIDogLTEpKVxuICAgIC5maWx0ZXIoKG4sIGksIHNlbGYpID0+IHNlbGYuaW5kZXhPZihuKSA9PT0gaSk7XG5cbiAgLy8gVE9ETzogU2ltcGxpZnkgZW5kIGluZGV4IGxvZ2ljXG4gIGNvbnN0IHN0eWxlcyA9IFtdO1xuICBsZXQgaVN0YXJ0ID0gMDtcbiAgZm9yIChsZXQgaUVuZCBvZiBlbmRzKSB7XG4gICAgaWYgKGlTdGFydCA9PT0gaUVuZCkge1xuICAgICAgaUVuZCsrO1xuICAgIH1cblxuICAgIGNvbnN0IHN0eWxlOiBJVGV4dFN0eWxlID0ge1xuICAgICAgc3RhcnQ6IGlTdGFydCxcbiAgICAgIGVuZDogaUVuZCxcbiAgICAgIGNoYXJzOiBjaGFyYWN0ZXJzLnN1YnN0cmluZyhpU3RhcnQsIGlFbmQpLFxuICAgICAgZm9udDogZmluZEl0ZW1JblJhbmdlKHJhbmdlcy5mb250LCBpU3RhcnQgKyAxLCBpRW5kKT8udmFsdWUsXG4gICAgICBjb2xvdXI6IGZpbmRJdGVtSW5SYW5nZShyYW5nZXMuY29sb3VyLCBpU3RhcnQgKyAxLCBpRW5kKT8udmFsdWUsXG4gICAgICBzaXplOiBmaW5kSXRlbUluUmFuZ2UocmFuZ2VzLnNpemUsIGlTdGFydCArIDEsIGlFbmQpPy52YWx1ZSxcbiAgICAgIGxldHRlclNwYWNlOiBmaW5kSXRlbUluUmFuZ2UocmFuZ2VzLmxldHRlclNwYWNlLCBpU3RhcnQgKyAxLCBpRW5kKT8udmFsdWUsXG4gICAgICBsaW5lSGVpZ2h0OiBmaW5kSXRlbUluUmFuZ2UocmFuZ2VzLmxpbmVIZWlnaHQsIGlTdGFydCArIDEsIGlFbmQpPy52YWx1ZSxcbiAgICB9O1xuXG4gICAgc3R5bGVzLnB1c2goc3R5bGUpO1xuICAgIGlTdGFydCA9IGlFbmQ7XG4gIH1cblxuICByZXR1cm4gc3R5bGVzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0VGV4dE5vZGVzRnJvbUZyYW1lKGZyYW1lOiBGcmFtZU5vZGUpOiB0ZXh0RGF0YVtdIHtcbiAgY29uc3QgdGV4dE5vZGVzID0gZnJhbWUuZmluZEFsbChcbiAgICAobm9kZSkgPT4gbm9kZS50eXBlID09PSBcIlRFWFRcIiAmJiBub2RlLmNoYXJhY3RlcnMubGVuZ3RoID4gMFxuICApIGFzIFRleHROb2RlW107XG4gIGNvbnN0IHsgYWJzb2x1dGVUcmFuc2Zvcm0gfSA9IGZyYW1lO1xuICBjb25zdCByb290WCA9IGFic29sdXRlVHJhbnNmb3JtWzBdWzJdO1xuICBjb25zdCByb290WSA9IGFic29sdXRlVHJhbnNmb3JtWzFdWzJdO1xuXG4gIGNvbnN0IHRleHRDb2xsZWN0aW9uOiB0ZXh0RGF0YVtdID0gW107XG4gIGZvciAoY29uc3QgdGV4dE5vZGUgb2YgdGV4dE5vZGVzKSB7XG4gICAgY29uc3Qge1xuICAgICAgYWJzb2x1dGVUcmFuc2Zvcm0sXG4gICAgICB3aWR0aCxcbiAgICAgIGhlaWdodCxcbiAgICAgIGNoYXJhY3RlcnMsXG4gICAgICB0ZXh0QWxpZ25Ib3Jpem9udGFsLFxuICAgICAgdGV4dEFsaWduVmVydGljYWwsXG4gICAgICBjb25zdHJhaW50cyxcbiAgICAgIHN0cm9rZXMsXG4gICAgICBzdHJva2VXZWlnaHQsXG4gICAgfSA9IHRleHROb2RlO1xuXG4gICAgY29uc29sZS5sb2coc3Ryb2tlcywgc3Ryb2tlV2VpZ2h0KTtcblxuICAgIGxldCBzdHJva2VEZXRhaWxzID0ge307XG5cbiAgICBjb25zdCBzdHJva2VDb2xvdXIgPSBzdHJva2VzLmZpbmQoXG4gICAgICAocGFpbnQpID0+IHBhaW50LnR5cGUgPT09IFwiU09MSURcIlxuICAgICkgYXMgU29saWRQYWludDtcblxuICAgIGlmIChzdHJva2VDb2xvdXIpIHtcbiAgICAgIHN0cm9rZURldGFpbHMgPSB7XG4gICAgICAgIHN0cm9rZVdlaWdodDogc3Ryb2tlV2VpZ2h0LFxuICAgICAgICBzdHJva2VDb2xvdXI6IGByZ2IoJHtPYmplY3QudmFsdWVzKHN0cm9rZUNvbG91ci5jb2xvcilcbiAgICAgICAgICAubWFwKCh2YWwpID0+IHZhbCAqIDI1NSlcbiAgICAgICAgICAuam9pbihcIixcIil9KWAsXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIE5PVEU6IEZpZ21hIG5vZGUgeCwgeSBhcmUgcmVsYXRpdmUgdG8gZmlyc3QgcGFyZW50LCB3ZSB3YW50IHRoZW1cbiAgICAvLyByZWxhdGl2ZSB0byB0aGUgcm9vdCBmcmFtZVxuICAgIGNvbnN0IHRleHRYID0gYWJzb2x1dGVUcmFuc2Zvcm1bMF1bMl07XG4gICAgY29uc3QgdGV4dFkgPSBhYnNvbHV0ZVRyYW5zZm9ybVsxXVsyXTtcbiAgICBjb25zdCB4ID0gdGV4dFggLSByb290WDtcbiAgICBjb25zdCB5ID0gdGV4dFkgLSByb290WTtcblxuICAgIC8vIEdldCBmb250IHNpemVzIHJhbmdlc1xuICAgIGNvbnN0IHJhbmdlU3R5bGVzID0gZ2V0VGV4dFJhbmdlVmFsdWVzKHRleHROb2RlKTtcbiAgICB0ZXh0Q29sbGVjdGlvbi5wdXNoKHtcbiAgICAgIHgsXG4gICAgICB5LFxuICAgICAgd2lkdGgsXG4gICAgICBoZWlnaHQsXG4gICAgICBjaGFyYWN0ZXJzLFxuICAgICAgdGV4dEFsaWduSG9yaXpvbnRhbCxcbiAgICAgIHRleHRBbGlnblZlcnRpY2FsLFxuICAgICAgY29uc3RyYWludHMsXG4gICAgICByYW5nZVN0eWxlcyxcbiAgICAgIC4uLnN0cm9rZURldGFpbHMsXG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gdGV4dENvbGxlY3Rpb247XG59XG4iLCAiaW1wb3J0IHsgc2V0SGVhZGxpbmVzQW5kU291cmNlUHJvcHMsIElGcmFtZURhdGEgfSBmcm9tIFwidHlwZXNcIjtcbmltcG9ydCB7IGdldE5vZGVUZXh0LCBnZXRUZXh0Tm9kZXNGcm9tRnJhbWUgfSBmcm9tIFwiaGVscGVycy9maWdtYVRleHRcIjtcbmltcG9ydCB7IEhFQURMSU5FX05PREVfTkFNRVMsIE1TR19FVkVOVFMgfSBmcm9tIFwiLi9jb25zdGFudHNcIjtcbmltcG9ydCB7IHBvc3RNYW4gfSBmcm9tIFwidXRpbHMvbWVzc2FnZXNcIjtcbmltcG9ydCB7IHJlc2l6ZUFuZE9wdGltaXNlSW1hZ2UgfSBmcm9tIFwiLi9oZWxwZXJzL2ltYWdlSGVscGVyXCI7XG5cbi8qKlxuICogQ29tcHJlc3MgaW1hZ2UgdXNpbmcgYnJvd3NlcidzIG5hdGl2ZSBpbWFnZSBkZWNvZGluZyBzdXBwb3J0XG4gKiBAY29udGV4dCBCcm93c2VyIChVSSlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXByZXNzSW1hZ2UocHJvcHM6IHtcbiAgaW1nRGF0YTogVWludDhBcnJheTtcbiAgbm9kZURpbWVuc2lvbnM6IHsgd2lkdGg6IG51bWJlcjsgaGVpZ2h0OiBudW1iZXIgfVtdO1xufSk6IFByb21pc2U8VWludDhBcnJheT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNvbnN0IGltZyA9IG5ldyBJbWFnZSgpO1xuICAgIGNvbnN0IHsgaW1nRGF0YSwgbm9kZURpbWVuc2lvbnMgfSA9IHByb3BzO1xuXG4gICAgaW1nLmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsICgpID0+IHtcbiAgICAgIHJlc2l6ZUFuZE9wdGltaXNlSW1hZ2Uoe1xuICAgICAgICBpbWcsXG4gICAgICAgIGltZ0RhdGEsXG4gICAgICAgIG5vZGVEaW1lbnNpb25zLFxuICAgICAgICByZXNvbHZlLFxuICAgICAgICByZWplY3QsXG4gICAgICB9KS5jYXRjaCgoZXJyKSA9PiByZWplY3QoZXJyKSk7XG4gICAgfSk7XG5cbiAgICBpbWcuYWRkRXZlbnRMaXN0ZW5lcihcImVycm9yXCIsIChlcnIpID0+IHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvciBsb2FkaW5nIGNvbXByZXNzZWQgaW1hZ2VcIik7XG4gICAgICByZWplY3QoZXJyKTtcbiAgICB9KTtcblxuICAgIGNvbnN0IGJsb2IgPSBuZXcgQmxvYihbaW1nRGF0YV0sIHsgdHlwZTogXCJpbWFnZS9wbmdcIiB9KTtcbiAgICBjb25zdCBpbWdVcmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuICAgIGltZy5zcmMgPSBpbWdVcmw7XG4gIH0pO1xufVxuXG4vKipcbiAqIFRlc3QgaWYgRmlnbWEgbm9kZSBzdXBwb3J0cyBmaWxsIHByb3BlcnR5IHR5cGVcbiAqL1xuZnVuY3Rpb24gc3VwcG9ydHNGaWxscyhcbiAgbm9kZTogU2NlbmVOb2RlXG4pOiBub2RlIGlzIEV4Y2x1ZGU8U2NlbmVOb2RlLCBTbGljZU5vZGUgfCBHcm91cE5vZGU+IHtcbiAgcmV0dXJuIG5vZGUudHlwZSAhPT0gXCJTTElDRVwiICYmIG5vZGUudHlwZSAhPT0gXCJHUk9VUFwiO1xufVxuXG4vKipcbiAqIFJlbmRlciBhbGwgc3BlY2lmaWVkIGZyYW1lcyBvdXQgYXMgU1ZHIGVsZW1lbnQuXG4gKiBJbWFnZXMgYXJlIG9wdGltaXNlZCBmb3Igc2l6ZSBhbmQgaW1hZ2UgdHlwZSBjb21wcmVzc2lvbiB2aWEgdGhlIGZyb250ZW5kIFVJXG4gKlxuICogQGNvbnRleHQgZmlnbWFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlbmRlckZyYW1lcyhmcmFtZUlkczogc3RyaW5nW10pOiBQcm9taXNlPFVpbnQ4QXJyYXk+IHtcbiAgY29uc3Qgb3V0cHV0Tm9kZSA9IGZpZ21hLmNyZWF0ZUZyYW1lKCk7XG4gIG91dHB1dE5vZGUubmFtZSA9IFwib3V0cHV0XCI7XG5cbiAgdHJ5IHtcbiAgICAvLyBDbG9uZSBlYWNoIHNlbGVjdGVkIGZyYW1lIGFkZGluZyB0aGVtIHRvIHRoZSB0ZW1wb3JhcnkgY29udGFpbmVyIGZyYW1lXG4gICAgY29uc3QgZnJhbWVzID0gZmlnbWEuY3VycmVudFBhZ2UuZmluZEFsbCgoeyBpZCB9KSA9PiBmcmFtZUlkcy5pbmNsdWRlcyhpZCkpO1xuXG4gICAgLy8gQ2FsY3VsYXRlIHRoZSBtYXggZGltZW5zaW9ucyBmb3Igb3V0cHV0IGNvbnRhaW5lciBmcmFtZVxuICAgIGNvbnN0IG1heFdpZHRoID0gTWF0aC5tYXgoLi4uZnJhbWVzLm1hcCgoZikgPT4gZi53aWR0aCkpO1xuICAgIGNvbnN0IG1heEhlaWdodCA9IE1hdGgubWF4KC4uLmZyYW1lcy5tYXAoKGYpID0+IGYuaGVpZ2h0KSk7XG4gICAgb3V0cHV0Tm9kZS5yZXNpemVXaXRob3V0Q29uc3RyYWludHMobWF4V2lkdGgsIG1heEhlaWdodCk7XG5cbiAgICBmb3IgKGNvbnN0IGZyYW1lIG9mIGZyYW1lcykge1xuICAgICAgY29uc3QgY2xvbmUgPSBmcmFtZT8uY2xvbmUoKSBhcyBGcmFtZU5vZGU7XG5cbiAgICAgIC8vIE5PVEU6IFByZXZpb3VzbHkgdGV4dCBub2RlcyB3ZXJlIHJlbW92ZWQgaGVyZSBidXQgdGhpcyBjYXVzZWRcbiAgICAgIC8vIHdpZHRoIGNoYW5nZXMgaW4gYXV0by1sYXlvdXQuIFRleHQgaXMgcmVtb3ZlZCBhcyBwYXJ0IG9mIHRoZVxuICAgICAgLy8gU1ZHIG9wdGltaXNhdGlvbiBzdGVwLlxuXG4gICAgICAvLyBBcHBlbmQgY2xvbmVkIGZyYW1lIHRvIHRlbXAgb3V0cHV0IGZyYW1lIGFuZCBwb3NpdGlvbiBpbiB0b3AgbGVmdFxuICAgICAgb3V0cHV0Tm9kZS5hcHBlbmRDaGlsZChjbG9uZSk7XG4gICAgICBjbG9uZS54ID0gMDtcbiAgICAgIGNsb25lLnkgPSAwO1xuXG4gICAgICAvLyBTdG9yZSB0aGUgZnJhbWUgSUQgYXMgbm9kZSBuYW1lIChleHBvcnRlZCBpbiBTVkcgcHJvcHMpXG4gICAgICBjbG9uZS5uYW1lID0gZnJhbWUuaWQ7XG4gICAgfVxuXG4gICAgLy8gRmluZCBhbGwgbm9kZXMgd2l0aCBpbWFnZSBmaWxsc1xuICAgIGNvbnN0IG5vZGVzV2l0aEltYWdlcyA9IG91dHB1dE5vZGUuZmluZEFsbChcbiAgICAgIChub2RlKSA9PlxuICAgICAgICBzdXBwb3J0c0ZpbGxzKG5vZGUpICYmXG4gICAgICAgIG5vZGUuZmlsbHMgIT09IGZpZ21hLm1peGVkICYmXG4gICAgICAgIG5vZGUuZmlsbHMuc29tZSgoZmlsbCkgPT4gZmlsbC50eXBlID09PSBcIklNQUdFXCIpXG4gICAgKTtcblxuICAgIC8vIEEgc2luZ2xlIGltYWdlIGNhbiBiZSB1c2VkIG11bHRpcGxlIHRpbWVzIG9uIGRpZmZlcmVudCBub2RlcyBpbiBkaWZmZXJlbnRcbiAgICAvLyBmcmFtZXMuIFRvIGVuc3VyZSBpbWFnZXMgYXJlIG9ubHkgb3B0aW1pc2VkIG9uY2UgYSBjYWNoZSBpcyBjcmVhdGVkXG4gICAgLy8gb2YgdW5pcXVlIGltYWdlcyBhbmQgdXNlZCB0byByZXBsYWNlIG9yaWdpbmFsIGFmdGVyIHRoZSBhc3luYyBwcm9jZXNzaW5nXG4gICAgLy8gaXMgY29tcGxldGVkLlxuICAgIGNvbnN0IGltYWdlQ2FjaGU6IHtcbiAgICAgIFtpZDogc3RyaW5nXTogeyB3aWR0aDogbnVtYmVyOyBoZWlnaHQ6IG51bWJlcjsgaWQ6IHN0cmluZyB9W107XG4gICAgfSA9IHt9O1xuXG4gICAgZm9yIChjb25zdCBub2RlIG9mIG5vZGVzV2l0aEltYWdlcykge1xuICAgICAgaWYgKHN1cHBvcnRzRmlsbHMobm9kZSkgJiYgbm9kZS5maWxscyAhPT0gZmlnbWEubWl4ZWQpIHtcbiAgICAgICAgLy8gVGhlIGZyb250ZW5kIFVJIHdoaWNoIGhhbmRsZXMgdGhlIGltYWdlIG9wdGltaXNhdGlvbiBuZWVkcyB0byBrbm93XG4gICAgICAgIC8vIHRoZSBzaXplcyBvZiBlYWNoIG5vZGUgdGhhdCB1c2VzIHRoZSBpbWFnZS4gVGhlIGRpbWVuc2lvbnMgYXJlIHN0b3JlZFxuICAgICAgICAvLyB3aXRoIHRoZSBpbWFnZSBoYXNoIElEIGluIHRoZSBjYWNoZSBmb3IgbGF0ZXIgdXNlLlxuICAgICAgICBjb25zdCBkaW1lbnNpb25zID0ge1xuICAgICAgICAgIHdpZHRoOiBub2RlLndpZHRoLFxuICAgICAgICAgIGhlaWdodDogbm9kZS5oZWlnaHQsXG4gICAgICAgICAgaWQ6IG5vZGUuaWQsXG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IGltZ1BhaW50ID0gWy4uLm5vZGUuZmlsbHNdLmZpbmQoKHApID0+IHAudHlwZSA9PT0gXCJJTUFHRVwiKTtcblxuICAgICAgICBpZiAoaW1nUGFpbnQ/LnR5cGUgPT09IFwiSU1BR0VcIiAmJiBpbWdQYWludC5pbWFnZUhhc2gpIHtcbiAgICAgICAgICAvLyBBZGQgdGhlIGltYWdlIGRpbWVuc2lvbnMgdG8gdGhlIGNhY2hlLCBvciB1cGRhdGUgYW5kIGV4aXN0aW5nIGNhY2hlXG4gICAgICAgICAgLy8gaXRlbSB3aXRoIGFub3RoZXIgbm9kZXMgZGltZW5zaW9uc1xuICAgICAgICAgIGlmIChpbWFnZUNhY2hlW2ltZ1BhaW50LmltYWdlSGFzaF0pIHtcbiAgICAgICAgICAgIGltYWdlQ2FjaGVbaW1nUGFpbnQuaW1hZ2VIYXNoXS5wdXNoKGRpbWVuc2lvbnMpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpbWFnZUNhY2hlW2ltZ1BhaW50LmltYWdlSGFzaF0gPSBbZGltZW5zaW9uc107XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gU2VuZCBlYWNoIGltYWdlIGZyb20gdGhlIGltYWdlQ2FjaGUgdG8gdGhlIGZyb250ZW5kIGZvciBvcHRpbWlzYXRpb24uXG4gICAgLy8gVGhlIG9wZXJhdGlvbiBpcyBhc3luYyBhbmQgY2FuIHRha2Ugc29tZSB0aW1lIGlmIHRoZSBpbWFnZXMgYXJlIGxhcmdlLlxuICAgIGZvciAoY29uc3QgaW1hZ2VIYXNoIGluIGltYWdlQ2FjaGUpIHtcbiAgICAgIGNvbnN0IGJ5dGVzID0gYXdhaXQgZmlnbWEuZ2V0SW1hZ2VCeUhhc2goaW1hZ2VIYXNoKS5nZXRCeXRlc0FzeW5jKCk7XG4gICAgICBjb25zdCBjb21wcmVzc2VkSW1hZ2U6IFVpbnQ4QXJyYXkgPSBhd2FpdCBwb3N0TWFuLnNlbmQoe1xuICAgICAgICB3b3JrbG9hZDogTVNHX0VWRU5UUy5DT01QUkVTU19JTUFHRSxcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgIGltZ0RhdGE6IGJ5dGVzLFxuICAgICAgICAgIG5vZGVEaW1lbnNpb25zOiBpbWFnZUNhY2hlW2ltYWdlSGFzaF0sXG4gICAgICAgIH0sXG4gICAgICB9KTtcblxuICAgICAgLy8gU3RvcmUgdGhlIG5ldyBpbWFnZSBpbiBmaWdtYSBhbmQgZ2V0IHRoZSBuZXcgaW1hZ2UgaGFzaFxuICAgICAgY29uc3QgbmV3SW1hZ2VIYXNoID0gZmlnbWEuY3JlYXRlSW1hZ2UoY29tcHJlc3NlZEltYWdlKS5oYXNoO1xuXG4gICAgICAvLyBVcGRhdGUgbm9kZXMgd2l0aCBuZXcgaW1hZ2UgcGFpbnQgZmlsbFxuICAgICAgbm9kZXNXaXRoSW1hZ2VzLmZvckVhY2goKG5vZGUpID0+IHtcbiAgICAgICAgaWYgKHN1cHBvcnRzRmlsbHMobm9kZSkgJiYgbm9kZS5maWxscyAhPT0gZmlnbWEubWl4ZWQpIHtcbiAgICAgICAgICBjb25zdCBpbWdQYWludCA9IFsuLi5ub2RlLmZpbGxzXS5maW5kKFxuICAgICAgICAgICAgKHApID0+IHAudHlwZSA9PT0gXCJJTUFHRVwiICYmIHAuaW1hZ2VIYXNoID09PSBpbWFnZUhhc2hcbiAgICAgICAgICApO1xuXG4gICAgICAgICAgaWYgKGltZ1BhaW50KSB7XG4gICAgICAgICAgICBjb25zdCBuZXdQYWludCA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoaW1nUGFpbnQpKTtcbiAgICAgICAgICAgIG5ld1BhaW50LmltYWdlSGFzaCA9IG5ld0ltYWdlSGFzaDtcbiAgICAgICAgICAgIG5vZGUuZmlsbHMgPSBbbmV3UGFpbnRdO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gSEFDSyEgRmlnbWEgdGFrZXMgc29tZSB0aW1lIHRvIHVwZGF0ZSB0aGUgaW1hZ2UgZmlsbHMuIFdhaXRpbmcgc29tZVxuICAgIC8vIGFtb3VudCBpcyByZXF1aXJlZCBvdGhlcndpc2UgdGhlIGltYWdlcyBhcHBlYXIgYmxhbmsuXG4gICAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMzAwKSk7XG5cbiAgICAvLyBSZW5kZXIgb3V0cHV0IGNvbnRhaW5lciBmcmFtZXMgdG8gU1ZHIG1hcmstdXAgKGluIGEgdWludDggYnl0ZSBhcnJheSlcbiAgICBjb25zdCBzdmcgPSBhd2FpdCBvdXRwdXROb2RlLmV4cG9ydEFzeW5jKHtcbiAgICAgIGZvcm1hdDogXCJTVkdcIixcbiAgICAgIHN2Z1NpbXBsaWZ5U3Ryb2tlOiB0cnVlLFxuICAgICAgc3ZnT3V0bGluZVRleHQ6IGZhbHNlLFxuICAgICAgc3ZnSWRBdHRyaWJ1dGU6IHRydWUsXG4gICAgfSk7XG5cbiAgICByZXR1cm4gc3ZnO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoZXJyKTtcbiAgfSBmaW5hbGx5IHtcbiAgICAvLyBSZW1vdmUgdGhlIG91dHB1dCBmcmFtZSB3aGF0ZXZlciBoYXBwZW5zXG4gICAgb3V0cHV0Tm9kZS5yZW1vdmUoKTtcbiAgfVxufVxuXG4vKipcbiAqIENyZWF0ZSwgdXBkYXRlIG9yIGRlbGV0ZSBoZWFkbGluZSB0ZXh0IGluIGZpZ21hIGRvY3VtZW50IGZyb20gcGx1Z2luIFVJXG4gKlxuICogQGNvbnRleHQgZmlnbWFcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldEhlYWRsaW5lc0FuZFNvdXJjZShwcm9wczogc2V0SGVhZGxpbmVzQW5kU291cmNlUHJvcHMpOiB2b2lkIHtcbiAgY29uc3QgcGFnZU5vZGUgPSBmaWdtYS5jdXJyZW50UGFnZTtcbiAgY29uc3QgbW9zdExlZnRQb3MgPSBNYXRoLm1pbiguLi5wYWdlTm9kZS5jaGlsZHJlbi5tYXAoKG5vZGUpID0+IG5vZGUueCkpO1xuICBjb25zdCBtb3N0VG9wUG9zID0gTWF0aC5taW4oLi4ucGFnZU5vZGUuY2hpbGRyZW4ubWFwKChub2RlKSA9PiBub2RlLnkpKTtcblxuICAvLyBMb29wIHRocm91Z2ggZWFjaCBoZWFkbGluZSBub2RlIG5hbWVzXG4gIGZvciAoY29uc3QgbmFtZSBvZiBPYmplY3QudmFsdWVzKEhFQURMSU5FX05PREVfTkFNRVMpKSB7XG4gICAgbGV0IG5vZGUgPVxuICAgICAgKHBhZ2VOb2RlLmZpbmRDaGlsZChcbiAgICAgICAgKG5vZGUpID0+IG5vZGUubmFtZSA9PT0gbmFtZSAmJiBub2RlLnR5cGUgPT09IFwiVEVYVFwiXG4gICAgICApIGFzIFRleHROb2RlKSB8fCBudWxsO1xuICAgIGNvbnN0IHRleHRDb250ZW50ID0gcHJvcHNbbmFtZV07XG5cbiAgICAvLyBSZW1vdmUgbm9kZSBpZiB0aGVyZSdzIG5vIHRleHQgY29udGVudFxuICAgIGlmIChub2RlICYmICF0ZXh0Q29udGVudCkge1xuICAgICAgbm9kZS5yZW1vdmUoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBEbyBub3RoaW5nIGlzIHRoZXJlJ3Mgbm8gdGV4dCBjb250ZW50XG4gICAgaWYgKCF0ZXh0Q29udGVudCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIENyZWF0ZSBub2RlIGlmIGl0IGRvZXNuJ3QgYWxyZWFkeSBleGlzdFxuICAgIGlmICghbm9kZSkge1xuICAgICAgbm9kZSA9IGZpZ21hLmNyZWF0ZVRleHQoKTtcbiAgICAgIG5vZGUubmFtZSA9IG5hbWU7XG5cbiAgICAgIC8vIFBvc2l0aW9uIG5ldyB0ZXh0IG5vZGUgdG9wLWxlZnQgb2YgdGhlIGZpcnN0IGZyYW1lIGluIHRoZSBwYWdlXG4gICAgICBsZXQgeSA9IG1vc3RUb3BQb3MgLSA2MDtcbiAgICAgIGlmIChuYW1lID09PSBIRUFETElORV9OT0RFX05BTUVTLkhFQURMSU5FKSB7XG4gICAgICAgIHkgLT0gNjA7XG4gICAgICB9IGVsc2UgaWYgKG5hbWUgPT09IEhFQURMSU5FX05PREVfTkFNRVMuU1VCSEVBRCkge1xuICAgICAgICB5IC09IDMwO1xuICAgICAgfVxuXG4gICAgICBub2RlLnJlbGF0aXZlVHJhbnNmb3JtID0gW1xuICAgICAgICBbMSwgMCwgbW9zdExlZnRQb3NdLFxuICAgICAgICBbMCwgMSwgeV0sXG4gICAgICBdO1xuICAgIH1cblxuICAgIC8vIEVuc3VyZSB0ZXh0IG5vZGUgaXMgbG9ja2VkXG4gICAgbm9kZS5sb2NrZWQgPSB0cnVlO1xuXG4gICAgLy8gTG9hZCBmb250XG4gICAgY29uc3QgZm9udE5hbWUgPVxuICAgICAgbm9kZS5mb250TmFtZSAhPT0gZmlnbWEubWl4ZWQgPyBub2RlLmZvbnROYW1lLmZhbWlseSA6IFwiUm9ib3RvXCI7XG4gICAgY29uc3QgZm9udFN0eWxlID1cbiAgICAgIG5vZGUuZm9udE5hbWUgIT09IGZpZ21hLm1peGVkID8gbm9kZS5mb250TmFtZS5zdHlsZSA6IFwiUmVndWxhclwiO1xuICAgIGZpZ21hXG4gICAgICAubG9hZEZvbnRBc3luYyh7IGZhbWlseTogZm9udE5hbWUsIHN0eWxlOiBmb250U3R5bGUgfSlcbiAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgLy8gU2V0IHRleHQgbm9kZSBjb250ZW50XG4gICAgICAgIG5vZGUuY2hhcmFjdGVycyA9IHByb3BzW25hbWVdIHx8IFwiXCI7XG4gICAgICB9KVxuICAgICAgLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIkZhaWxlZCB0byBsb2FkIGZvbnRcIiwgZXJyKTtcbiAgICAgIH0pO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRSb290RnJhbWVzKCk6IElGcmFtZURhdGEge1xuICBjb25zdCB7IGN1cnJlbnRQYWdlIH0gPSBmaWdtYTtcblxuICBsZXQgc2VsZWN0ZWRGcmFtZXMgPSBjdXJyZW50UGFnZS5zZWxlY3Rpb24uZmlsdGVyKFxuICAgIChub2RlKSA9PiBub2RlLnR5cGUgPT09IFwiRlJBTUVcIlxuICApIGFzIEZyYW1lTm9kZVtdO1xuXG4gIGlmIChzZWxlY3RlZEZyYW1lcy5sZW5ndGggPT09IDApIHtcbiAgICBzZWxlY3RlZEZyYW1lcyA9IGN1cnJlbnRQYWdlLmNoaWxkcmVuLmZpbHRlcihcbiAgICAgIChub2RlKSA9PiBub2RlLnR5cGUgPT09IFwiRlJBTUVcIlxuICAgICkgYXMgRnJhbWVOb2RlW107XG4gIH1cblxuICBjb25zdCBmcmFtZXNEYXRhID0gc2VsZWN0ZWRGcmFtZXMubWFwKChmcmFtZSkgPT4ge1xuICAgIGNvbnN0IHsgbmFtZSwgd2lkdGgsIGhlaWdodCwgaWQgfSA9IGZyYW1lO1xuICAgIGNvbnN0IHRleHROb2RlcyA9IGdldFRleHROb2Rlc0Zyb21GcmFtZShmcmFtZSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgbmFtZSxcbiAgICAgIHdpZHRoLFxuICAgICAgaGVpZ2h0LFxuICAgICAgaWQsXG4gICAgICB0ZXh0Tm9kZXMsXG4gICAgfTtcbiAgfSk7XG5cbiAgcmV0dXJuIHtcbiAgICBmcmFtZXM6IGZyYW1lc0RhdGEsXG4gICAgaGVhZGxpbmU6IGdldE5vZGVUZXh0KGN1cnJlbnRQYWdlLCBIRUFETElORV9OT0RFX05BTUVTLkhFQURMSU5FKSxcbiAgICBzdWJoZWFkOiBnZXROb2RlVGV4dChjdXJyZW50UGFnZSwgSEVBRExJTkVfTk9ERV9OQU1FUy5IRUFETElORSksXG4gICAgc291cmNlOiBnZXROb2RlVGV4dChjdXJyZW50UGFnZSwgSEVBRExJTkVfTk9ERV9OQU1FUy5IRUFETElORSksXG4gIH07XG59XG4iLCAiaW1wb3J0IHsgTVNHX0VWRU5UUyB9IGZyb20gXCIuL2NvbnN0YW50c1wiO1xuaW1wb3J0IHsgcG9zdE1hbiB9IGZyb20gXCIuL3V0aWxzL21lc3NhZ2VzXCI7XG5pbXBvcnQgeyBnZXRSb290RnJhbWVzLCByZW5kZXJGcmFtZXMsIHNldEhlYWRsaW5lc0FuZFNvdXJjZSB9IGZyb20gXCIuL2hlbHBlcnNcIjtcblxuLy8gUmVnaXN0ZXIgbWVzc2VuZ2VyIGV2ZW50IGZ1bmN0aW9uc1xucG9zdE1hbi5yZWdpc3RlcldvcmtlcihNU0dfRVZFTlRTLkdFVF9ST09UX0ZSQU1FUywgZ2V0Um9vdEZyYW1lcyk7XG5wb3N0TWFuLnJlZ2lzdGVyV29ya2VyKE1TR19FVkVOVFMuUkVOREVSLCByZW5kZXJGcmFtZXMpO1xucG9zdE1hbi5yZWdpc3RlcldvcmtlcihNU0dfRVZFTlRTLlVQREFURV9IRUFETElORVMsIHNldEhlYWRsaW5lc0FuZFNvdXJjZSk7XG5cbi8vIFJlbmRlciB0aGUgRE9NXG5maWdtYS5zaG93VUkoX19odG1sX18pO1xuXG4vLyBSZXNpemUgVUkgdG8gbWF4IHZpZXdwb3J0IGRpbWVuc2lvbnNcbmNvbnN0IHsgd2lkdGgsIGhlaWdodCB9ID0gZmlnbWEudmlld3BvcnQuYm91bmRzO1xuY29uc3QgeyB6b29tIH0gPSBmaWdtYS52aWV3cG9ydDtcbmNvbnN0IGluaXRpYWxXaW5kb3dXaWR0aCA9IE1hdGgucm91bmQod2lkdGggKiB6b29tKTtcbmNvbnN0IGluaXRpYWxXaW5kb3dIZWlnaHQgPSBNYXRoLnJvdW5kKGhlaWdodCAqIHpvb20pO1xuZmlnbWEudWkucmVzaXplKGluaXRpYWxXaW5kb3dXaWR0aCwgaW5pdGlhbFdpbmRvd0hlaWdodCk7XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7O0FBQU8sTUFBSztBQUFMLFlBQUs7QUFDVjtBQUNBO0FBQ0E7QUFBQSxLQUhVO0FBTUwsTUFBSztBQUFMLFlBQUs7QUFDVjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQUEsS0FSVTtBQVdMLE1BQUs7QUFBTCxZQUFLO0FBQ1Y7QUFDQTtBQUFBLEtBRlU7QUFzQkwsTUFBSztBQUFMLFlBQUs7QUFDVix1Q0FBVztBQUNYLHNDQUFVO0FBQ1YscUNBQVM7QUFBQSxLQUhDOzs7QUN2Q1o7QUFBQSxJQW1CRSxZQUFZO0FBRkoscUJBQVU7QUFjVixxQkFBVSxPQUFPO0FBL0IzQjtBQWdDSSxjQUFNLFVBQVUsS0FBSyxpQkFBaUIsUUFBUSxxQ0FBTyxTQUFQLG1CQUFhO0FBQzNELGNBQU0sQ0FBRSxNQUFNLFVBQVUsTUFBTSxLQUFLLFdBQVcsT0FBUSxXQUFXO0FBRWpFO0FBRUUsY0FBSSxLQUFLLFNBQVM7QUFBTTtBQUV4QixjQUFJLGFBQWEsQ0FBQyxLQUFLLGNBQWM7QUFDbkMsa0JBQU0sSUFBSSxNQUFNLHFCQUFxQjtBQUFBO0FBR3ZDLGNBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxRQUFRO0FBQzlCLGtCQUFNLElBQUksTUFBTSwyQkFBMkI7QUFBQTtBQUc3QyxjQUFJO0FBQ0YsaUJBQUssY0FBYyxLQUFLLE1BQU07QUFBQTtBQUU5QixrQkFBTSxpQkFBaUIsTUFBTSxLQUFLLFFBQVEsVUFBVTtBQUNwRCxpQkFBSyxTQUFTLENBQUUsTUFBTSxnQkFBZ0I7QUFBQTtBQUFBLGlCQUVqQztBQUNQLGVBQUssU0FBUyxDQUFFLEtBQUssS0FBSztBQUMxQixrQkFBUSxNQUFNLGtCQUFrQjtBQUFBO0FBQUE7QUFJN0IsNEJBQWlCLENB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
