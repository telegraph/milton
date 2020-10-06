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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL2NvbnN0YW50cy50cyIsICJzcmMvY29uc3RhbnRzLnRzIiwgInNyYy91dGlscy9tZXNzYWdlcy50cyIsICJzcmMvaGVscGVycy9maWdtYVRleHQudHMiLCAic3JjL2hlbHBlcnMudHMiLCAic3JjL2luZGV4LnRzeCJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiZXhwb3J0IGVudW0gU1RBR0VTIHtcbiAgQ0hPT1NFX0ZSQU1FUyxcbiAgUkVTUE9OU0lWRV9QUkVWSUVXLFxuICBTQVZFX09VVFBVVCxcbn1cblxuZXhwb3J0IGVudW0gTVNHX0VWRU5UUyB7XG4gIEZPVU5EX0ZSQU1FUyxcbiAgTk9fRlJBTUVTLFxuICBSRU5ERVIsXG4gIENMT1NFLFxuICBFUlJPUixcbiAgVVBEQVRFX0hFQURMSU5FUyxcbiAgQ09NUFJFU1NfSU1BR0UsXG4gIEdFVF9ST09UX0ZSQU1FUyxcbn1cblxuZXhwb3J0IGVudW0gT1VUUFVUX0ZPUk1BVFMge1xuICBJTkxJTkUsXG4gIElGUkFNRSxcbn1cblxuZXhwb3J0IGNvbnN0IFVJX1RFWFQgPSB7XG4gIEVSUk9SX1VORVhQRUNURUQ6IFwiVW5leHBlY3RlZCBlcnJvclwiLFxuICBFUlJPUl9NSVNTSU5HX0ZSQU1FUzogXCJObyBmcmFtZXMgZm91bmQuIFBsZWFzZSBhZGQgc29tZSBmcmFtZXMgdG8gdGhlIHBhZ2UuXCIsXG4gIFdBUk5fTk9fVEFSR0VUUzogXCJTdGFuZGFyZCBmcmFtZXMgbm90IGZvdW5kLiBQbGVhc2Ugc2VsZWN0IHRhcmdldCBmcmFtZXMuXCIsXG4gIFdBUk5fVE9PX01BTllfVEFSR0VUUzogXCJQbGVhc2Ugc2VsZWN0IHRocmVlIHRhcmdldCBmcmFtZXNcIixcbiAgSU5GT19QUkVWSUVXOiBcIlByZXZpZXcgZWFjaCBmcmFtZSBvdXRwdXRcIixcbiAgVElUTEVfQ0hPT1NFX0ZSQU1FOiBcIkNob29zZSB3aGljaCBmcmFtZXMgdG8gZXhwb3J0XCIsXG4gIFRJVExFX1BSRVZJRVc6IFwiUHJldmlld1wiLFxuICBUSVRMRV9SRVNQT05TSVZFX1BSRVZJRVc6IFwiUmVzcG9uc2l2ZSBwcmV2aWV3XCIsXG4gIFRJTEVfT1VUUFVUOiBcIkV4cG9ydFwiLFxuICBCVVRUT05fTkVYVDogXCJOZXh0XCIsXG4gIEJVVFRPTl9ET1dOTE9BRDogXCJEb3dubG9hZFwiLFxuICBCVVRUT05fUFJFVklPVVM6IFwiQmFja1wiLFxufTtcblxuZXhwb3J0IGNvbnN0IEZSQU1FX1dBUk5JTkdfU0laRSA9IDMwMDtcblxuZXhwb3J0IGVudW0gSEVBRExJTkVfTk9ERV9OQU1FUyB7XG4gIEhFQURMSU5FID0gXCJoZWFkbGluZVwiLFxuICBTVUJIRUFEID0gXCJzdWJoZWFkXCIsXG4gIFNPVVJDRSA9IFwic291cmNlXCIsXG59XG4iLCAiZXhwb3J0IGVudW0gU1RBR0VTIHtcbiAgQ0hPT1NFX0ZSQU1FUyxcbiAgUkVTUE9OU0lWRV9QUkVWSUVXLFxuICBTQVZFX09VVFBVVCxcbn1cblxuZXhwb3J0IGVudW0gTVNHX0VWRU5UUyB7XG4gIEZPVU5EX0ZSQU1FUyxcbiAgTk9fRlJBTUVTLFxuICBSRU5ERVIsXG4gIENMT1NFLFxuICBFUlJPUixcbiAgVVBEQVRFX0hFQURMSU5FUyxcbiAgQ09NUFJFU1NfSU1BR0UsXG4gIEdFVF9ST09UX0ZSQU1FUyxcbn1cblxuZXhwb3J0IGVudW0gT1VUUFVUX0ZPUk1BVFMge1xuICBJTkxJTkUsXG4gIElGUkFNRSxcbn1cblxuZXhwb3J0IGNvbnN0IFVJX1RFWFQgPSB7XG4gIEVSUk9SX1VORVhQRUNURUQ6IFwiVW5leHBlY3RlZCBlcnJvclwiLFxuICBFUlJPUl9NSVNTSU5HX0ZSQU1FUzogXCJObyBmcmFtZXMgZm91bmQuIFBsZWFzZSBhZGQgc29tZSBmcmFtZXMgdG8gdGhlIHBhZ2UuXCIsXG4gIFdBUk5fTk9fVEFSR0VUUzogXCJTdGFuZGFyZCBmcmFtZXMgbm90IGZvdW5kLiBQbGVhc2Ugc2VsZWN0IHRhcmdldCBmcmFtZXMuXCIsXG4gIFdBUk5fVE9PX01BTllfVEFSR0VUUzogXCJQbGVhc2Ugc2VsZWN0IHRocmVlIHRhcmdldCBmcmFtZXNcIixcbiAgSU5GT19QUkVWSUVXOiBcIlByZXZpZXcgZWFjaCBmcmFtZSBvdXRwdXRcIixcbiAgVElUTEVfQ0hPT1NFX0ZSQU1FOiBcIkNob29zZSB3aGljaCBmcmFtZXMgdG8gZXhwb3J0XCIsXG4gIFRJVExFX1BSRVZJRVc6IFwiUHJldmlld1wiLFxuICBUSVRMRV9SRVNQT05TSVZFX1BSRVZJRVc6IFwiUmVzcG9uc2l2ZSBwcmV2aWV3XCIsXG4gIFRJTEVfT1VUUFVUOiBcIkV4cG9ydFwiLFxuICBCVVRUT05fTkVYVDogXCJOZXh0XCIsXG4gIEJVVFRPTl9ET1dOTE9BRDogXCJEb3dubG9hZFwiLFxuICBCVVRUT05fUFJFVklPVVM6IFwiQmFja1wiLFxufTtcblxuZXhwb3J0IGNvbnN0IEZSQU1FX1dBUk5JTkdfU0laRSA9IDMwMDtcblxuZXhwb3J0IGVudW0gSEVBRExJTkVfTk9ERV9OQU1FUyB7XG4gIEhFQURMSU5FID0gXCJoZWFkbGluZVwiLFxuICBTVUJIRUFEID0gXCJzdWJoZWFkXCIsXG4gIFNPVVJDRSA9IFwic291cmNlXCIsXG59XG4iLCAiaW1wb3J0IHsgTVNHX0VWRU5UUyB9IGZyb20gXCIuLi9jb25zdGFudHNcIjtcblxuaW50ZXJmYWNlIElQb3N0bWFuTWVzc2FnZSB7XG4gIG5hbWU6IHN0cmluZztcbiAgdWlkOiBzdHJpbmc7XG4gIHdvcmtsb2FkOiBNU0dfRVZFTlRTO1xuICBkYXRhOiBhbnk7XG4gIHJldHVybmluZz86IGJvb2xlYW47XG4gIGVycj86IHN0cmluZztcbn1cblxuY2xhc3MgUG9zdG1hbiB7XG4gIHByaXZhdGUgbmFtZTogc3RyaW5nO1xuICBwcml2YXRlIGluRmlnbWFTYW5kYm94OiBib29sZWFuO1xuICBwcml2YXRlIGNhbGxiYWNrU3RvcmU6IHsgW2lkOiBzdHJpbmddOiBGdW5jdGlvbiB9O1xuICBwcml2YXRlIHdvcmtlcnM6IHsgW2lkOiBzdHJpbmddOiBGdW5jdGlvbiB9O1xuXG4gIHByaXZhdGUgVElNRU9VVCA9IDMwMDAwO1xuXG4gIGNvbnN0cnVjdG9yKHByb3BzPzogeyBtZXNzYWdlTmFtZT86IHN0cmluZzsgc2NvcGU6IG51bGwgfSkge1xuICAgIHRoaXMubmFtZSA9IHByb3BzPy5tZXNzYWdlTmFtZSB8fCBcIlBPU1RNQU5cIjtcbiAgICB0aGlzLmluRmlnbWFTYW5kYm94ID0gdHlwZW9mIGZpZ21hID09PSBcIm9iamVjdFwiO1xuICAgIHRoaXMuY2FsbGJhY2tTdG9yZSA9IHt9O1xuICAgIHRoaXMud29ya2VycyA9IHt9O1xuXG4gICAgLy8gQWRkIG1lc3NhZ2UgZXZlbnQgbGlzdGVuZXJcbiAgICB0aGlzLmluRmlnbWFTYW5kYm94XG4gICAgICA/IGZpZ21hLnVpLm9uKFwibWVzc2FnZVwiLCB0aGlzLnJlY2VpdmUpXG4gICAgICA6IHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCB0aGlzLnJlY2VpdmUpO1xuICB9XG5cbiAgcHJpdmF0ZSByZWNlaXZlID0gYXN5bmMgKGV2ZW50OiBNZXNzYWdlRXZlbnQ8SVBvc3RtYW5NZXNzYWdlPikgPT4ge1xuICAgIGNvbnN0IG1zZ0JvZHkgPSB0aGlzLmluRmlnbWFTYW5kYm94ID8gZXZlbnQgOiBldmVudD8uZGF0YT8ucGx1Z2luTWVzc2FnZTtcbiAgICBjb25zdCB7IGRhdGEsIHdvcmtsb2FkLCBuYW1lLCB1aWQsIHJldHVybmluZywgZXJyIH0gPSBtc2dCb2R5IHx8IHt9O1xuXG4gICAgdHJ5IHtcbiAgICAgIC8vIERvIG5vdGhpbmcgaWQgcG9zdCBtZXNzYWdlIGlzbid0IGZvciB1c1xuICAgICAgaWYgKHRoaXMubmFtZSAhPT0gbmFtZSkgcmV0dXJuO1xuXG4gICAgICBpZiAocmV0dXJuaW5nICYmICF0aGlzLmNhbGxiYWNrU3RvcmVbdWlkXSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgY2FsbGJhY2s6ICR7dWlkfWApO1xuICAgICAgfVxuXG4gICAgICBpZiAoIXJldHVybmluZyAmJiAhdGhpcy53b3JrZXJzW3dvcmtsb2FkXSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIHdvcmtsb2FkIHJlZ2lzdGVyZWQ6ICR7d29ya2xvYWR9YCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChyZXR1cm5pbmcpIHtcbiAgICAgICAgdGhpcy5jYWxsYmFja1N0b3JlW3VpZF0oZGF0YSwgZXJyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHdvcmtsb2FkUmVzdWx0ID0gYXdhaXQgdGhpcy53b3JrZXJzW3dvcmtsb2FkXShkYXRhKTtcbiAgICAgICAgdGhpcy5wb3N0QmFjayh7IGRhdGE6IHdvcmtsb2FkUmVzdWx0LCB1aWQgfSk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICB0aGlzLnBvc3RCYWNrKHsgdWlkLCBlcnI6IFwiUG9zdG1hbiBmYWlsZWRcIiB9KTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJQb3N0bWFuIGZhaWxlZFwiLCBlcnIpO1xuICAgIH1cbiAgfTtcblxuICBwdWJsaWMgcmVnaXN0ZXJXb3JrZXIgPSAoZXZlbnRUeXBlOiBNU0dfRVZFTlRTLCBmbjogRnVuY3Rpb24pID0+IHtcbiAgICB0aGlzLndvcmtlcnNbZXZlbnRUeXBlXSA9IGZuO1xuICB9O1xuXG4gIHByaXZhdGUgcG9zdEJhY2sgPSAocHJvcHM6IHsgdWlkOiBzdHJpbmc7IGRhdGE/OiBhbnk7IGVycj86IHN0cmluZyB9KSA9PlxuICAgIHRoaXMucG9zdE1lc3NhZ2Uoe1xuICAgICAgbmFtZTogdGhpcy5uYW1lLFxuICAgICAgdWlkOiBwcm9wcy51aWQsXG4gICAgICBkYXRhOiBwcm9wcy5kYXRhLFxuICAgICAgcmV0dXJuaW5nOiB0cnVlLFxuICAgICAgZXJyOiBwcm9wcy5lcnIsXG4gICAgfSk7XG5cbiAgcHJpdmF0ZSBwb3N0TWVzc2FnZSA9IChtZXNzYWdlQm9keSkgPT5cbiAgICB0aGlzLmluRmlnbWFTYW5kYm94XG4gICAgICA/IGZpZ21hLnVpLnBvc3RNZXNzYWdlKG1lc3NhZ2VCb2R5KVxuICAgICAgOiBwYXJlbnQucG9zdE1lc3NhZ2UoeyBwbHVnaW5NZXNzYWdlOiBtZXNzYWdlQm9keSB9LCBcIipcIik7XG5cbiAgcHVibGljIHNlbmQgPSAocHJvcHM6IHsgd29ya2xvYWQ6IE1TR19FVkVOVFM7IGRhdGE/OiBhbnkgfSk6IFByb21pc2U8YW55PiA9PiB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IHsgd29ya2xvYWQsIGRhdGEgfSA9IHByb3BzO1xuXG4gICAgICBjb25zdCByYW5kb21JZCA9IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cig1KTtcblxuICAgICAgdGhpcy5wb3N0TWVzc2FnZSh7XG4gICAgICAgIG5hbWU6IHRoaXMubmFtZSxcbiAgICAgICAgdWlkOiByYW5kb21JZCxcbiAgICAgICAgd29ya2xvYWQsXG4gICAgICAgIGRhdGEsXG4gICAgICB9IGFzIElQb3N0bWFuTWVzc2FnZSk7XG5cbiAgICAgIHRoaXMuY2FsbGJhY2tTdG9yZVtyYW5kb21JZF0gPSAocmVzdWx0OiBhbnksIGVycj86IHN0cmluZykgPT4ge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHJlamVjdChuZXcgRXJyb3IoXCJUaW1lZCBvdXRcIikpLCB0aGlzLlRJTUVPVVQpO1xuICAgIH0pO1xuICB9O1xufVxuXG5leHBvcnQgY29uc3QgcG9zdE1hbiA9IG5ldyBQb3N0bWFuKCk7XG4iLCAiaW1wb3J0IHsgdGV4dERhdGEsIElUZXh0UHJvcCwgSVRleHRTdHlsZSB9IGZyb20gXCJ0eXBlc1wiO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Tm9kZVRleHQoXG4gIHJvb3ROb2RlOiBQYWdlTm9kZSxcbiAgbm9kZU5hbWU6IHN0cmluZ1xuKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgZm91bmROb2RlID0gcm9vdE5vZGUuZmluZENoaWxkKChub2RlKSA9PiBub2RlLm5hbWUgPT09IG5vZGVOYW1lKTtcbiAgcmV0dXJuIGZvdW5kTm9kZSAmJiBmb3VuZE5vZGUudHlwZSA9PT0gXCJURVhUXCJcbiAgICA/IGZvdW5kTm9kZS5jaGFyYWN0ZXJzXG4gICAgOiB1bmRlZmluZWQ7XG59XG5cbi8vIGZ1bmN0aW9uIGNhbGN1bGF0ZUxldHRlclNwYWNpbmcoXG4vLyAgIGZvbnRGYW1pbHk6IHN0cmluZyxcbi8vICAgbGV0dGVyU3BhY2luZzogTGV0dGVyU3BhY2luZ1xuLy8gKSB7XG4vLyAgIGNvbnN0IHsgdW5pdDogbGV0dGVyVW5pdCwgdmFsdWU6IGxldHRlclZhbCB9ID0gbGV0dGVyU3BhY2luZztcbi8vICAgbGV0IGxldHRlclNwYWNlVmFsdWUgPSBcIjBcIjtcblxuLy8gICBzd2l0Y2ggKGxldHRlclVuaXQpIHtcbi8vICAgICBjYXNlIFwiUElYRUxTXCI6XG4vLyAgICAgICAvLyBUT0RPOiBGSVggTUVcbi8vICAgICAgIGlmIChmb250RmFtaWx5ID09PSBcIlRlbGVzYW5zIFRleHRcIikge1xuLy8gICAgICAgICBsZXR0ZXJTcGFjZVZhbHVlID0gYCR7bGV0dGVyVmFsIC0gMC4zM31weGA7XG4vLyAgICAgICB9IGVsc2UgaWYgKGZvbnRGYW1pbHkgPT09IFwiVGVsZXNhbnMgQWdhdGVcIikge1xuLy8gICAgICAgICBsZXR0ZXJTcGFjZVZhbHVlID0gYCR7bGV0dGVyVmFsIC0gMC4xOX1weGA7XG4vLyAgICAgICB9IGVsc2Uge1xuLy8gICAgICAgICBsZXR0ZXJTcGFjZVZhbHVlID0gYCR7bGV0dGVyVmFsfXB4YDtcbi8vICAgICAgIH1cbi8vICAgICAgIGJyZWFrO1xuLy8gICAgIGNhc2UgXCJQRVJDRU5UXCI6XG4vLyAgICAgICBsZXR0ZXJTcGFjZVZhbHVlID0gYCR7bGV0dGVyVmFsIC8gMTAwfWVtYDtcblxuLy8gICAgICAgaWYgKGZvbnRGYW1pbHkgPT09IFwiVGVsZXNhbnMgVGV4dFwiKSB7XG4vLyAgICAgICAgIGxldHRlclNwYWNlVmFsdWUgPSBgJHtsZXR0ZXJWYWwgLyAxMDAgLSAwLjAyMn1lbWA7XG4vLyAgICAgICB9IGVsc2UgaWYgKGZvbnRGYW1pbHkgPT09IFwiVGVsZXNhbnMgQWdhdGVcIikge1xuLy8gICAgICAgICBsZXR0ZXJTcGFjZVZhbHVlID0gYCR7bGV0dGVyVmFsIC8gMTAwIC0gMC4wMTV9ZW1gO1xuLy8gICAgICAgfSBlbHNlIHtcbi8vICAgICAgICAgbGV0dGVyU3BhY2VWYWx1ZSA9IGAke2xldHRlclZhbCAvIDEwMH1lbWA7XG4vLyAgICAgICB9XG4vLyAgICAgICBicmVhaztcbi8vICAgICBkZWZhdWx0OlxuLy8gICAgICAgaWYgKGZvbnRGYW1pbHkgPT09IFwiVGVsZXNhbnMgVGV4dFwiKSB7XG4vLyAgICAgICAgIGxldHRlclNwYWNlVmFsdWUgPSBcIi0wLjM3cHhcIjtcbi8vICAgICAgIH0gZWxzZSBpZiAoZm9udEZhbWlseSA9PT0gXCJUZWxlc2FucyBBZ2F0ZVwiKSB7XG4vLyAgICAgICAgIGxldHRlclNwYWNlVmFsdWUgPSBcIi0wLjE5cHhcIjtcbi8vICAgICAgIH0gZWxzZSB7XG4vLyAgICAgICAgIGxldHRlclNwYWNlVmFsdWUgPSBgMGA7XG4vLyAgICAgICB9XG4vLyAgICAgICBicmVhaztcbi8vICAgfVxuXG4vLyAgIHJldHVybiBsZXR0ZXJTcGFjZVZhbHVlO1xuLy8gfVxuXG5lbnVtIFJBTkdFX1RZUEVTIHtcbiAgTEVUVEVSX1NQQUNJTkcsXG4gIExJTkVfSEVJR0hULFxuICBGT05UX1NJWkUsXG4gIENPTE9VUixcbiAgRk9OVCxcbn1cblxuZnVuY3Rpb24gZ2V0UmFuZ2VWYWwoXG4gIHRleHROb2RlOiBUZXh0Tm9kZSxcbiAgcmFuZ2VUeXBlOiBSQU5HRV9UWVBFUyxcbiAgc3RhcnQ6IG51bWJlcixcbiAgZW5kOiBudW1iZXJcbikge1xuICBzd2l0Y2ggKHJhbmdlVHlwZSkge1xuICAgIGNhc2UgUkFOR0VfVFlQRVMuTEVUVEVSX1NQQUNJTkc6IHtcbiAgICAgIGNvbnN0IGxldHRlclNwYWNlID0gdGV4dE5vZGUuZ2V0UmFuZ2VMZXR0ZXJTcGFjaW5nKHN0YXJ0LCBlbmQpO1xuICAgICAgaWYgKGxldHRlclNwYWNlID09PSBmaWdtYS5taXhlZCkge1xuICAgICAgICByZXR1cm4gbGV0dGVyU3BhY2U7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbGV0dGVyU3BhY2UudW5pdCA9PT0gXCJQRVJDRU5UXCJcbiAgICAgICAgICA/IGAke2xldHRlclNwYWNlLnZhbHVlIC8gMTAwfXJlbWBcbiAgICAgICAgICA6IGAke2xldHRlclNwYWNlLnZhbHVlfXB4YDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjYXNlIFJBTkdFX1RZUEVTLkxJTkVfSEVJR0hUOiB7XG4gICAgICBjb25zdCBsaW5lSGVpZ2h0ID0gdGV4dE5vZGUuZ2V0UmFuZ2VMaW5lSGVpZ2h0KHN0YXJ0LCBlbmQpO1xuICAgICAgaWYgKGxpbmVIZWlnaHQgPT09IGZpZ21hLm1peGVkKSB7XG4gICAgICAgIHJldHVybiBsaW5lSGVpZ2h0O1xuICAgICAgfSBlbHNlIGlmIChsaW5lSGVpZ2h0LnVuaXQgPT09IFwiQVVUT1wiKSB7XG4gICAgICAgIHJldHVybiBcIm5vcm1hbFwiO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGxpbmVIZWlnaHQudW5pdCA9PT0gXCJQRVJDRU5UXCJcbiAgICAgICAgICA/IGAke2xpbmVIZWlnaHQudmFsdWUgLyAxMDB9cmVtYFxuICAgICAgICAgIDogYCR7bGluZUhlaWdodC52YWx1ZX1weGA7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY2FzZSBSQU5HRV9UWVBFUy5GT05UX1NJWkU6XG4gICAgICByZXR1cm4gdGV4dE5vZGUuZ2V0UmFuZ2VGb250U2l6ZShzdGFydCwgZW5kKTtcblxuICAgIGNhc2UgUkFOR0VfVFlQRVMuQ09MT1VSOiB7XG4gICAgICBjb25zdCBwYWludCA9IHRleHROb2RlLmdldFJhbmdlRmlsbHMoc3RhcnQsIGVuZCk7XG4gICAgICBpZiAocGFpbnQgPT09IGZpZ21hLm1peGVkKSB7XG4gICAgICAgIHJldHVybiBwYWludDtcbiAgICAgIH0gZWxzZSBpZiAocGFpbnRbMF0udHlwZSA9PT0gXCJTT0xJRFwiKSB7XG4gICAgICAgIHJldHVybiB7IC4uLnBhaW50WzBdLmNvbG9yIH07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4geyByOiAwLCBnOiAwLCBiOiAwIH0gYXMgUkdCO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNhc2UgUkFOR0VfVFlQRVMuRk9OVDpcbiAgICAgIHJldHVybiB0ZXh0Tm9kZS5nZXRSYW5nZUZvbnROYW1lKHN0YXJ0LCBlbmQpO1xuXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0VHlwZVZhbHVlcyhcbiAgdGV4dE5vZGU6IFRleHROb2RlLFxuICByYW5nZVR5cGU6IFJBTkdFX1RZUEVTXG4pOiBJVGV4dFByb3BbXSB7XG4gIGNvbnN0IHsgY2hhcmFjdGVycyB9ID0gdGV4dE5vZGU7XG5cbiAgLy8gSWYgdGhlcmUncyBubyBtaXhlZCBzdHlsZSB0aGVuIHNob3J0IGNpcmN1aXQgcmVzcG9uc2VcbiAgY29uc3QgZnVsbFJhbmdlVmFsdWUgPSBnZXRSYW5nZVZhbCh0ZXh0Tm9kZSwgcmFuZ2VUeXBlLCAwLCBjaGFyYWN0ZXJzLmxlbmd0aCk7XG4gIGlmIChmdWxsUmFuZ2VWYWx1ZSAhPT0gZmlnbWEubWl4ZWQpIHtcbiAgICByZXR1cm4gW3sgc3RhcnQ6IDAsIGVuZDogY2hhcmFjdGVycy5sZW5ndGgsIHZhbHVlOiBmdWxsUmFuZ2VWYWx1ZSB9XTtcbiAgfVxuXG4gIC8vIFRoZXJlJ3MgbWl4ZWQgc3R5bGVzLiBHbyB0aHJvdWdoIGVhY2ggY2hhciB0byBleHRyYWN0IHN0eWxlIHJhbmdlc1xuICAvLyBCb290c3RyYXAgcmFuZ2UgdmFsdWVzIHdpdGggZmlyc3QgY2hhcmFjdGVyIHdoaWNoIGlzIG5ldmVyIG1peGVkIHR5cGVcbiAgY29uc3QgdmFsdWVzOiBJVGV4dFByb3BbXSA9IFtcbiAgICB7IHN0YXJ0OiAwLCBlbmQ6IDEsIHZhbHVlOiBnZXRSYW5nZVZhbCh0ZXh0Tm9kZSwgcmFuZ2VUeXBlLCAwLCAxKSB9LFxuICBdO1xuXG4gIC8vIExvb3AgdGhyb3VnaCBlYWNoIGNoYXJhY3RlciB0byBmaW5kIHJhbmdlcy5cbiAgLy8gV2hlbiBhIG1peGVkIHJhbmdlIGlzIGZvdW5kIHVwZGF0ZSB0aGUgY3VycmVudCBlbmQgcG9zaXRpb24gYW5kXG4gIC8vIGNyZWF0ZSBhIG5ldyByYW5nZSB3aXRoIHRoZSBuZXh0IHN0eWxlXG4gIGZvciAobGV0IGkgPSAxOyBpIDw9IGNoYXJhY3RlcnMubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBwcm9wID0gdmFsdWVzW3ZhbHVlcy5sZW5ndGggLSAxXTtcblxuICAgIC8vIFVwZGF0ZSBlbmQgcG9zaXRpb24gb2YgY3VycmVudCBzdHlsZVxuICAgIHByb3AuZW5kID0gaTtcblxuICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9IGdldFJhbmdlVmFsKHRleHROb2RlLCByYW5nZVR5cGUsIHByb3Auc3RhcnQsIGkpO1xuXG4gICAgaWYgKGN1cnJlbnRWYWx1ZSA9PT0gZmlnbWEubWl4ZWQpIHtcbiAgICAgIC8vIFNldCBlbmQgb2YgdGhlIGN1cnJlbnQgcmFuZ2VcbiAgICAgIHByb3AuZW5kID0gaSAtIDE7XG5cbiAgICAgIC8vIENyZWF0ZSBhbmQgc3RvcmUgbmV4dCByYW5nZSBzdHlsZVxuICAgICAgdmFsdWVzLnB1c2goe1xuICAgICAgICBzdGFydDogaSxcbiAgICAgICAgZW5kOiBpICsgMSxcbiAgICAgICAgdmFsdWU6IGdldFJhbmdlVmFsKHRleHROb2RlLCByYW5nZVR5cGUsIGkgLSAxLCBpKSxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB2YWx1ZXM7XG59XG5cbmZ1bmN0aW9uIGZpbmRJdGVtSW5SYW5nZShcbiAgaXRlbXM6IElUZXh0UHJvcFtdLFxuICBzdGFydDogbnVtYmVyLFxuICBlbmQ6IG51bWJlclxuKTogSVRleHRQcm9wIHwgdW5kZWZpbmVkIHtcbiAgcmV0dXJuIGl0ZW1zLmZpbmQoKGl0ZW0pID0+IHN0YXJ0ID49IGl0ZW0uc3RhcnQgJiYgZW5kIDw9IGl0ZW0uZW5kKTtcbn1cblxuZnVuY3Rpb24gZ2V0VGV4dFJhbmdlVmFsdWVzKHRleHROb2RlOiBUZXh0Tm9kZSk6IElUZXh0U3R5bGVbXSB7XG4gIGNvbnN0IHsgY2hhcmFjdGVycyB9ID0gdGV4dE5vZGU7XG5cbiAgY29uc3QgcmFuZ2VzID0ge1xuICAgIGxldHRlclNwYWNlOiBnZXRUeXBlVmFsdWVzKHRleHROb2RlLCBSQU5HRV9UWVBFUy5MRVRURVJfU1BBQ0lORyksXG4gICAgbGluZUhlaWdodDogZ2V0VHlwZVZhbHVlcyh0ZXh0Tm9kZSwgUkFOR0VfVFlQRVMuTElORV9IRUlHSFQpLFxuICAgIHNpemU6IGdldFR5cGVWYWx1ZXModGV4dE5vZGUsIFJBTkdFX1RZUEVTLkZPTlRfU0laRSksXG4gICAgY29sb3VyOiBnZXRUeXBlVmFsdWVzKHRleHROb2RlLCBSQU5HRV9UWVBFUy5DT0xPVVIpLFxuICAgIGZvbnQ6IGdldFR5cGVWYWx1ZXModGV4dE5vZGUsIFJBTkdFX1RZUEVTLkZPTlQpLFxuICB9O1xuXG4gIC8vIENvbGxlY3QgYWxsIGVuZCBpbmRleGVkLCBzb3J0IGFjY2VuZGluZyBhbmQgcmVtb3ZlIGR1cGxpY2F0ZXNcbiAgY29uc3QgZW5kcyA9IE9iamVjdC52YWx1ZXMocmFuZ2VzKVxuICAgIC5mbGF0TWFwKChyYW5nZSkgPT4gcmFuZ2UubWFwKChpdGVtKSA9PiBpdGVtLmVuZCkpXG4gICAgLnNvcnQoKGEsIGIpID0+IChhID4gYiA/IDEgOiAtMSkpXG4gICAgLmZpbHRlcigobiwgaSwgc2VsZikgPT4gc2VsZi5pbmRleE9mKG4pID09PSBpKTtcblxuICAvLyBUT0RPOiBTaW1wbGlmeSBlbmQgaW5kZXggbG9naWNcbiAgY29uc3Qgc3R5bGVzID0gW107XG4gIGxldCBpU3RhcnQgPSAwO1xuICBmb3IgKGxldCBpRW5kIG9mIGVuZHMpIHtcbiAgICBpZiAoaVN0YXJ0ID09PSBpRW5kKSB7XG4gICAgICBpRW5kKys7XG4gICAgfVxuXG4gICAgY29uc3Qgc3R5bGU6IElUZXh0U3R5bGUgPSB7XG4gICAgICBzdGFydDogaVN0YXJ0LFxuICAgICAgZW5kOiBpRW5kLFxuICAgICAgY2hhcnM6IGNoYXJhY3RlcnMuc3Vic3RyaW5nKGlTdGFydCwgaUVuZCksXG4gICAgICBmb250OiBmaW5kSXRlbUluUmFuZ2UocmFuZ2VzLmZvbnQsIGlTdGFydCArIDEsIGlFbmQpPy52YWx1ZSxcbiAgICAgIGNvbG91cjogZmluZEl0ZW1JblJhbmdlKHJhbmdlcy5jb2xvdXIsIGlTdGFydCArIDEsIGlFbmQpPy52YWx1ZSxcbiAgICAgIHNpemU6IGZpbmRJdGVtSW5SYW5nZShyYW5nZXMuc2l6ZSwgaVN0YXJ0ICsgMSwgaUVuZCk/LnZhbHVlLFxuICAgICAgbGV0dGVyU3BhY2U6IGZpbmRJdGVtSW5SYW5nZShyYW5nZXMubGV0dGVyU3BhY2UsIGlTdGFydCArIDEsIGlFbmQpPy52YWx1ZSxcbiAgICAgIGxpbmVIZWlnaHQ6IGZpbmRJdGVtSW5SYW5nZShyYW5nZXMubGluZUhlaWdodCwgaVN0YXJ0ICsgMSwgaUVuZCk/LnZhbHVlLFxuICAgIH07XG5cbiAgICBzdHlsZXMucHVzaChzdHlsZSk7XG4gICAgaVN0YXJ0ID0gaUVuZDtcbiAgfVxuXG4gIHJldHVybiBzdHlsZXM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRUZXh0Tm9kZXNGcm9tRnJhbWUoZnJhbWU6IEZyYW1lTm9kZSk6IHRleHREYXRhW10ge1xuICBjb25zdCB0ZXh0Tm9kZXMgPSBmcmFtZS5maW5kQWxsKFxuICAgIChub2RlKSA9PiBub2RlLnR5cGUgPT09IFwiVEVYVFwiICYmIG5vZGUuY2hhcmFjdGVycy5sZW5ndGggPiAwXG4gICkgYXMgVGV4dE5vZGVbXTtcbiAgY29uc3QgeyBhYnNvbHV0ZVRyYW5zZm9ybSB9ID0gZnJhbWU7XG4gIGNvbnN0IHJvb3RYID0gYWJzb2x1dGVUcmFuc2Zvcm1bMF1bMl07XG4gIGNvbnN0IHJvb3RZID0gYWJzb2x1dGVUcmFuc2Zvcm1bMV1bMl07XG5cbiAgY29uc3QgdGV4dENvbGxlY3Rpb246IHRleHREYXRhW10gPSBbXTtcbiAgZm9yIChjb25zdCB0ZXh0Tm9kZSBvZiB0ZXh0Tm9kZXMpIHtcbiAgICBjb25zdCB7XG4gICAgICBhYnNvbHV0ZVRyYW5zZm9ybSxcbiAgICAgIHdpZHRoLFxuICAgICAgaGVpZ2h0LFxuICAgICAgY2hhcmFjdGVycyxcbiAgICAgIHRleHRBbGlnbkhvcml6b250YWwsXG4gICAgICB0ZXh0QWxpZ25WZXJ0aWNhbCxcbiAgICAgIGNvbnN0cmFpbnRzLFxuICAgICAgc3Ryb2tlcyxcbiAgICAgIHN0cm9rZVdlaWdodCxcbiAgICAgIGlkLFxuICAgIH0gPSB0ZXh0Tm9kZTtcblxuICAgIGNvbnNvbGUubG9nKHN0cm9rZXMsIHN0cm9rZVdlaWdodCk7XG5cbiAgICBsZXQgc3Ryb2tlRGV0YWlscyA9IHt9O1xuXG4gICAgY29uc3Qgc3Ryb2tlQ29sb3VyID0gc3Ryb2tlcy5maW5kKFxuICAgICAgKHBhaW50KSA9PiBwYWludC50eXBlID09PSBcIlNPTElEXCJcbiAgICApIGFzIFNvbGlkUGFpbnQ7XG5cbiAgICBpZiAoc3Ryb2tlQ29sb3VyKSB7XG4gICAgICBzdHJva2VEZXRhaWxzID0ge1xuICAgICAgICBzdHJva2VXZWlnaHQ6IHN0cm9rZVdlaWdodCxcbiAgICAgICAgc3Ryb2tlQ29sb3VyOiBgcmdiKCR7T2JqZWN0LnZhbHVlcyhzdHJva2VDb2xvdXIuY29sb3IpXG4gICAgICAgICAgLm1hcCgodmFsKSA9PiB2YWwgKiAyNTUpXG4gICAgICAgICAgLmpvaW4oXCIsXCIpfSlgLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBOT1RFOiBGaWdtYSBub2RlIHgsIHkgYXJlIHJlbGF0aXZlIHRvIGZpcnN0IHBhcmVudCwgd2Ugd2FudCB0aGVtXG4gICAgLy8gcmVsYXRpdmUgdG8gdGhlIHJvb3QgZnJhbWVcbiAgICBjb25zdCB0ZXh0WCA9IGFic29sdXRlVHJhbnNmb3JtWzBdWzJdO1xuICAgIGNvbnN0IHRleHRZID0gYWJzb2x1dGVUcmFuc2Zvcm1bMV1bMl07XG4gICAgY29uc3QgeCA9IHRleHRYIC0gcm9vdFg7XG4gICAgY29uc3QgeSA9IHRleHRZIC0gcm9vdFk7XG5cbiAgICAvLyBHZXQgZm9udCBzaXplcyByYW5nZXNcbiAgICBjb25zdCByYW5nZVN0eWxlcyA9IGdldFRleHRSYW5nZVZhbHVlcyh0ZXh0Tm9kZSk7XG4gICAgdGV4dENvbGxlY3Rpb24ucHVzaCh7XG4gICAgICB4LFxuICAgICAgeSxcbiAgICAgIHdpZHRoLFxuICAgICAgaGVpZ2h0LFxuICAgICAgY2hhcmFjdGVycyxcbiAgICAgIHRleHRBbGlnbkhvcml6b250YWwsXG4gICAgICB0ZXh0QWxpZ25WZXJ0aWNhbCxcbiAgICAgIGNvbnN0cmFpbnRzLFxuICAgICAgcmFuZ2VTdHlsZXMsXG4gICAgICBpZCxcbiAgICAgIC4uLnN0cm9rZURldGFpbHMsXG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gdGV4dENvbGxlY3Rpb247XG59XG4iLCAiaW1wb3J0IHsgc2V0SGVhZGxpbmVzQW5kU291cmNlUHJvcHMsIElGcmFtZURhdGEgfSBmcm9tIFwidHlwZXNcIjtcbmltcG9ydCB7IGdldE5vZGVUZXh0LCBnZXRUZXh0Tm9kZXNGcm9tRnJhbWUgfSBmcm9tIFwiaGVscGVycy9maWdtYVRleHRcIjtcbmltcG9ydCB7IEhFQURMSU5FX05PREVfTkFNRVMsIE1TR19FVkVOVFMgfSBmcm9tIFwiLi9jb25zdGFudHNcIjtcbmltcG9ydCB7IHBvc3RNYW4gfSBmcm9tIFwidXRpbHMvbWVzc2FnZXNcIjtcbmltcG9ydCB7IHJlc2l6ZUFuZE9wdGltaXNlSW1hZ2UgfSBmcm9tIFwiLi9oZWxwZXJzL2ltYWdlSGVscGVyXCI7XG5cbi8qKlxuICogQ29tcHJlc3MgaW1hZ2UgdXNpbmcgYnJvd3NlcidzIG5hdGl2ZSBpbWFnZSBkZWNvZGluZyBzdXBwb3J0XG4gKiBAY29udGV4dCBCcm93c2VyIChVSSlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXByZXNzSW1hZ2UocHJvcHM6IHtcbiAgaW1nRGF0YTogVWludDhBcnJheTtcbiAgbm9kZURpbWVuc2lvbnM6IHsgd2lkdGg6IG51bWJlcjsgaGVpZ2h0OiBudW1iZXIgfVtdO1xufSk6IFByb21pc2U8VWludDhBcnJheT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNvbnN0IGltZyA9IG5ldyBJbWFnZSgpO1xuICAgIGNvbnN0IHsgaW1nRGF0YSwgbm9kZURpbWVuc2lvbnMgfSA9IHByb3BzO1xuXG4gICAgaW1nLmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsICgpID0+IHtcbiAgICAgIHJlc2l6ZUFuZE9wdGltaXNlSW1hZ2Uoe1xuICAgICAgICBpbWcsXG4gICAgICAgIGltZ0RhdGEsXG4gICAgICAgIG5vZGVEaW1lbnNpb25zLFxuICAgICAgICByZXNvbHZlLFxuICAgICAgICByZWplY3QsXG4gICAgICB9KS5jYXRjaCgoZXJyKSA9PiByZWplY3QoZXJyKSk7XG4gICAgfSk7XG5cbiAgICBpbWcuYWRkRXZlbnRMaXN0ZW5lcihcImVycm9yXCIsIChlcnIpID0+IHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvciBsb2FkaW5nIGNvbXByZXNzZWQgaW1hZ2VcIik7XG4gICAgICByZWplY3QoZXJyKTtcbiAgICB9KTtcblxuICAgIGNvbnN0IGJsb2IgPSBuZXcgQmxvYihbaW1nRGF0YV0sIHsgdHlwZTogXCJpbWFnZS9wbmdcIiB9KTtcbiAgICBjb25zdCBpbWdVcmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuICAgIGltZy5zcmMgPSBpbWdVcmw7XG4gIH0pO1xufVxuXG4vKipcbiAqIFRlc3QgaWYgRmlnbWEgbm9kZSBzdXBwb3J0cyBmaWxsIHByb3BlcnR5IHR5cGVcbiAqL1xuZnVuY3Rpb24gc3VwcG9ydHNGaWxscyhcbiAgbm9kZTogU2NlbmVOb2RlXG4pOiBub2RlIGlzIEV4Y2x1ZGU8U2NlbmVOb2RlLCBTbGljZU5vZGUgfCBHcm91cE5vZGU+IHtcbiAgcmV0dXJuIG5vZGUudHlwZSAhPT0gXCJTTElDRVwiICYmIG5vZGUudHlwZSAhPT0gXCJHUk9VUFwiO1xufVxuXG4vKipcbiAqIFJlbmRlciBhbGwgc3BlY2lmaWVkIGZyYW1lcyBvdXQgYXMgU1ZHIGVsZW1lbnQuXG4gKiBJbWFnZXMgYXJlIG9wdGltaXNlZCBmb3Igc2l6ZSBhbmQgaW1hZ2UgdHlwZSBjb21wcmVzc2lvbiB2aWEgdGhlIGZyb250ZW5kIFVJXG4gKlxuICogQGNvbnRleHQgZmlnbWFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlbmRlckZyYW1lcyhmcmFtZUlkczogc3RyaW5nW10pOiBQcm9taXNlPFVpbnQ4QXJyYXk+IHtcbiAgY29uc3Qgb3V0cHV0Tm9kZSA9IGZpZ21hLmNyZWF0ZUZyYW1lKCk7XG4gIG91dHB1dE5vZGUubmFtZSA9IFwib3V0cHV0XCI7XG5cbiAgdHJ5IHtcbiAgICAvLyBDbG9uZSBlYWNoIHNlbGVjdGVkIGZyYW1lIGFkZGluZyB0aGVtIHRvIHRoZSB0ZW1wb3JhcnkgY29udGFpbmVyIGZyYW1lXG4gICAgY29uc3QgZnJhbWVzID0gZmlnbWEuY3VycmVudFBhZ2UuZmluZEFsbCgoeyBpZCB9KSA9PiBmcmFtZUlkcy5pbmNsdWRlcyhpZCkpO1xuXG4gICAgLy8gQ2FsY3VsYXRlIHRoZSBtYXggZGltZW5zaW9ucyBmb3Igb3V0cHV0IGNvbnRhaW5lciBmcmFtZVxuICAgIGNvbnN0IG1heFdpZHRoID0gTWF0aC5tYXgoLi4uZnJhbWVzLm1hcCgoZikgPT4gZi53aWR0aCkpO1xuICAgIGNvbnN0IG1heEhlaWdodCA9IE1hdGgubWF4KC4uLmZyYW1lcy5tYXAoKGYpID0+IGYuaGVpZ2h0KSk7XG4gICAgb3V0cHV0Tm9kZS5yZXNpemVXaXRob3V0Q29uc3RyYWludHMobWF4V2lkdGgsIG1heEhlaWdodCk7XG5cbiAgICBmb3IgKGNvbnN0IGZyYW1lIG9mIGZyYW1lcykge1xuICAgICAgY29uc3QgY2xvbmUgPSBmcmFtZT8uY2xvbmUoKSBhcyBGcmFtZU5vZGU7XG5cbiAgICAgIC8vIE5PVEU6IFByZXZpb3VzbHkgdGV4dCBub2RlcyB3ZXJlIHJlbW92ZWQgaGVyZSBidXQgdGhpcyBjYXVzZWRcbiAgICAgIC8vIHdpZHRoIGNoYW5nZXMgaW4gYXV0by1sYXlvdXQuIFRleHQgaXMgcmVtb3ZlZCBhcyBwYXJ0IG9mIHRoZVxuICAgICAgLy8gU1ZHIG9wdGltaXNhdGlvbiBzdGVwLlxuXG4gICAgICAvLyBBcHBlbmQgY2xvbmVkIGZyYW1lIHRvIHRlbXAgb3V0cHV0IGZyYW1lIGFuZCBwb3NpdGlvbiBpbiB0b3AgbGVmdFxuICAgICAgb3V0cHV0Tm9kZS5hcHBlbmRDaGlsZChjbG9uZSk7XG4gICAgICBjbG9uZS54ID0gMDtcbiAgICAgIGNsb25lLnkgPSAwO1xuXG4gICAgICAvLyBTdG9yZSB0aGUgZnJhbWUgSUQgYXMgbm9kZSBuYW1lIChleHBvcnRlZCBpbiBTVkcgcHJvcHMpXG4gICAgICBjbG9uZS5uYW1lID0gZnJhbWUuaWQ7XG4gICAgfVxuXG4gICAgLy8gRmluZCBhbGwgbm9kZXMgd2l0aCBpbWFnZSBmaWxsc1xuICAgIGNvbnN0IG5vZGVzV2l0aEltYWdlcyA9IG91dHB1dE5vZGUuZmluZEFsbChcbiAgICAgIChub2RlKSA9PlxuICAgICAgICBzdXBwb3J0c0ZpbGxzKG5vZGUpICYmXG4gICAgICAgIG5vZGUuZmlsbHMgIT09IGZpZ21hLm1peGVkICYmXG4gICAgICAgIG5vZGUuZmlsbHMuc29tZSgoZmlsbCkgPT4gZmlsbC50eXBlID09PSBcIklNQUdFXCIpXG4gICAgKTtcblxuICAgIC8vIEEgc2luZ2xlIGltYWdlIGNhbiBiZSB1c2VkIG11bHRpcGxlIHRpbWVzIG9uIGRpZmZlcmVudCBub2RlcyBpbiBkaWZmZXJlbnRcbiAgICAvLyBmcmFtZXMuIFRvIGVuc3VyZSBpbWFnZXMgYXJlIG9ubHkgb3B0aW1pc2VkIG9uY2UgYSBjYWNoZSBpcyBjcmVhdGVkXG4gICAgLy8gb2YgdW5pcXVlIGltYWdlcyBhbmQgdXNlZCB0byByZXBsYWNlIG9yaWdpbmFsIGFmdGVyIHRoZSBhc3luYyBwcm9jZXNzaW5nXG4gICAgLy8gaXMgY29tcGxldGVkLlxuICAgIGNvbnN0IGltYWdlQ2FjaGU6IHtcbiAgICAgIFtpZDogc3RyaW5nXTogeyB3aWR0aDogbnVtYmVyOyBoZWlnaHQ6IG51bWJlcjsgaWQ6IHN0cmluZyB9W107XG4gICAgfSA9IHt9O1xuXG4gICAgZm9yIChjb25zdCBub2RlIG9mIG5vZGVzV2l0aEltYWdlcykge1xuICAgICAgaWYgKHN1cHBvcnRzRmlsbHMobm9kZSkgJiYgbm9kZS5maWxscyAhPT0gZmlnbWEubWl4ZWQpIHtcbiAgICAgICAgLy8gVGhlIGZyb250ZW5kIFVJIHdoaWNoIGhhbmRsZXMgdGhlIGltYWdlIG9wdGltaXNhdGlvbiBuZWVkcyB0byBrbm93XG4gICAgICAgIC8vIHRoZSBzaXplcyBvZiBlYWNoIG5vZGUgdGhhdCB1c2VzIHRoZSBpbWFnZS4gVGhlIGRpbWVuc2lvbnMgYXJlIHN0b3JlZFxuICAgICAgICAvLyB3aXRoIHRoZSBpbWFnZSBoYXNoIElEIGluIHRoZSBjYWNoZSBmb3IgbGF0ZXIgdXNlLlxuICAgICAgICBjb25zdCBkaW1lbnNpb25zID0ge1xuICAgICAgICAgIHdpZHRoOiBub2RlLndpZHRoLFxuICAgICAgICAgIGhlaWdodDogbm9kZS5oZWlnaHQsXG4gICAgICAgICAgaWQ6IG5vZGUuaWQsXG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IGltZ1BhaW50ID0gWy4uLm5vZGUuZmlsbHNdLmZpbmQoKHApID0+IHAudHlwZSA9PT0gXCJJTUFHRVwiKTtcblxuICAgICAgICBpZiAoaW1nUGFpbnQ/LnR5cGUgPT09IFwiSU1BR0VcIiAmJiBpbWdQYWludC5pbWFnZUhhc2gpIHtcbiAgICAgICAgICAvLyBBZGQgdGhlIGltYWdlIGRpbWVuc2lvbnMgdG8gdGhlIGNhY2hlLCBvciB1cGRhdGUgYW5kIGV4aXN0aW5nIGNhY2hlXG4gICAgICAgICAgLy8gaXRlbSB3aXRoIGFub3RoZXIgbm9kZXMgZGltZW5zaW9uc1xuICAgICAgICAgIGlmIChpbWFnZUNhY2hlW2ltZ1BhaW50LmltYWdlSGFzaF0pIHtcbiAgICAgICAgICAgIGltYWdlQ2FjaGVbaW1nUGFpbnQuaW1hZ2VIYXNoXS5wdXNoKGRpbWVuc2lvbnMpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpbWFnZUNhY2hlW2ltZ1BhaW50LmltYWdlSGFzaF0gPSBbZGltZW5zaW9uc107XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gU2VuZCBlYWNoIGltYWdlIGZyb20gdGhlIGltYWdlQ2FjaGUgdG8gdGhlIGZyb250ZW5kIGZvciBvcHRpbWlzYXRpb24uXG4gICAgLy8gVGhlIG9wZXJhdGlvbiBpcyBhc3luYyBhbmQgY2FuIHRha2Ugc29tZSB0aW1lIGlmIHRoZSBpbWFnZXMgYXJlIGxhcmdlLlxuICAgIGZvciAoY29uc3QgaW1hZ2VIYXNoIGluIGltYWdlQ2FjaGUpIHtcbiAgICAgIGNvbnN0IGJ5dGVzID0gYXdhaXQgZmlnbWEuZ2V0SW1hZ2VCeUhhc2goaW1hZ2VIYXNoKS5nZXRCeXRlc0FzeW5jKCk7XG4gICAgICBjb25zdCBjb21wcmVzc2VkSW1hZ2U6IFVpbnQ4QXJyYXkgPSBhd2FpdCBwb3N0TWFuLnNlbmQoe1xuICAgICAgICB3b3JrbG9hZDogTVNHX0VWRU5UUy5DT01QUkVTU19JTUFHRSxcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgIGltZ0RhdGE6IGJ5dGVzLFxuICAgICAgICAgIG5vZGVEaW1lbnNpb25zOiBpbWFnZUNhY2hlW2ltYWdlSGFzaF0sXG4gICAgICAgIH0sXG4gICAgICB9KTtcblxuICAgICAgLy8gU3RvcmUgdGhlIG5ldyBpbWFnZSBpbiBmaWdtYSBhbmQgZ2V0IHRoZSBuZXcgaW1hZ2UgaGFzaFxuICAgICAgY29uc3QgbmV3SW1hZ2VIYXNoID0gZmlnbWEuY3JlYXRlSW1hZ2UoY29tcHJlc3NlZEltYWdlKS5oYXNoO1xuXG4gICAgICAvLyBVcGRhdGUgbm9kZXMgd2l0aCBuZXcgaW1hZ2UgcGFpbnQgZmlsbFxuICAgICAgbm9kZXNXaXRoSW1hZ2VzLmZvckVhY2goKG5vZGUpID0+IHtcbiAgICAgICAgaWYgKHN1cHBvcnRzRmlsbHMobm9kZSkgJiYgbm9kZS5maWxscyAhPT0gZmlnbWEubWl4ZWQpIHtcbiAgICAgICAgICBjb25zdCBpbWdQYWludCA9IFsuLi5ub2RlLmZpbGxzXS5maW5kKFxuICAgICAgICAgICAgKHApID0+IHAudHlwZSA9PT0gXCJJTUFHRVwiICYmIHAuaW1hZ2VIYXNoID09PSBpbWFnZUhhc2hcbiAgICAgICAgICApO1xuXG4gICAgICAgICAgaWYgKGltZ1BhaW50KSB7XG4gICAgICAgICAgICBjb25zdCBuZXdQYWludCA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoaW1nUGFpbnQpKTtcbiAgICAgICAgICAgIG5ld1BhaW50LmltYWdlSGFzaCA9IG5ld0ltYWdlSGFzaDtcbiAgICAgICAgICAgIG5vZGUuZmlsbHMgPSBbbmV3UGFpbnRdO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gSEFDSyEgRmlnbWEgdGFrZXMgc29tZSB0aW1lIHRvIHVwZGF0ZSB0aGUgaW1hZ2UgZmlsbHMuIFdhaXRpbmcgc29tZVxuICAgIC8vIGFtb3VudCBpcyByZXF1aXJlZCBvdGhlcndpc2UgdGhlIGltYWdlcyBhcHBlYXIgYmxhbmsuXG4gICAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMzAwKSk7XG5cbiAgICAvLyBSZW5kZXIgb3V0cHV0IGNvbnRhaW5lciBmcmFtZXMgdG8gU1ZHIG1hcmstdXAgKGluIGEgdWludDggYnl0ZSBhcnJheSlcbiAgICBjb25zdCBzdmcgPSBhd2FpdCBvdXRwdXROb2RlLmV4cG9ydEFzeW5jKHtcbiAgICAgIGZvcm1hdDogXCJTVkdcIixcbiAgICAgIHN2Z1NpbXBsaWZ5U3Ryb2tlOiB0cnVlLFxuICAgICAgc3ZnT3V0bGluZVRleHQ6IGZhbHNlLFxuICAgICAgc3ZnSWRBdHRyaWJ1dGU6IHRydWUsXG4gICAgfSk7XG5cbiAgICByZXR1cm4gc3ZnO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoZXJyKTtcbiAgfSBmaW5hbGx5IHtcbiAgICAvLyBSZW1vdmUgdGhlIG91dHB1dCBmcmFtZSB3aGF0ZXZlciBoYXBwZW5zXG4gICAgb3V0cHV0Tm9kZS5yZW1vdmUoKTtcbiAgfVxufVxuXG4vKipcbiAqIENyZWF0ZSwgdXBkYXRlIG9yIGRlbGV0ZSBoZWFkbGluZSB0ZXh0IGluIGZpZ21hIGRvY3VtZW50IGZyb20gcGx1Z2luIFVJXG4gKlxuICogQGNvbnRleHQgZmlnbWFcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldEhlYWRsaW5lc0FuZFNvdXJjZShwcm9wczogc2V0SGVhZGxpbmVzQW5kU291cmNlUHJvcHMpOiB2b2lkIHtcbiAgY29uc3QgcGFnZU5vZGUgPSBmaWdtYS5jdXJyZW50UGFnZTtcbiAgY29uc3QgbW9zdExlZnRQb3MgPSBNYXRoLm1pbiguLi5wYWdlTm9kZS5jaGlsZHJlbi5tYXAoKG5vZGUpID0+IG5vZGUueCkpO1xuICBjb25zdCBtb3N0VG9wUG9zID0gTWF0aC5taW4oLi4ucGFnZU5vZGUuY2hpbGRyZW4ubWFwKChub2RlKSA9PiBub2RlLnkpKTtcblxuICAvLyBMb29wIHRocm91Z2ggZWFjaCBoZWFkbGluZSBub2RlIG5hbWVzXG4gIGZvciAoY29uc3QgbmFtZSBvZiBPYmplY3QudmFsdWVzKEhFQURMSU5FX05PREVfTkFNRVMpKSB7XG4gICAgbGV0IG5vZGUgPVxuICAgICAgKHBhZ2VOb2RlLmZpbmRDaGlsZChcbiAgICAgICAgKG5vZGUpID0+IG5vZGUubmFtZSA9PT0gbmFtZSAmJiBub2RlLnR5cGUgPT09IFwiVEVYVFwiXG4gICAgICApIGFzIFRleHROb2RlKSB8fCBudWxsO1xuICAgIGNvbnN0IHRleHRDb250ZW50ID0gcHJvcHNbbmFtZV07XG5cbiAgICAvLyBSZW1vdmUgbm9kZSBpZiB0aGVyZSdzIG5vIHRleHQgY29udGVudFxuICAgIGlmIChub2RlICYmICF0ZXh0Q29udGVudCkge1xuICAgICAgbm9kZS5yZW1vdmUoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBEbyBub3RoaW5nIGlzIHRoZXJlJ3Mgbm8gdGV4dCBjb250ZW50XG4gICAgaWYgKCF0ZXh0Q29udGVudCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIENyZWF0ZSBub2RlIGlmIGl0IGRvZXNuJ3QgYWxyZWFkeSBleGlzdFxuICAgIGlmICghbm9kZSkge1xuICAgICAgbm9kZSA9IGZpZ21hLmNyZWF0ZVRleHQoKTtcbiAgICAgIG5vZGUubmFtZSA9IG5hbWU7XG5cbiAgICAgIC8vIFBvc2l0aW9uIG5ldyB0ZXh0IG5vZGUgdG9wLWxlZnQgb2YgdGhlIGZpcnN0IGZyYW1lIGluIHRoZSBwYWdlXG4gICAgICBsZXQgeSA9IG1vc3RUb3BQb3MgLSA2MDtcbiAgICAgIGlmIChuYW1lID09PSBIRUFETElORV9OT0RFX05BTUVTLkhFQURMSU5FKSB7XG4gICAgICAgIHkgLT0gNjA7XG4gICAgICB9IGVsc2UgaWYgKG5hbWUgPT09IEhFQURMSU5FX05PREVfTkFNRVMuU1VCSEVBRCkge1xuICAgICAgICB5IC09IDMwO1xuICAgICAgfVxuXG4gICAgICBub2RlLnJlbGF0aXZlVHJhbnNmb3JtID0gW1xuICAgICAgICBbMSwgMCwgbW9zdExlZnRQb3NdLFxuICAgICAgICBbMCwgMSwgeV0sXG4gICAgICBdO1xuICAgIH1cblxuICAgIC8vIEVuc3VyZSB0ZXh0IG5vZGUgaXMgbG9ja2VkXG4gICAgbm9kZS5sb2NrZWQgPSB0cnVlO1xuXG4gICAgLy8gTG9hZCBmb250XG4gICAgY29uc3QgZm9udE5hbWUgPVxuICAgICAgbm9kZS5mb250TmFtZSAhPT0gZmlnbWEubWl4ZWQgPyBub2RlLmZvbnROYW1lLmZhbWlseSA6IFwiUm9ib3RvXCI7XG4gICAgY29uc3QgZm9udFN0eWxlID1cbiAgICAgIG5vZGUuZm9udE5hbWUgIT09IGZpZ21hLm1peGVkID8gbm9kZS5mb250TmFtZS5zdHlsZSA6IFwiUmVndWxhclwiO1xuICAgIGZpZ21hXG4gICAgICAubG9hZEZvbnRBc3luYyh7IGZhbWlseTogZm9udE5hbWUsIHN0eWxlOiBmb250U3R5bGUgfSlcbiAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgLy8gU2V0IHRleHQgbm9kZSBjb250ZW50XG4gICAgICAgIG5vZGUuY2hhcmFjdGVycyA9IHByb3BzW25hbWVdIHx8IFwiXCI7XG4gICAgICB9KVxuICAgICAgLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIkZhaWxlZCB0byBsb2FkIGZvbnRcIiwgZXJyKTtcbiAgICAgIH0pO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRSb290RnJhbWVzKCk6IElGcmFtZURhdGEge1xuICBjb25zdCB7IGN1cnJlbnRQYWdlIH0gPSBmaWdtYTtcblxuICBsZXQgc2VsZWN0ZWRGcmFtZXMgPSBjdXJyZW50UGFnZS5zZWxlY3Rpb24uZmlsdGVyKFxuICAgIChub2RlKSA9PiBub2RlLnR5cGUgPT09IFwiRlJBTUVcIlxuICApIGFzIEZyYW1lTm9kZVtdO1xuXG4gIGlmIChzZWxlY3RlZEZyYW1lcy5sZW5ndGggPT09IDApIHtcbiAgICBzZWxlY3RlZEZyYW1lcyA9IGN1cnJlbnRQYWdlLmNoaWxkcmVuLmZpbHRlcihcbiAgICAgIChub2RlKSA9PiBub2RlLnR5cGUgPT09IFwiRlJBTUVcIlxuICAgICkgYXMgRnJhbWVOb2RlW107XG4gIH1cblxuICBjb25zdCBmcmFtZXNEYXRhID0gc2VsZWN0ZWRGcmFtZXMubWFwKChmcmFtZSkgPT4ge1xuICAgIGNvbnN0IHsgbmFtZSwgd2lkdGgsIGhlaWdodCwgaWQgfSA9IGZyYW1lO1xuICAgIGNvbnN0IHRleHROb2RlcyA9IGdldFRleHROb2Rlc0Zyb21GcmFtZShmcmFtZSk7XG5cbiAgICBjb25zdCBmaXhlZFBvc2l0aW9uTm9kZXMgPSBmcmFtZS5jaGlsZHJlblxuICAgICAgLnNsaWNlKGZyYW1lLmNoaWxkcmVuLmxlbmd0aCAtIGZyYW1lLm51bWJlck9mRml4ZWRDaGlsZHJlbilcbiAgICAgIC5tYXAoKG5vZGUpID0+IG5vZGUuaWQpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWUsXG4gICAgICB3aWR0aCxcbiAgICAgIGhlaWdodCxcbiAgICAgIGlkLFxuICAgICAgdGV4dE5vZGVzLFxuICAgICAgZml4ZWRQb3NpdGlvbk5vZGVzLFxuICAgIH07XG4gIH0pO1xuXG4gIHJldHVybiB7XG4gICAgZnJhbWVzOiBmcmFtZXNEYXRhLFxuICAgIGhlYWRsaW5lOiBnZXROb2RlVGV4dChjdXJyZW50UGFnZSwgSEVBRExJTkVfTk9ERV9OQU1FUy5IRUFETElORSksXG4gICAgc3ViaGVhZDogZ2V0Tm9kZVRleHQoY3VycmVudFBhZ2UsIEhFQURMSU5FX05PREVfTkFNRVMuSEVBRExJTkUpLFxuICAgIHNvdXJjZTogZ2V0Tm9kZVRleHQoY3VycmVudFBhZ2UsIEhFQURMSU5FX05PREVfTkFNRVMuSEVBRExJTkUpLFxuICB9O1xufVxuIiwgImltcG9ydCB7IE1TR19FVkVOVFMgfSBmcm9tIFwiLi9jb25zdGFudHNcIjtcbmltcG9ydCB7IHBvc3RNYW4gfSBmcm9tIFwiLi91dGlscy9tZXNzYWdlc1wiO1xuaW1wb3J0IHsgZ2V0Um9vdEZyYW1lcywgcmVuZGVyRnJhbWVzLCBzZXRIZWFkbGluZXNBbmRTb3VyY2UgfSBmcm9tIFwiLi9oZWxwZXJzXCI7XG5cbi8vIFJlZ2lzdGVyIG1lc3NlbmdlciBldmVudCBmdW5jdGlvbnNcbnBvc3RNYW4ucmVnaXN0ZXJXb3JrZXIoTVNHX0VWRU5UUy5HRVRfUk9PVF9GUkFNRVMsIGdldFJvb3RGcmFtZXMpO1xucG9zdE1hbi5yZWdpc3RlcldvcmtlcihNU0dfRVZFTlRTLlJFTkRFUiwgcmVuZGVyRnJhbWVzKTtcbnBvc3RNYW4ucmVnaXN0ZXJXb3JrZXIoTVNHX0VWRU5UUy5VUERBVEVfSEVBRExJTkVTLCBzZXRIZWFkbGluZXNBbmRTb3VyY2UpO1xuXG4vLyBSZW5kZXIgdGhlIERPTVxuZmlnbWEuc2hvd1VJKF9faHRtbF9fKTtcblxuLy8gUmVzaXplIFVJIHRvIG1heCB2aWV3cG9ydCBkaW1lbnNpb25zXG5jb25zdCB7IHdpZHRoLCBoZWlnaHQgfSA9IGZpZ21hLnZpZXdwb3J0LmJvdW5kcztcbmNvbnN0IHsgem9vbSB9ID0gZmlnbWEudmlld3BvcnQ7XG5jb25zdCBpbml0aWFsV2luZG93V2lkdGggPSBNYXRoLnJvdW5kKHdpZHRoICogem9vbSk7XG5jb25zdCBpbml0aWFsV2luZG93SGVpZ2h0ID0gTWF0aC5yb3VuZChoZWlnaHQgKiB6b29tKTtcbmZpZ21hLnVpLnJlc2l6ZShpbml0aWFsV2luZG93V2lkdGgsIGluaXRpYWxXaW5kb3dIZWlnaHQpO1xuIl0sCiAgIm1hcHBpbmdzIjogIjs7OztBQUFPLE1BQUs7QUFBTCxZQUFLO0FBQ1Y7QUFDQTtBQUNBO0FBQUEsS0FIVTtBQU1MLE1BQUs7QUFBTCxZQUFLO0FBQ1Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUFBLEtBUlU7QUFXTCxNQUFLO0FBQUwsWUFBSztBQUNWO0FBQ0E7QUFBQSxLQUZVO0FDc0JMLE1BQUs7QUFBTCxZQUFLO0FBQ1YsdUNBQVc7QUFDWCxzQ0FBVTtBQUNWLHFDQUFTO0FBQUEsS0FIQzs7O0FDdkNaO0FBQUEsSUFtQkUsWUFBWTtBQUZKLHFCQUFVO0FBY1YscUJBQVUsT0FBTztBQS9CM0I7QUFnQ0ksY0FBTSxVQUFVLEtBQUssaUJBQWlCLFFBQVEscUNBQU8sU0FBUCxtQkFBYTtBQUMzRCxjQUFNLENBQUUsTUFBTSxVQUFVLE1BQU0sS0FBSyxXQUFXLE9B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
