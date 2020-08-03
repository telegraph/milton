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
  function calculateLetterSpacing(fontFamily, letterSpacing) {
    const {unit: letterUnit, value: letterVal} = letterSpacing;
    let letterSpaceValue = "0";
    console.log(letterUnit, letterSpacing, fontFamily);
    switch (letterUnit) {
      case "PIXELS":
        if (fontFamily === "Telesans Text") {
          letterSpaceValue = `${letterVal - 0.33}px`;
        } else if (fontFamily === "Telesans Agate") {
          letterSpaceValue = `${letterVal - 0.19}px`;
        } else {
          letterSpaceValue = `${letterVal}px`;
        }
        break;
      case "PERCENT":
        letterSpaceValue = `${letterVal / 100}em`;
        if (fontFamily === "Telesans Text") {
          letterSpaceValue = `${letterVal / 100 - 0.022}em`;
        } else if (fontFamily === "Telesans Agate") {
          letterSpaceValue = `${letterVal / 100 - 0.015}em`;
        } else {
          letterSpaceValue = `${letterVal / 100}em`;
        }
        break;
      default:
        if (fontFamily === "Telesans Text") {
          letterSpaceValue = "-0.37px";
        } else if (fontFamily === "Telesans Agate") {
          letterSpaceValue = "-0.19px";
        } else {
          letterSpaceValue = `0`;
        }
        break;
    }
    return letterSpaceValue;
  }
  function getTextNodes(frame) {
    const textNodes = frame.findAll(({type}) => type === "TEXT");
    const {absoluteTransform} = frame;
    const rootX = absoluteTransform[0][2];
    const rootY = absoluteTransform[1][2];
    return textNodes.map((node) => {
      const {
        absoluteTransform: absoluteTransform2,
        width: width2,
        height: height2,
        fontSize: fontSizeData,
        fontName,
        fills,
        characters,
        lineHeight,
        letterSpacing,
        textAlignHorizontal,
        textAlignVertical
      } = node;
      const textX = absoluteTransform2[0][2];
      const textY = absoluteTransform2[1][2];
      const x = textX - rootX;
      const y = textY - rootY;
      let colour = {r: 0, g: 0, b: 0, a: 1};
      function getTextRangeValues(textNode) {
        const {characters: characters2} = node;
        console.log(JSON.stringify(characters2));
        console.log(characters2.length);
        const letterSpacing2 = [];
        let startRange = 0;
        let props = {start: 0, end: 0, value: 0};
        for (let i = 1; i < characters2.length; i++) {
          const sizeValue = textNode.getRangeLetterSpacing(startRange, i);
          if (i === characters2.length - 1) {
            props.end = characters2.length;
            letterSpacing2.push(__assign({}, props));
            break;
          }
          if (sizeValue === figma.mixed) {
            props.end = i - 1;
            letterSpacing2.push(__assign({}, props));
            startRange = i;
          } else {
            props = {
              start: startRange,
              end: i,
              value: sizeValue
            };
          }
        }
        console.log("letter spacing", letterSpacing2);
        const lineHeights = [];
        startRange = 0;
        props = {start: 0, end: 0, value: 16};
        for (let i = 1; i < characters2.length; i++) {
          const sizeValue = textNode.getRangeLineHeight(startRange, i);
          if (i === characters2.length - 1) {
            props.end = characters2.length;
            lineHeights.push(__assign({}, props));
            break;
          }
          if (sizeValue === figma.mixed) {
            props.end = i - 1;
            lineHeights.push(__assign({}, props));
            startRange = i;
          } else {
            let value = void 0;
            if (sizeValue.unit !== "AUTO") {
              value = sizeValue.unit === "PIXELS" ? `${sizeValue.value}px` : `${sizeValue.value / 100}rem`;
            }
            props = {start: startRange, end: i, value};
          }
        }
        console.log(lineHeights);
        const fontSizes = [];
        startRange = 0;
        props = {start: 0, end: 0, value: 16};
        for (let i = 1; i < characters2.length; i++) {
          const sizeValue = textNode.getRangeFontSize(startRange, i);
          if (i === characters2.length - 1) {
            props.end = characters2.length;
            fontSizes.push(__assign({}, props));
            break;
          }
          if (sizeValue === figma.mixed) {
            props.end = i - 1;
            fontSizes.push(__assign({}, props));
            startRange = i;
          } else {
            props = {start: startRange, end: i, value: sizeValue};
          }
        }
        console.log(fontSizes);
        const paints = [];
        startRange = 0;
        props = {start: 0, end: 0, value: 16};
        for (let i = 1; i < characters2.length; i++) {
          const paintValue = textNode.getRangeFills(startRange, i);
          if (i === characters2.length - 1) {
            props.end = characters2.length;
            paints.push(__assign({}, props));
            break;
          }
          if (paintValue === figma.mixed) {
            props.end = i - 1;
            paints.push(__assign({}, props));
            startRange = i;
          } else {
            let colour2 = {r: 0, g: 0, b: 0};
            if (paintValue[0].type === "SOLID") {
              colour2 = __assign({}, paintValue[0].color);
            }
            props = {
              start: startRange,
              end: i - 1,
              value: colour2
            };
          }
        }
        console.log(paints);
        const fonts = [];
        startRange = 0;
        props = {start: 0, end: 0, value: 16};
        for (let i = 1; i < characters2.length; i++) {
          const fontValue = textNode.getRangeFontName(startRange, i);
          if (i === characters2.length - 1) {
            props.end = characters2.length;
            fonts.push(__assign({}, props));
            console.log("ENDING FONTS", i, props);
            break;
          }
          if (fontValue === figma.mixed) {
            props.end = i - 1;
            fonts.push(__assign({}, props));
            startRange = i;
          } else {
            props = {start: startRange, end: i, value: fontValue};
          }
        }
        console.log(fonts);
        const ends = [
          ...fonts.map((f) => f.end),
          ...paints.map((f) => f.end),
          ...fontSizes.map((f) => f.end),
          ...letterSpacing2.map((f) => f.end),
          ...lineHeights.map((f) => f.end)
        ].sort((a, b) => a > b ? 1 : -1).filter((n, i, self2) => self2.indexOf(n) === i);
        console.log("ends", ends);
        const styles2 = [];
        let startIndex = 0;
        for (let end of ends) {
          if (startIndex === end) {
            end++;
          }
          console.log(`Start: ${startIndex}, End: ${end}, chars: ${JSON.stringify(characters2.substring(startIndex, end))}`);
          const colour2 = paints.find((f) => startIndex + 1 >= f.start && end <= f.end);
          const font = fonts.find((f) => startIndex + 1 >= f.start && end <= f.end);
          const fontSize = fontSizes.find((f) => startIndex + 1 >= f.start && end <= f.end);
          const letterSpace = letterSpacing2.find((f) => startIndex + 1 >= f.start && end <= f.end);
          const lineHeight2 = lineHeights.find((f) => startIndex + 1 >= f.start && end <= f.end);
          if (!fontSize) {
            console.log("Missing font size", startIndex, end, JSON.stringify(characters2.substring(startIndex, end)));
          }
          if (!font) {
            console.log("missing font", startIndex, end, font, JSON.stringify(characters2.substring(startIndex, end)));
          }
          const style = {
            start: startIndex,
            end,
            chars: characters2.substring(startIndex, end),
            font: font.value,
            colour: colour2.value,
            size: fontSize == null ? void 0 : fontSize.value,
            letterSpace: calculateLetterSpacing(font.value.family, letterSpace == null ? void 0 : letterSpace.value),
            lineHeight: lineHeight2 == null ? void 0 : lineHeight2.value
          };
          styles2.push(style);
          startIndex = end;
        }
        return styles2;
      }
      const styles = getTextRangeValues(node);
      console.log(styles);
      const fontFamily = fontName !== figma.mixed ? fontName.family : "Arial";
      const fontStyle = fontName !== figma.mixed ? fontName.style : "Regular";
      return {
        x,
        y,
        width: width2,
        height: height2,
        fontSize: 12,
        fontFamily,
        fontStyle,
        colour: {r: 0, g: 0, b: 0},
        characters,
        lineHeight: "AUTO",
        letterSpacing: "auto",
        textAlignHorizontal,
        textAlignVertical,
        styles
      };
    });
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
      const textNodes = getTextNodes(frame);
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL2NvbnN0YW50cy50cyIsICJzcmMvdXRpbHMvbWVzc2FnZXMudHMiLCAic3JjL2hlbHBlcnMvZmlnbWFUZXh0LnRzIiwgInNyYy9oZWxwZXJzLnRzIiwgInNyYy9pbmRleC50c3giXSwKICAic291cmNlc0NvbnRlbnQiOiBbImV4cG9ydCBlbnVtIFNUQUdFUyB7XG4gIENIT09TRV9GUkFNRVMsXG4gIFJFU1BPTlNJVkVfUFJFVklFVyxcbiAgU0FWRV9PVVRQVVQsXG59XG5cbmV4cG9ydCBlbnVtIE1TR19FVkVOVFMge1xuICBGT1VORF9GUkFNRVMsXG4gIE5PX0ZSQU1FUyxcbiAgUkVOREVSLFxuICBDTE9TRSxcbiAgRVJST1IsXG4gIFVQREFURV9IRUFETElORVMsXG4gIENPTVBSRVNTX0lNQUdFLFxuICBHRVRfUk9PVF9GUkFNRVMsXG59XG5cbmV4cG9ydCBlbnVtIE9VVFBVVF9GT1JNQVRTIHtcbiAgSU5MSU5FLFxuICBJRlJBTUUsXG59XG5cbmV4cG9ydCBjb25zdCBVSV9URVhUID0ge1xuICBFUlJPUl9VTkVYUEVDVEVEOiBcIlVuZXhwZWN0ZWQgZXJyb3JcIixcbiAgRVJST1JfTUlTU0lOR19GUkFNRVM6IFwiTm8gZnJhbWVzIGZvdW5kLiBQbGVhc2UgYWRkIHNvbWUgZnJhbWVzIHRvIHRoZSBwYWdlLlwiLFxuICBXQVJOX05PX1RBUkdFVFM6IFwiU3RhbmRhcmQgZnJhbWVzIG5vdCBmb3VuZC4gUGxlYXNlIHNlbGVjdCB0YXJnZXQgZnJhbWVzLlwiLFxuICBXQVJOX1RPT19NQU5ZX1RBUkdFVFM6IFwiUGxlYXNlIHNlbGVjdCB0aHJlZSB0YXJnZXQgZnJhbWVzXCIsXG4gIElORk9fUFJFVklFVzogXCJQcmV2aWV3IGVhY2ggZnJhbWUgb3V0cHV0XCIsXG4gIFRJVExFX0NIT09TRV9GUkFNRTogXCJDaG9vc2Ugd2hpY2ggZnJhbWVzIHRvIGV4cG9ydFwiLFxuICBUSVRMRV9QUkVWSUVXOiBcIlByZXZpZXdcIixcbiAgVElUTEVfUkVTUE9OU0lWRV9QUkVWSUVXOiBcIlJlc3BvbnNpdmUgcHJldmlld1wiLFxuICBUSUxFX09VVFBVVDogXCJFeHBvcnRcIixcbiAgQlVUVE9OX05FWFQ6IFwiTmV4dFwiLFxuICBCVVRUT05fRE9XTkxPQUQ6IFwiRG93bmxvYWRcIixcbiAgQlVUVE9OX1BSRVZJT1VTOiBcIkJhY2tcIixcbn07XG5cbmV4cG9ydCBjb25zdCBGUkFNRV9XQVJOSU5HX1NJWkUgPSAzMDA7XG5cbmV4cG9ydCBlbnVtIEhFQURMSU5FX05PREVfTkFNRVMge1xuICBIRUFETElORSA9IFwiaGVhZGxpbmVcIixcbiAgU1VCSEVBRCA9IFwic3ViaGVhZFwiLFxuICBTT1VSQ0UgPSBcInNvdXJjZVwiLFxufVxuIiwgImltcG9ydCB7IE1TR19FVkVOVFMgfSBmcm9tIFwiLi4vY29uc3RhbnRzXCI7XG5cbmludGVyZmFjZSBJUG9zdG1hbk1lc3NhZ2Uge1xuICBuYW1lOiBzdHJpbmc7XG4gIHVpZDogc3RyaW5nO1xuICB3b3JrbG9hZDogTVNHX0VWRU5UUztcbiAgZGF0YTogYW55O1xuICByZXR1cm5pbmc/OiBib29sZWFuO1xuICBlcnI/OiBzdHJpbmc7XG59XG5cbmNsYXNzIFBvc3RtYW4ge1xuICBwcml2YXRlIG5hbWU6IHN0cmluZztcbiAgcHJpdmF0ZSBpbkZpZ21hU2FuZGJveDogYm9vbGVhbjtcbiAgcHJpdmF0ZSBjYWxsYmFja1N0b3JlOiB7IFtpZDogc3RyaW5nXTogRnVuY3Rpb24gfTtcbiAgcHJpdmF0ZSB3b3JrZXJzOiB7IFtpZDogc3RyaW5nXTogRnVuY3Rpb24gfTtcblxuICBwcml2YXRlIFRJTUVPVVQgPSAzMDAwMDtcblxuICBjb25zdHJ1Y3Rvcihwcm9wcz86IHsgbWVzc2FnZU5hbWU/OiBzdHJpbmc7IHNjb3BlOiBudWxsIH0pIHtcbiAgICB0aGlzLm5hbWUgPSBwcm9wcz8ubWVzc2FnZU5hbWUgfHwgXCJQT1NUTUFOXCI7XG4gICAgdGhpcy5pbkZpZ21hU2FuZGJveCA9IHR5cGVvZiBmaWdtYSA9PT0gXCJvYmplY3RcIjtcbiAgICB0aGlzLmNhbGxiYWNrU3RvcmUgPSB7fTtcbiAgICB0aGlzLndvcmtlcnMgPSB7fTtcblxuICAgIC8vIEFkZCBtZXNzYWdlIGV2ZW50IGxpc3RlbmVyXG4gICAgdGhpcy5pbkZpZ21hU2FuZGJveFxuICAgICAgPyBmaWdtYS51aS5vbihcIm1lc3NhZ2VcIiwgdGhpcy5yZWNlaXZlKVxuICAgICAgOiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgdGhpcy5yZWNlaXZlKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVjZWl2ZSA9IGFzeW5jIChldmVudDogTWVzc2FnZUV2ZW50PElQb3N0bWFuTWVzc2FnZT4pID0+IHtcbiAgICBjb25zdCBtc2dCb2R5ID0gdGhpcy5pbkZpZ21hU2FuZGJveCA/IGV2ZW50IDogZXZlbnQ/LmRhdGE/LnBsdWdpbk1lc3NhZ2U7XG4gICAgY29uc3QgeyBkYXRhLCB3b3JrbG9hZCwgbmFtZSwgdWlkLCByZXR1cm5pbmcsIGVyciB9ID0gbXNnQm9keSB8fCB7fTtcblxuICAgIHRyeSB7XG4gICAgICAvLyBEbyBub3RoaW5nIGlkIHBvc3QgbWVzc2FnZSBpc24ndCBmb3IgdXNcbiAgICAgIGlmICh0aGlzLm5hbWUgIT09IG5hbWUpIHJldHVybjtcblxuICAgICAgaWYgKHJldHVybmluZyAmJiAhdGhpcy5jYWxsYmFja1N0b3JlW3VpZF0pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIGNhbGxiYWNrOiAke3VpZH1gKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFyZXR1cm5pbmcgJiYgIXRoaXMud29ya2Vyc1t3b3JrbG9hZF0pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyB3b3JrbG9hZCByZWdpc3RlcmVkOiAke3dvcmtsb2FkfWApO1xuICAgICAgfVxuXG4gICAgICBpZiAocmV0dXJuaW5nKSB7XG4gICAgICAgIHRoaXMuY2FsbGJhY2tTdG9yZVt1aWRdKGRhdGEsIGVycik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCB3b3JrbG9hZFJlc3VsdCA9IGF3YWl0IHRoaXMud29ya2Vyc1t3b3JrbG9hZF0oZGF0YSk7XG4gICAgICAgIHRoaXMucG9zdEJhY2soeyBkYXRhOiB3b3JrbG9hZFJlc3VsdCwgdWlkIH0pO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgdGhpcy5wb3N0QmFjayh7IHVpZCwgZXJyOiBcIlBvc3RtYW4gZmFpbGVkXCIgfSk7XG4gICAgICBjb25zb2xlLmVycm9yKFwiUG9zdG1hbiBmYWlsZWRcIiwgZXJyKTtcbiAgICB9XG4gIH07XG5cbiAgcHVibGljIHJlZ2lzdGVyV29ya2VyID0gKGV2ZW50VHlwZTogTVNHX0VWRU5UUywgZm46IEZ1bmN0aW9uKSA9PiB7XG4gICAgdGhpcy53b3JrZXJzW2V2ZW50VHlwZV0gPSBmbjtcbiAgfTtcblxuICBwcml2YXRlIHBvc3RCYWNrID0gKHByb3BzOiB7IHVpZDogc3RyaW5nOyBkYXRhPzogYW55OyBlcnI/OiBzdHJpbmcgfSkgPT5cbiAgICB0aGlzLnBvc3RNZXNzYWdlKHtcbiAgICAgIG5hbWU6IHRoaXMubmFtZSxcbiAgICAgIHVpZDogcHJvcHMudWlkLFxuICAgICAgZGF0YTogcHJvcHMuZGF0YSxcbiAgICAgIHJldHVybmluZzogdHJ1ZSxcbiAgICAgIGVycjogcHJvcHMuZXJyLFxuICAgIH0pO1xuXG4gIHByaXZhdGUgcG9zdE1lc3NhZ2UgPSAobWVzc2FnZUJvZHkpID0+XG4gICAgdGhpcy5pbkZpZ21hU2FuZGJveFxuICAgICAgPyBmaWdtYS51aS5wb3N0TWVzc2FnZShtZXNzYWdlQm9keSlcbiAgICAgIDogcGFyZW50LnBvc3RNZXNzYWdlKHsgcGx1Z2luTWVzc2FnZTogbWVzc2FnZUJvZHkgfSwgXCIqXCIpO1xuXG4gIHB1YmxpYyBzZW5kID0gKHByb3BzOiB7IHdvcmtsb2FkOiBNU0dfRVZFTlRTOyBkYXRhPzogYW55IH0pOiBQcm9taXNlPGFueT4gPT4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCB7IHdvcmtsb2FkLCBkYXRhIH0gPSBwcm9wcztcblxuICAgICAgY29uc3QgcmFuZG9tSWQgPSBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHIoNSk7XG5cbiAgICAgIHRoaXMucG9zdE1lc3NhZ2Uoe1xuICAgICAgICBuYW1lOiB0aGlzLm5hbWUsXG4gICAgICAgIHVpZDogcmFuZG9tSWQsXG4gICAgICAgIHdvcmtsb2FkLFxuICAgICAgICBkYXRhLFxuICAgICAgfSBhcyBJUG9zdG1hbk1lc3NhZ2UpO1xuXG4gICAgICB0aGlzLmNhbGxiYWNrU3RvcmVbcmFuZG9tSWRdID0gKHJlc3VsdDogYW55LCBlcnI/OiBzdHJpbmcpID0+IHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgc2V0VGltZW91dCgoKSA9PiByZWplY3QobmV3IEVycm9yKFwiVGltZWQgb3V0XCIpKSwgdGhpcy5USU1FT1VUKTtcbiAgICB9KTtcbiAgfTtcbn1cblxuZXhwb3J0IGNvbnN0IHBvc3RNYW4gPSBuZXcgUG9zdG1hbigpO1xuIiwgImltcG9ydCB7IHRleHREYXRhIH0gZnJvbSBcInR5cGVzXCI7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXROb2RlVGV4dChcbiAgcm9vdE5vZGU6IFBhZ2VOb2RlLFxuICBub2RlTmFtZTogc3RyaW5nXG4pOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICBjb25zdCBmb3VuZE5vZGUgPSByb290Tm9kZS5maW5kQ2hpbGQoKG5vZGUpID0+IG5vZGUubmFtZSA9PT0gbm9kZU5hbWUpO1xuICByZXR1cm4gZm91bmROb2RlICYmIGZvdW5kTm9kZS50eXBlID09PSBcIlRFWFRcIlxuICAgID8gZm91bmROb2RlLmNoYXJhY3RlcnNcbiAgICA6IHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gY2FsY3VsYXRlTGV0dGVyU3BhY2luZyhcbiAgZm9udEZhbWlseTogc3RyaW5nLFxuICBsZXR0ZXJTcGFjaW5nOiBMZXR0ZXJTcGFjaW5nXG4pIHtcbiAgY29uc3QgeyB1bml0OiBsZXR0ZXJVbml0LCB2YWx1ZTogbGV0dGVyVmFsIH0gPSBsZXR0ZXJTcGFjaW5nO1xuICBsZXQgbGV0dGVyU3BhY2VWYWx1ZSA9IFwiMFwiO1xuICBjb25zb2xlLmxvZyhsZXR0ZXJVbml0LCBsZXR0ZXJTcGFjaW5nLCBmb250RmFtaWx5KTtcbiAgc3dpdGNoIChsZXR0ZXJVbml0KSB7XG4gICAgY2FzZSBcIlBJWEVMU1wiOlxuICAgICAgLy8gVE9ETzogRklYIE1FXG4gICAgICBpZiAoZm9udEZhbWlseSA9PT0gXCJUZWxlc2FucyBUZXh0XCIpIHtcbiAgICAgICAgbGV0dGVyU3BhY2VWYWx1ZSA9IGAke2xldHRlclZhbCAtIDAuMzN9cHhgO1xuICAgICAgfSBlbHNlIGlmIChmb250RmFtaWx5ID09PSBcIlRlbGVzYW5zIEFnYXRlXCIpIHtcbiAgICAgICAgbGV0dGVyU3BhY2VWYWx1ZSA9IGAke2xldHRlclZhbCAtIDAuMTl9cHhgO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGV0dGVyU3BhY2VWYWx1ZSA9IGAke2xldHRlclZhbH1weGA7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlIFwiUEVSQ0VOVFwiOlxuICAgICAgbGV0dGVyU3BhY2VWYWx1ZSA9IGAke2xldHRlclZhbCAvIDEwMH1lbWA7XG5cbiAgICAgIGlmIChmb250RmFtaWx5ID09PSBcIlRlbGVzYW5zIFRleHRcIikge1xuICAgICAgICBsZXR0ZXJTcGFjZVZhbHVlID0gYCR7bGV0dGVyVmFsIC8gMTAwIC0gMC4wMjJ9ZW1gO1xuICAgICAgfSBlbHNlIGlmIChmb250RmFtaWx5ID09PSBcIlRlbGVzYW5zIEFnYXRlXCIpIHtcbiAgICAgICAgbGV0dGVyU3BhY2VWYWx1ZSA9IGAke2xldHRlclZhbCAvIDEwMCAtIDAuMDE1fWVtYDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxldHRlclNwYWNlVmFsdWUgPSBgJHtsZXR0ZXJWYWwgLyAxMDB9ZW1gO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIGlmIChmb250RmFtaWx5ID09PSBcIlRlbGVzYW5zIFRleHRcIikge1xuICAgICAgICBsZXR0ZXJTcGFjZVZhbHVlID0gXCItMC4zN3B4XCI7XG4gICAgICB9IGVsc2UgaWYgKGZvbnRGYW1pbHkgPT09IFwiVGVsZXNhbnMgQWdhdGVcIikge1xuICAgICAgICBsZXR0ZXJTcGFjZVZhbHVlID0gXCItMC4xOXB4XCI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsZXR0ZXJTcGFjZVZhbHVlID0gYDBgO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gIH1cblxuICByZXR1cm4gbGV0dGVyU3BhY2VWYWx1ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFRleHROb2RlcyhmcmFtZTogRnJhbWVOb2RlKTogdGV4dERhdGFbXSB7XG4gIGNvbnN0IHRleHROb2RlcyA9IGZyYW1lLmZpbmRBbGwoKHsgdHlwZSB9KSA9PiB0eXBlID09PSBcIlRFWFRcIikgYXMgVGV4dE5vZGVbXTtcbiAgY29uc3QgeyBhYnNvbHV0ZVRyYW5zZm9ybSB9ID0gZnJhbWU7XG4gIGNvbnN0IHJvb3RYID0gYWJzb2x1dGVUcmFuc2Zvcm1bMF1bMl07XG4gIGNvbnN0IHJvb3RZID0gYWJzb2x1dGVUcmFuc2Zvcm1bMV1bMl07XG5cbiAgcmV0dXJuIHRleHROb2Rlcy5tYXAoXG4gICAgKG5vZGUpOiB0ZXh0RGF0YSA9PiB7XG4gICAgICBjb25zdCB7XG4gICAgICAgIGFic29sdXRlVHJhbnNmb3JtLFxuICAgICAgICB3aWR0aCxcbiAgICAgICAgaGVpZ2h0LFxuICAgICAgICBmb250U2l6ZTogZm9udFNpemVEYXRhLFxuICAgICAgICBmb250TmFtZSxcbiAgICAgICAgZmlsbHMsXG4gICAgICAgIGNoYXJhY3RlcnMsXG4gICAgICAgIGxpbmVIZWlnaHQsXG4gICAgICAgIGxldHRlclNwYWNpbmcsXG4gICAgICAgIHRleHRBbGlnbkhvcml6b250YWwsXG4gICAgICAgIHRleHRBbGlnblZlcnRpY2FsLFxuICAgICAgfSA9IG5vZGU7XG5cbiAgICAgIC8vIE5PVEU6IEZpZ21hIG5vZGUgeCwgeSBhcmUgcmVsYXRpdmUgdG8gZmlyc3QgcGFyZW50LCB3ZSB3YW50IHRoZW1cbiAgICAgIC8vIHJlbGF0aXZlIHRvIHRoZSByb290IGZyYW1lXG4gICAgICBjb25zdCB0ZXh0WCA9IGFic29sdXRlVHJhbnNmb3JtWzBdWzJdO1xuICAgICAgY29uc3QgdGV4dFkgPSBhYnNvbHV0ZVRyYW5zZm9ybVsxXVsyXTtcbiAgICAgIGNvbnN0IHggPSB0ZXh0WCAtIHJvb3RYO1xuICAgICAgY29uc3QgeSA9IHRleHRZIC0gcm9vdFk7XG5cbiAgICAgIC8vIEV4dHJhY3QgYmFzaWMgZmlsbCBjb2xvdXJcbiAgICAgIGxldCBjb2xvdXIgPSB7IHI6IDAsIGc6IDAsIGI6IDAsIGE6IDEgfTtcblxuICAgICAgaW50ZXJmYWNlIElUZXh0UHJvcFJhbmdlIHtcbiAgICAgICAgc3RhcnQ6IG51bWJlcjtcbiAgICAgICAgZW5kOiBudW1iZXI7XG4gICAgICAgIHZhbHVlOiBudW1iZXI7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGdldFRleHRSYW5nZVZhbHVlcyh0ZXh0Tm9kZTogVGV4dE5vZGUpIHtcbiAgICAgICAgY29uc3QgeyBjaGFyYWN0ZXJzIH0gPSBub2RlO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGNoYXJhY3RlcnMpKTtcbiAgICAgICAgY29uc29sZS5sb2coY2hhcmFjdGVycy5sZW5ndGgpO1xuXG4gICAgICAgIC8vIExldHRlciBzcGFjaW5nXG4gICAgICAgIGNvbnN0IGxldHRlclNwYWNpbmc6IElUZXh0UHJvcFJhbmdlW10gPSBbXTtcbiAgICAgICAgbGV0IHN0YXJ0UmFuZ2UgPSAwO1xuICAgICAgICBsZXQgcHJvcHM6IElUZXh0UHJvcFJhbmdlID0geyBzdGFydDogMCwgZW5kOiAwLCB2YWx1ZTogMCB9O1xuXG4gICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgY2hhcmFjdGVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGNvbnN0IHNpemVWYWx1ZSA9IHRleHROb2RlLmdldFJhbmdlTGV0dGVyU3BhY2luZyhzdGFydFJhbmdlLCBpKTtcblxuICAgICAgICAgIGlmIChpID09PSBjaGFyYWN0ZXJzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgIHByb3BzLmVuZCA9IGNoYXJhY3RlcnMubGVuZ3RoO1xuICAgICAgICAgICAgbGV0dGVyU3BhY2luZy5wdXNoKHsgLi4ucHJvcHMgfSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoc2l6ZVZhbHVlID09PSBmaWdtYS5taXhlZCkge1xuICAgICAgICAgICAgcHJvcHMuZW5kID0gaSAtIDE7XG4gICAgICAgICAgICBsZXR0ZXJTcGFjaW5nLnB1c2goeyAuLi5wcm9wcyB9KTtcbiAgICAgICAgICAgIHN0YXJ0UmFuZ2UgPSBpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwcm9wcyA9IHtcbiAgICAgICAgICAgICAgc3RhcnQ6IHN0YXJ0UmFuZ2UsXG4gICAgICAgICAgICAgIGVuZDogaSxcbiAgICAgICAgICAgICAgdmFsdWU6IHNpemVWYWx1ZSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJsZXR0ZXIgc3BhY2luZ1wiLCBsZXR0ZXJTcGFjaW5nKTtcblxuICAgICAgICAvLyBMaW5lIGhlaWdodHNcbiAgICAgICAgY29uc3QgbGluZUhlaWdodHMgPSBbXTtcbiAgICAgICAgc3RhcnRSYW5nZSA9IDA7XG4gICAgICAgIHByb3BzID0geyBzdGFydDogMCwgZW5kOiAwLCB2YWx1ZTogMTYgfTtcblxuICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8IGNoYXJhY3RlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBzaXplVmFsdWUgPSB0ZXh0Tm9kZS5nZXRSYW5nZUxpbmVIZWlnaHQoc3RhcnRSYW5nZSwgaSk7XG5cbiAgICAgICAgICBpZiAoaSA9PT0gY2hhcmFjdGVycy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICBwcm9wcy5lbmQgPSBjaGFyYWN0ZXJzLmxlbmd0aDtcbiAgICAgICAgICAgIGxpbmVIZWlnaHRzLnB1c2goeyAuLi5wcm9wcyB9KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChzaXplVmFsdWUgPT09IGZpZ21hLm1peGVkKSB7XG4gICAgICAgICAgICBwcm9wcy5lbmQgPSBpIC0gMTtcbiAgICAgICAgICAgIGxpbmVIZWlnaHRzLnB1c2goeyAuLi5wcm9wcyB9KTtcbiAgICAgICAgICAgIHN0YXJ0UmFuZ2UgPSBpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgdmFsdWUgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICBpZiAoc2l6ZVZhbHVlLnVuaXQgIT09IFwiQVVUT1wiKSB7XG4gICAgICAgICAgICAgIHZhbHVlID1cbiAgICAgICAgICAgICAgICBzaXplVmFsdWUudW5pdCA9PT0gXCJQSVhFTFNcIlxuICAgICAgICAgICAgICAgICAgPyBgJHtzaXplVmFsdWUudmFsdWV9cHhgXG4gICAgICAgICAgICAgICAgICA6IGAke3NpemVWYWx1ZS52YWx1ZSAvIDEwMH1yZW1gO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBwcm9wcyA9IHsgc3RhcnQ6IHN0YXJ0UmFuZ2UsIGVuZDogaSwgdmFsdWUgfTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjb25zb2xlLmxvZyhsaW5lSGVpZ2h0cyk7XG5cbiAgICAgICAgLy8gRm9udCBzaXplc1xuICAgICAgICBjb25zdCBmb250U2l6ZXM6IElUZXh0UHJvcFJhbmdlW10gPSBbXTtcbiAgICAgICAgc3RhcnRSYW5nZSA9IDA7XG4gICAgICAgIHByb3BzID0geyBzdGFydDogMCwgZW5kOiAwLCB2YWx1ZTogMTYgfTtcblxuICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8IGNoYXJhY3RlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBzaXplVmFsdWUgPSB0ZXh0Tm9kZS5nZXRSYW5nZUZvbnRTaXplKHN0YXJ0UmFuZ2UsIGkpO1xuXG4gICAgICAgICAgaWYgKGkgPT09IGNoYXJhY3RlcnMubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgcHJvcHMuZW5kID0gY2hhcmFjdGVycy5sZW5ndGg7XG4gICAgICAgICAgICBmb250U2l6ZXMucHVzaCh7IC4uLnByb3BzIH0pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHNpemVWYWx1ZSA9PT0gZmlnbWEubWl4ZWQpIHtcbiAgICAgICAgICAgIHByb3BzLmVuZCA9IGkgLSAxO1xuICAgICAgICAgICAgZm9udFNpemVzLnB1c2goeyAuLi5wcm9wcyB9KTtcbiAgICAgICAgICAgIHN0YXJ0UmFuZ2UgPSBpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwcm9wcyA9IHsgc3RhcnQ6IHN0YXJ0UmFuZ2UsIGVuZDogaSwgdmFsdWU6IHNpemVWYWx1ZSB9O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnNvbGUubG9nKGZvbnRTaXplcyk7XG5cbiAgICAgICAgY29uc3QgcGFpbnRzOiBhbnlbXSA9IFtdO1xuICAgICAgICBzdGFydFJhbmdlID0gMDtcbiAgICAgICAgcHJvcHMgPSB7IHN0YXJ0OiAwLCBlbmQ6IDAsIHZhbHVlOiAxNiB9O1xuXG4gICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgY2hhcmFjdGVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGNvbnN0IHBhaW50VmFsdWUgPSB0ZXh0Tm9kZS5nZXRSYW5nZUZpbGxzKHN0YXJ0UmFuZ2UsIGkpO1xuXG4gICAgICAgICAgaWYgKGkgPT09IGNoYXJhY3RlcnMubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgcHJvcHMuZW5kID0gY2hhcmFjdGVycy5sZW5ndGg7XG4gICAgICAgICAgICBwYWludHMucHVzaCh7IC4uLnByb3BzIH0pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHBhaW50VmFsdWUgPT09IGZpZ21hLm1peGVkKSB7XG4gICAgICAgICAgICBwcm9wcy5lbmQgPSBpIC0gMTtcbiAgICAgICAgICAgIHBhaW50cy5wdXNoKHsgLi4ucHJvcHMgfSk7XG4gICAgICAgICAgICBzdGFydFJhbmdlID0gaTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IGNvbG91ciA9IHsgcjogMCwgZzogMCwgYjogMCB9O1xuICAgICAgICAgICAgaWYgKHBhaW50VmFsdWVbMF0udHlwZSA9PT0gXCJTT0xJRFwiKSB7XG4gICAgICAgICAgICAgIGNvbG91ciA9IHsgLi4ucGFpbnRWYWx1ZVswXS5jb2xvciB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBwcm9wcyA9IHtcbiAgICAgICAgICAgICAgc3RhcnQ6IHN0YXJ0UmFuZ2UsXG4gICAgICAgICAgICAgIGVuZDogaSAtIDEsXG4gICAgICAgICAgICAgIHZhbHVlOiBjb2xvdXIsXG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnNvbGUubG9nKHBhaW50cyk7XG5cbiAgICAgICAgY29uc3QgZm9udHM6IGFueVtdID0gW107XG4gICAgICAgIHN0YXJ0UmFuZ2UgPSAwO1xuICAgICAgICBwcm9wcyA9IHsgc3RhcnQ6IDAsIGVuZDogMCwgdmFsdWU6IDE2IH07XG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCBjaGFyYWN0ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgZm9udFZhbHVlID0gdGV4dE5vZGUuZ2V0UmFuZ2VGb250TmFtZShzdGFydFJhbmdlLCBpKTtcblxuICAgICAgICAgIGlmIChpID09PSBjaGFyYWN0ZXJzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgIHByb3BzLmVuZCA9IGNoYXJhY3RlcnMubGVuZ3RoO1xuICAgICAgICAgICAgZm9udHMucHVzaCh7IC4uLnByb3BzIH0pO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJFTkRJTkcgRk9OVFNcIiwgaSwgcHJvcHMpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKGZvbnRWYWx1ZSA9PT0gZmlnbWEubWl4ZWQpIHtcbiAgICAgICAgICAgIHByb3BzLmVuZCA9IGkgLSAxO1xuICAgICAgICAgICAgZm9udHMucHVzaCh7IC4uLnByb3BzIH0pO1xuICAgICAgICAgICAgc3RhcnRSYW5nZSA9IGk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHByb3BzID0geyBzdGFydDogc3RhcnRSYW5nZSwgZW5kOiBpLCB2YWx1ZTogZm9udFZhbHVlIH07XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc29sZS5sb2coZm9udHMpO1xuXG4gICAgICAgIC8vIENvbGxlY3QgYWxsIGVuZCBpbmRleGVkLCBzb3J0IGFjY2VuZGluZyBhbmQgcmVtb3ZlIGR1cGxpY2F0ZXNcbiAgICAgICAgY29uc3QgZW5kcyA9IFtcbiAgICAgICAgICAuLi5mb250cy5tYXAoKGYpID0+IGYuZW5kKSxcbiAgICAgICAgICAuLi5wYWludHMubWFwKChmKSA9PiBmLmVuZCksXG4gICAgICAgICAgLi4uZm9udFNpemVzLm1hcCgoZikgPT4gZi5lbmQpLFxuICAgICAgICAgIC4uLmxldHRlclNwYWNpbmcubWFwKChmKSA9PiBmLmVuZCksXG4gICAgICAgICAgLi4ubGluZUhlaWdodHMubWFwKChmKSA9PiBmLmVuZCksXG4gICAgICAgIF1cbiAgICAgICAgICAuc29ydCgoYSwgYikgPT4gKGEgPiBiID8gMSA6IC0xKSlcbiAgICAgICAgICAuZmlsdGVyKChuLCBpLCBzZWxmKSA9PiBzZWxmLmluZGV4T2YobikgPT09IGkpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiZW5kc1wiLCBlbmRzKTtcbiAgICAgICAgY29uc3Qgc3R5bGVzID0gW107XG4gICAgICAgIGxldCBzdGFydEluZGV4ID0gMDtcbiAgICAgICAgZm9yIChsZXQgZW5kIG9mIGVuZHMpIHtcbiAgICAgICAgICBpZiAoc3RhcnRJbmRleCA9PT0gZW5kKSB7XG4gICAgICAgICAgICBlbmQrKztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgICAgIGBTdGFydDogJHtzdGFydEluZGV4fSwgRW5kOiAke2VuZH0sIGNoYXJzOiAke0pTT04uc3RyaW5naWZ5KFxuICAgICAgICAgICAgICBjaGFyYWN0ZXJzLnN1YnN0cmluZyhzdGFydEluZGV4LCBlbmQpXG4gICAgICAgICAgICApfWBcbiAgICAgICAgICApO1xuICAgICAgICAgIGNvbnN0IGNvbG91ciA9IHBhaW50cy5maW5kKFxuICAgICAgICAgICAgKGYpID0+IHN0YXJ0SW5kZXggKyAxID49IGYuc3RhcnQgJiYgZW5kIDw9IGYuZW5kXG4gICAgICAgICAgKTtcblxuICAgICAgICAgIGNvbnN0IGZvbnQgPSBmb250cy5maW5kKFxuICAgICAgICAgICAgKGYpID0+IHN0YXJ0SW5kZXggKyAxID49IGYuc3RhcnQgJiYgZW5kIDw9IGYuZW5kXG4gICAgICAgICAgKTtcblxuICAgICAgICAgIGNvbnN0IGZvbnRTaXplID0gZm9udFNpemVzLmZpbmQoXG4gICAgICAgICAgICAoZikgPT4gc3RhcnRJbmRleCArIDEgPj0gZi5zdGFydCAmJiBlbmQgPD0gZi5lbmRcbiAgICAgICAgICApO1xuXG4gICAgICAgICAgY29uc3QgbGV0dGVyU3BhY2UgPSBsZXR0ZXJTcGFjaW5nLmZpbmQoXG4gICAgICAgICAgICAoZikgPT4gc3RhcnRJbmRleCArIDEgPj0gZi5zdGFydCAmJiBlbmQgPD0gZi5lbmRcbiAgICAgICAgICApO1xuXG4gICAgICAgICAgY29uc3QgbGluZUhlaWdodCA9IGxpbmVIZWlnaHRzLmZpbmQoXG4gICAgICAgICAgICAoZikgPT4gc3RhcnRJbmRleCArIDEgPj0gZi5zdGFydCAmJiBlbmQgPD0gZi5lbmRcbiAgICAgICAgICApO1xuXG4gICAgICAgICAgaWYgKCFmb250U2l6ZSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICAgICAgIFwiTWlzc2luZyBmb250IHNpemVcIixcbiAgICAgICAgICAgICAgc3RhcnRJbmRleCxcbiAgICAgICAgICAgICAgZW5kLFxuICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeShjaGFyYWN0ZXJzLnN1YnN0cmluZyhzdGFydEluZGV4LCBlbmQpKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoIWZvbnQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAgICAgICBcIm1pc3NpbmcgZm9udFwiLFxuICAgICAgICAgICAgICBzdGFydEluZGV4LFxuICAgICAgICAgICAgICBlbmQsXG4gICAgICAgICAgICAgIGZvbnQsXG4gICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KGNoYXJhY3RlcnMuc3Vic3RyaW5nKHN0YXJ0SW5kZXgsIGVuZCkpXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGNvbnN0IHN0eWxlID0ge1xuICAgICAgICAgICAgc3RhcnQ6IHN0YXJ0SW5kZXgsXG4gICAgICAgICAgICBlbmQ6IGVuZCxcbiAgICAgICAgICAgIGNoYXJzOiBjaGFyYWN0ZXJzLnN1YnN0cmluZyhzdGFydEluZGV4LCBlbmQpLFxuICAgICAgICAgICAgZm9udDogZm9udC52YWx1ZSxcbiAgICAgICAgICAgIGNvbG91cjogY29sb3VyLnZhbHVlLFxuICAgICAgICAgICAgc2l6ZTogZm9udFNpemU/LnZhbHVlLFxuICAgICAgICAgICAgbGV0dGVyU3BhY2U6IGNhbGN1bGF0ZUxldHRlclNwYWNpbmcoXG4gICAgICAgICAgICAgIGZvbnQudmFsdWUuZmFtaWx5LFxuICAgICAgICAgICAgICBsZXR0ZXJTcGFjZT8udmFsdWVcbiAgICAgICAgICAgICksXG4gICAgICAgICAgICBsaW5lSGVpZ2h0OiBsaW5lSGVpZ2h0Py52YWx1ZSxcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgc3R5bGVzLnB1c2goc3R5bGUpO1xuICAgICAgICAgIHN0YXJ0SW5kZXggPSBlbmQ7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gc3R5bGVzO1xuICAgICAgfVxuXG4gICAgICAvLyBHZXQgZm9udCBzaXplcyByYW5nZXNcbiAgICAgIGNvbnN0IHN0eWxlcyA9IGdldFRleHRSYW5nZVZhbHVlcyhub2RlKTtcblxuICAgICAgY29uc29sZS5sb2coc3R5bGVzKTtcblxuICAgICAgLy8gRXh0cmFjdCBmb250IGluZm9cbiAgICAgIC8vIFRPRE86IENvbmZpcm0gZmFsbGJhY2sgZm9udHNcbiAgICAgIC8vIGNvbnN0IGZvbnRTaXplID0gZm9udFNpemVEYXRhICE9PSBmaWdtYS5taXhlZCA/IGZvbnRTaXplRGF0YSA6IDE2O1xuICAgICAgY29uc3QgZm9udEZhbWlseSA9IGZvbnROYW1lICE9PSBmaWdtYS5taXhlZCA/IGZvbnROYW1lLmZhbWlseSA6IFwiQXJpYWxcIjtcbiAgICAgIGNvbnN0IGZvbnRTdHlsZSA9IGZvbnROYW1lICE9PSBmaWdtYS5taXhlZCA/IGZvbnROYW1lLnN0eWxlIDogXCJSZWd1bGFyXCI7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHgsXG4gICAgICAgIHksXG4gICAgICAgIHdpZHRoLFxuICAgICAgICBoZWlnaHQsXG4gICAgICAgIGZvbnRTaXplOiAxMixcbiAgICAgICAgZm9udEZhbWlseSxcbiAgICAgICAgZm9udFN0eWxlLFxuICAgICAgICBjb2xvdXI6IHsgcjogMCwgZzogMCwgYjogMCB9LFxuICAgICAgICBjaGFyYWN0ZXJzLFxuICAgICAgICBsaW5lSGVpZ2h0OiBcIkFVVE9cIixcbiAgICAgICAgbGV0dGVyU3BhY2luZzogXCJhdXRvXCIsXG4gICAgICAgIHRleHRBbGlnbkhvcml6b250YWwsXG4gICAgICAgIHRleHRBbGlnblZlcnRpY2FsLFxuICAgICAgICBzdHlsZXMsXG4gICAgICB9O1xuICAgIH1cbiAgKTtcbn1cbiIsICJpbXBvcnQgeyBzZXRIZWFkbGluZXNBbmRTb3VyY2VQcm9wcywgSUZyYW1lRGF0YSB9IGZyb20gXCJ0eXBlc1wiO1xuaW1wb3J0IHsgZ2V0Tm9kZVRleHQsIGdldFRleHROb2RlcyB9IGZyb20gXCJoZWxwZXJzL2ZpZ21hVGV4dFwiO1xuaW1wb3J0IHsgSEVBRExJTkVfTk9ERV9OQU1FUywgTVNHX0VWRU5UUyB9IGZyb20gXCIuL2NvbnN0YW50c1wiO1xuaW1wb3J0IHsgcG9zdE1hbiB9IGZyb20gXCJ1dGlscy9tZXNzYWdlc1wiO1xuaW1wb3J0IHsgcmVzaXplQW5kT3B0aW1pc2VJbWFnZSB9IGZyb20gXCIuL2hlbHBlcnMvaW1hZ2VIZWxwZXJcIjtcblxuLyoqXG4gKiBDb21wcmVzcyBpbWFnZSB1c2luZyBicm93c2VyJ3MgbmF0aXZlIGltYWdlIGRlY29kaW5nIHN1cHBvcnRcbiAqIEBjb250ZXh0IEJyb3dzZXIgKFVJKVxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcHJlc3NJbWFnZShwcm9wczoge1xuICBpbWdEYXRhOiBVaW50OEFycmF5O1xuICBub2RlRGltZW5zaW9uczogeyB3aWR0aDogbnVtYmVyOyBoZWlnaHQ6IG51bWJlciB9W107XG59KTogUHJvbWlzZTxVaW50OEFycmF5PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgY29uc3QgaW1nID0gbmV3IEltYWdlKCk7XG4gICAgY29uc3QgeyBpbWdEYXRhLCBub2RlRGltZW5zaW9ucyB9ID0gcHJvcHM7XG5cbiAgICBpbWcuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRcIiwgKCkgPT4ge1xuICAgICAgcmVzaXplQW5kT3B0aW1pc2VJbWFnZSh7XG4gICAgICAgIGltZyxcbiAgICAgICAgaW1nRGF0YSxcbiAgICAgICAgbm9kZURpbWVuc2lvbnMsXG4gICAgICAgIHJlc29sdmUsXG4gICAgICAgIHJlamVjdCxcbiAgICAgIH0pLmNhdGNoKChlcnIpID0+IHJlamVjdChlcnIpKTtcbiAgICB9KTtcblxuICAgIGltZy5hZGRFdmVudExpc3RlbmVyKFwiZXJyb3JcIiwgKGVycikgPT4ge1xuICAgICAgY29uc29sZS5lcnJvcihcIkVycm9yIGxvYWRpbmcgY29tcHJlc3NlZCBpbWFnZVwiKTtcbiAgICAgIHJlamVjdChlcnIpO1xuICAgIH0pO1xuXG4gICAgY29uc3QgYmxvYiA9IG5ldyBCbG9iKFtpbWdEYXRhXSwgeyB0eXBlOiBcImltYWdlL3BuZ1wiIH0pO1xuICAgIGNvbnN0IGltZ1VybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG4gICAgaW1nLnNyYyA9IGltZ1VybDtcbiAgfSk7XG59XG5cbi8qKlxuICogVGVzdCBpZiBGaWdtYSBub2RlIHN1cHBvcnRzIGZpbGwgcHJvcGVydHkgdHlwZVxuICovXG5mdW5jdGlvbiBzdXBwb3J0c0ZpbGxzKFxuICBub2RlOiBTY2VuZU5vZGVcbik6IG5vZGUgaXMgRXhjbHVkZTxTY2VuZU5vZGUsIFNsaWNlTm9kZSB8IEdyb3VwTm9kZT4ge1xuICByZXR1cm4gbm9kZS50eXBlICE9PSBcIlNMSUNFXCIgJiYgbm9kZS50eXBlICE9PSBcIkdST1VQXCI7XG59XG5cbi8qKlxuICogUmVuZGVyIGFsbCBzcGVjaWZpZWQgZnJhbWVzIG91dCBhcyBTVkcgZWxlbWVudC5cbiAqIEltYWdlcyBhcmUgb3B0aW1pc2VkIGZvciBzaXplIGFuZCBpbWFnZSB0eXBlIGNvbXByZXNzaW9uIHZpYSB0aGUgZnJvbnRlbmQgVUlcbiAqXG4gKiBAY29udGV4dCBmaWdtYVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVuZGVyRnJhbWVzKGZyYW1lSWRzOiBzdHJpbmdbXSk6IFByb21pc2U8VWludDhBcnJheT4ge1xuICBjb25zdCBvdXRwdXROb2RlID0gZmlnbWEuY3JlYXRlRnJhbWUoKTtcbiAgb3V0cHV0Tm9kZS5uYW1lID0gXCJvdXRwdXRcIjtcblxuICB0cnkge1xuICAgIC8vIENsb25lIGVhY2ggc2VsZWN0ZWQgZnJhbWUgYWRkaW5nIHRoZW0gdG8gdGhlIHRlbXBvcmFyeSBjb250YWluZXIgZnJhbWVcbiAgICBjb25zdCBmcmFtZXMgPSBmaWdtYS5jdXJyZW50UGFnZS5jaGlsZHJlbi5maWx0ZXIoKHsgaWQgfSkgPT5cbiAgICAgIGZyYW1lSWRzLmluY2x1ZGVzKGlkKVxuICAgICk7XG5cbiAgICAvLyBDYWxjdWxhdGUgdGhlIG1heCBkaW1lbnNpb25zIGZvciBvdXRwdXQgY29udGFpbmVyIGZyYW1lXG4gICAgY29uc3QgbWF4V2lkdGggPSBNYXRoLm1heCguLi5mcmFtZXMubWFwKChmKSA9PiBmLndpZHRoKSk7XG4gICAgY29uc3QgbWF4SGVpZ2h0ID0gTWF0aC5tYXgoLi4uZnJhbWVzLm1hcCgoZikgPT4gZi5oZWlnaHQpKTtcbiAgICBvdXRwdXROb2RlLnJlc2l6ZVdpdGhvdXRDb25zdHJhaW50cyhtYXhXaWR0aCwgbWF4SGVpZ2h0KTtcblxuICAgIGZvciAoY29uc3QgZnJhbWUgb2YgZnJhbWVzKSB7XG4gICAgICBjb25zdCBjbG9uZSA9IGZyYW1lPy5jbG9uZSgpIGFzIEZyYW1lTm9kZTtcblxuICAgICAgLy8gRmluZCBhbmQgcmVtb3ZlIGFsbCB0ZXh0IG5vZGVzXG4gICAgICBjbG9uZS5maW5kQWxsKChuKSA9PiBuLnR5cGUgPT09IFwiVEVYVFwiKS5mb3JFYWNoKChuKSA9PiBuLnJlbW92ZSgpKTtcblxuICAgICAgLy8gQXBwZW5kIGNsb25lZCBmcmFtZSB0byB0ZW1wIG91dHB1dCBmcmFtZSBhbmQgcG9zaXRpb24gaW4gdG9wIGxlZnRcbiAgICAgIG91dHB1dE5vZGUuYXBwZW5kQ2hpbGQoY2xvbmUpO1xuICAgICAgY2xvbmUueCA9IDA7XG4gICAgICBjbG9uZS55ID0gMDtcblxuICAgICAgLy8gU3RvcmUgdGhlIGZyYW1lIElEIGFzIG5vZGUgbmFtZSAoZXhwb3J0ZWQgaW4gU1ZHIHByb3BzKVxuICAgICAgY2xvbmUubmFtZSA9IGZyYW1lLmlkO1xuICAgIH1cblxuICAgIC8vIEZpbmQgYWxsIG5vZGVzIHdpdGggaW1hZ2UgZmlsbHNcbiAgICBjb25zdCBub2Rlc1dpdGhJbWFnZXMgPSBvdXRwdXROb2RlLmZpbmRBbGwoXG4gICAgICAobm9kZSkgPT5cbiAgICAgICAgc3VwcG9ydHNGaWxscyhub2RlKSAmJlxuICAgICAgICBub2RlLmZpbGxzICE9PSBmaWdtYS5taXhlZCAmJlxuICAgICAgICBub2RlLmZpbGxzLnNvbWUoKGZpbGwpID0+IGZpbGwudHlwZSA9PT0gXCJJTUFHRVwiKVxuICAgICk7XG5cbiAgICAvLyBBIHNpbmdsZSBpbWFnZSBjYW4gYmUgdXNlZCBtdWx0aXBsZSB0aW1lcyBvbiBkaWZmZXJlbnQgbm9kZXMgaW4gZGlmZmVyZW50XG4gICAgLy8gZnJhbWVzLiBUbyBlbnN1cmUgaW1hZ2VzIGFyZSBvbmx5IG9wdGltaXNlZCBvbmNlIGEgY2FjaGUgaXMgY3JlYXRlZFxuICAgIC8vIG9mIHVuaXF1ZSBpbWFnZXMgYW5kIHVzZWQgdG8gcmVwbGFjZSBvcmlnaW5hbCBhZnRlciB0aGUgYXN5bmMgcHJvY2Vzc2luZ1xuICAgIC8vIGlzIGNvbXBsZXRlZC5cbiAgICBjb25zdCBpbWFnZUNhY2hlOiB7XG4gICAgICBbaWQ6IHN0cmluZ106IHsgd2lkdGg6IG51bWJlcjsgaGVpZ2h0OiBudW1iZXI7IGlkOiBzdHJpbmcgfVtdO1xuICAgIH0gPSB7fTtcblxuICAgIGZvciAoY29uc3Qgbm9kZSBvZiBub2Rlc1dpdGhJbWFnZXMpIHtcbiAgICAgIGlmIChzdXBwb3J0c0ZpbGxzKG5vZGUpICYmIG5vZGUuZmlsbHMgIT09IGZpZ21hLm1peGVkKSB7XG4gICAgICAgIC8vIFRoZSBmcm9udGVuZCBVSSB3aGljaCBoYW5kbGVzIHRoZSBpbWFnZSBvcHRpbWlzYXRpb24gbmVlZHMgdG8ga25vd1xuICAgICAgICAvLyB0aGUgc2l6ZXMgb2YgZWFjaCBub2RlIHRoYXQgdXNlcyB0aGUgaW1hZ2UuIFRoZSBkaW1lbnNpb25zIGFyZSBzdG9yZWRcbiAgICAgICAgLy8gd2l0aCB0aGUgaW1hZ2UgaGFzaCBJRCBpbiB0aGUgY2FjaGUgZm9yIGxhdGVyIHVzZS5cbiAgICAgICAgY29uc3QgZGltZW5zaW9ucyA9IHtcbiAgICAgICAgICB3aWR0aDogbm9kZS53aWR0aCxcbiAgICAgICAgICBoZWlnaHQ6IG5vZGUuaGVpZ2h0LFxuICAgICAgICAgIGlkOiBub2RlLmlkLFxuICAgICAgICB9O1xuICAgICAgICBjb25zdCBpbWdQYWludCA9IFsuLi5ub2RlLmZpbGxzXS5maW5kKChwKSA9PiBwLnR5cGUgPT09IFwiSU1BR0VcIik7XG5cbiAgICAgICAgaWYgKGltZ1BhaW50Py50eXBlID09PSBcIklNQUdFXCIgJiYgaW1nUGFpbnQuaW1hZ2VIYXNoKSB7XG4gICAgICAgICAgLy8gQWRkIHRoZSBpbWFnZSBkaW1lbnNpb25zIHRvIHRoZSBjYWNoZSwgb3IgdXBkYXRlIGFuZCBleGlzdGluZyBjYWNoZVxuICAgICAgICAgIC8vIGl0ZW0gd2l0aCBhbm90aGVyIG5vZGVzIGRpbWVuc2lvbnNcbiAgICAgICAgICBpZiAoaW1hZ2VDYWNoZVtpbWdQYWludC5pbWFnZUhhc2hdKSB7XG4gICAgICAgICAgICBpbWFnZUNhY2hlW2ltZ1BhaW50LmltYWdlSGFzaF0ucHVzaChkaW1lbnNpb25zKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaW1hZ2VDYWNoZVtpbWdQYWludC5pbWFnZUhhc2hdID0gW2RpbWVuc2lvbnNdO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFNlbmQgZWFjaCBpbWFnZSBmcm9tIHRoZSBpbWFnZUNhY2hlIHRvIHRoZSBmcm9udGVuZCBmb3Igb3B0aW1pc2F0aW9uLlxuICAgIC8vIFRoZSBvcGVyYXRpb24gaXMgYXN5bmMgYW5kIGNhbiB0YWtlIHNvbWUgdGltZSBpZiB0aGUgaW1hZ2VzIGFyZSBsYXJnZS5cbiAgICBmb3IgKGNvbnN0IGltYWdlSGFzaCBpbiBpbWFnZUNhY2hlKSB7XG4gICAgICBjb25zdCBieXRlcyA9IGF3YWl0IGZpZ21hLmdldEltYWdlQnlIYXNoKGltYWdlSGFzaCkuZ2V0Qnl0ZXNBc3luYygpO1xuICAgICAgY29uc3QgY29tcHJlc3NlZEltYWdlOiBVaW50OEFycmF5ID0gYXdhaXQgcG9zdE1hbi5zZW5kKHtcbiAgICAgICAgd29ya2xvYWQ6IE1TR19FVkVOVFMuQ09NUFJFU1NfSU1BR0UsXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICBpbWdEYXRhOiBieXRlcyxcbiAgICAgICAgICBub2RlRGltZW5zaW9uczogaW1hZ2VDYWNoZVtpbWFnZUhhc2hdLFxuICAgICAgICB9LFxuICAgICAgfSk7XG5cbiAgICAgIC8vIFN0b3JlIHRoZSBuZXcgaW1hZ2UgaW4gZmlnbWEgYW5kIGdldCB0aGUgbmV3IGltYWdlIGhhc2hcbiAgICAgIGNvbnN0IG5ld0ltYWdlSGFzaCA9IGZpZ21hLmNyZWF0ZUltYWdlKGNvbXByZXNzZWRJbWFnZSkuaGFzaDtcblxuICAgICAgLy8gVXBkYXRlIG5vZGVzIHdpdGggbmV3IGltYWdlIHBhaW50IGZpbGxcbiAgICAgIG5vZGVzV2l0aEltYWdlcy5mb3JFYWNoKChub2RlKSA9PiB7XG4gICAgICAgIGlmIChzdXBwb3J0c0ZpbGxzKG5vZGUpICYmIG5vZGUuZmlsbHMgIT09IGZpZ21hLm1peGVkKSB7XG4gICAgICAgICAgY29uc3QgaW1nUGFpbnQgPSBbLi4ubm9kZS5maWxsc10uZmluZChcbiAgICAgICAgICAgIChwKSA9PiBwLnR5cGUgPT09IFwiSU1BR0VcIiAmJiBwLmltYWdlSGFzaCA9PT0gaW1hZ2VIYXNoXG4gICAgICAgICAgKTtcblxuICAgICAgICAgIGlmIChpbWdQYWludCkge1xuICAgICAgICAgICAgY29uc3QgbmV3UGFpbnQgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGltZ1BhaW50KSk7XG4gICAgICAgICAgICBuZXdQYWludC5pbWFnZUhhc2ggPSBuZXdJbWFnZUhhc2g7XG4gICAgICAgICAgICBub2RlLmZpbGxzID0gW25ld1BhaW50XTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEhBQ0shIEZpZ21hIHRha2VzIHNvbWUgdGltZSB0byB1cGRhdGUgdGhlIGltYWdlIGZpbGxzLiBXYWl0aW5nIHNvbWVcbiAgICAvLyBhbW91bnQgaXMgcmVxdWlyZWQgb3RoZXJ3aXNlIHRoZSBpbWFnZXMgYXBwZWFyIGJsYW5rLlxuICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDMwMCkpO1xuXG4gICAgLy8gUmVuZGVyIG91dHB1dCBjb250YWluZXIgZnJhbWVzIHRvIFNWRyBtYXJrLXVwIChpbiBhIHVpbnQ4IGJ5dGUgYXJyYXkpXG4gICAgY29uc3Qgc3ZnID0gYXdhaXQgb3V0cHV0Tm9kZS5leHBvcnRBc3luYyh7XG4gICAgICBmb3JtYXQ6IFwiU1ZHXCIsXG4gICAgICBzdmdTaW1wbGlmeVN0cm9rZTogdHJ1ZSxcbiAgICAgIHN2Z091dGxpbmVUZXh0OiBmYWxzZSxcbiAgICAgIHN2Z0lkQXR0cmlidXRlOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHN2ZztcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGVycik7XG4gIH0gZmluYWxseSB7XG4gICAgLy8gUmVtb3ZlIHRoZSBvdXRwdXQgZnJhbWUgd2hhdGV2ZXIgaGFwcGVuc1xuICAgIG91dHB1dE5vZGUucmVtb3ZlKCk7XG4gIH1cbn1cblxuLyoqXG4gKiBDcmVhdGUsIHVwZGF0ZSBvciBkZWxldGUgaGVhZGxpbmUgdGV4dCBpbiBmaWdtYSBkb2N1bWVudCBmcm9tIHBsdWdpbiBVSVxuICpcbiAqIEBjb250ZXh0IGZpZ21hXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXRIZWFkbGluZXNBbmRTb3VyY2UocHJvcHM6IHNldEhlYWRsaW5lc0FuZFNvdXJjZVByb3BzKTogdm9pZCB7XG4gIGNvbnN0IHBhZ2VOb2RlID0gZmlnbWEuY3VycmVudFBhZ2U7XG4gIGNvbnN0IGZyYW1lcyA9IHBhZ2VOb2RlLmZpbmRDaGlsZHJlbigobm9kZSkgPT4gbm9kZS50eXBlID09PSBcIkZSQU1FXCIpO1xuICBjb25zdCBtb3N0TGVmdFBvcyA9IE1hdGgubWluKC4uLmZyYW1lcy5tYXAoKG5vZGUpID0+IG5vZGUueCkpO1xuICBjb25zdCBtb3N0VG9wUG9zID0gTWF0aC5taW4oLi4uZnJhbWVzLm1hcCgobm9kZSkgPT4gbm9kZS55KSk7XG5cbiAgLy8gTG9vcCB0aHJvdWdoIGVhY2ggaGVhZGxpbmUgbm9kZSBuYW1lc1xuICBmb3IgKGNvbnN0IG5hbWUgb2YgT2JqZWN0LnZhbHVlcyhIRUFETElORV9OT0RFX05BTUVTKSkge1xuICAgIGxldCBub2RlID1cbiAgICAgIChwYWdlTm9kZS5maW5kQ2hpbGQoXG4gICAgICAgIChub2RlKSA9PiBub2RlLm5hbWUgPT09IG5hbWUgJiYgbm9kZS50eXBlID09PSBcIlRFWFRcIlxuICAgICAgKSBhcyBUZXh0Tm9kZSkgfHwgbnVsbDtcbiAgICBjb25zdCB0ZXh0Q29udGVudCA9IHByb3BzW25hbWVdO1xuXG4gICAgLy8gUmVtb3ZlIG5vZGUgaWYgdGhlcmUncyBubyB0ZXh0IGNvbnRlbnRcbiAgICBpZiAobm9kZSAmJiAhdGV4dENvbnRlbnQpIHtcbiAgICAgIG5vZGUucmVtb3ZlKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gRG8gbm90aGluZyBpcyB0aGVyZSdzIG5vIHRleHQgY29udGVudFxuICAgIGlmICghdGV4dENvbnRlbnQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgbm9kZSBpZiBpdCBkb2Vzbid0IGFscmVhZHkgZXhpc3RcbiAgICBpZiAoIW5vZGUpIHtcbiAgICAgIG5vZGUgPSBmaWdtYS5jcmVhdGVUZXh0KCk7XG4gICAgICBub2RlLm5hbWUgPSBuYW1lO1xuXG4gICAgICAvLyBQb3NpdGlvbiBuZXcgdGV4dCBub2RlIHRvcC1sZWZ0IG9mIHRoZSBmaXJzdCBmcmFtZSBpbiB0aGUgcGFnZVxuICAgICAgbGV0IHkgPSBtb3N0VG9wUG9zIC0gNjA7XG4gICAgICBpZiAobmFtZSA9PT0gSEVBRExJTkVfTk9ERV9OQU1FUy5IRUFETElORSkge1xuICAgICAgICB5IC09IDYwO1xuICAgICAgfSBlbHNlIGlmIChuYW1lID09PSBIRUFETElORV9OT0RFX05BTUVTLlNVQkhFQUQpIHtcbiAgICAgICAgeSAtPSAzMDtcbiAgICAgIH1cblxuICAgICAgbm9kZS5yZWxhdGl2ZVRyYW5zZm9ybSA9IFtcbiAgICAgICAgWzEsIDAsIG1vc3RMZWZ0UG9zXSxcbiAgICAgICAgWzAsIDEsIHldLFxuICAgICAgXTtcbiAgICB9XG5cbiAgICAvLyBFbnN1cmUgdGV4dCBub2RlIGlzIGxvY2tlZFxuICAgIG5vZGUubG9ja2VkID0gdHJ1ZTtcblxuICAgIC8vIExvYWQgZm9udFxuICAgIGNvbnN0IGZvbnROYW1lID1cbiAgICAgIG5vZGUuZm9udE5hbWUgIT09IGZpZ21hLm1peGVkID8gbm9kZS5mb250TmFtZS5mYW1pbHkgOiBcIlJvYm90b1wiO1xuICAgIGNvbnN0IGZvbnRTdHlsZSA9XG4gICAgICBub2RlLmZvbnROYW1lICE9PSBmaWdtYS5taXhlZCA/IG5vZGUuZm9udE5hbWUuc3R5bGUgOiBcIlJlZ3VsYXJcIjtcbiAgICBmaWdtYVxuICAgICAgLmxvYWRGb250QXN5bmMoeyBmYW1pbHk6IGZvbnROYW1lLCBzdHlsZTogZm9udFN0eWxlIH0pXG4gICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgIC8vIFNldCB0ZXh0IG5vZGUgY29udGVudFxuICAgICAgICBub2RlLmNoYXJhY3RlcnMgPSBwcm9wc1tuYW1lXSB8fCBcIlwiO1xuICAgICAgfSlcbiAgICAgIC5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgdG8gbG9hZCBmb250XCIsIGVycik7XG4gICAgICB9KTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Um9vdEZyYW1lcygpOiBJRnJhbWVEYXRhIHtcbiAgY29uc3QgeyBjdXJyZW50UGFnZSB9ID0gZmlnbWE7XG4gIGNvbnN0IHJvb3RGcmFtZXMgPSBjdXJyZW50UGFnZS5jaGlsZHJlbi5maWx0ZXIoXG4gICAgKG5vZGUpID0+IG5vZGUudHlwZSA9PT0gXCJGUkFNRVwiXG4gICkgYXMgRnJhbWVOb2RlW107XG5cbiAgY29uc3QgZnJhbWVzRGF0YSA9IHJvb3RGcmFtZXMubWFwKChmcmFtZSkgPT4ge1xuICAgIGNvbnN0IHsgbmFtZSwgd2lkdGgsIGhlaWdodCwgaWQgfSA9IGZyYW1lO1xuICAgIGNvbnN0IHRleHROb2RlcyA9IGdldFRleHROb2RlcyhmcmFtZSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgbmFtZSxcbiAgICAgIHdpZHRoLFxuICAgICAgaGVpZ2h0LFxuICAgICAgaWQsXG4gICAgICB0ZXh0Tm9kZXMsXG4gICAgfTtcbiAgfSk7XG5cbiAgcmV0dXJuIHtcbiAgICBmcmFtZXM6IGZyYW1lc0RhdGEsXG4gICAgaGVhZGxpbmU6IGdldE5vZGVUZXh0KGN1cnJlbnRQYWdlLCBIRUFETElORV9OT0RFX05BTUVTLkhFQURMSU5FKSxcbiAgICBzdWJoZWFkOiBnZXROb2RlVGV4dChjdXJyZW50UGFnZSwgSEVBRExJTkVfTk9ERV9OQU1FUy5IRUFETElORSksXG4gICAgc291cmNlOiBnZXROb2RlVGV4dChjdXJyZW50UGFnZSwgSEVBRExJTkVfTk9ERV9OQU1FUy5IRUFETElORSksXG4gIH07XG59XG4iLCAiaW1wb3J0IHsgTVNHX0VWRU5UUyB9IGZyb20gXCIuL2NvbnN0YW50c1wiO1xuaW1wb3J0IHsgcG9zdE1hbiB9IGZyb20gXCIuL3V0aWxzL21lc3NhZ2VzXCI7XG5pbXBvcnQgeyBnZXRSb290RnJhbWVzLCByZW5kZXJGcmFtZXMsIHNldEhlYWRsaW5lc0FuZFNvdXJjZSB9IGZyb20gXCIuL2hlbHBlcnNcIjtcblxuLy8gUmVnaXN0ZXIgbWVzc2VuZ2VyIGV2ZW50IGZ1bmN0aW9uc1xucG9zdE1hbi5yZWdpc3RlcldvcmtlcihNU0dfRVZFTlRTLkdFVF9ST09UX0ZSQU1FUywgZ2V0Um9vdEZyYW1lcyk7XG5wb3N0TWFuLnJlZ2lzdGVyV29ya2VyKE1TR19FVkVOVFMuUkVOREVSLCByZW5kZXJGcmFtZXMpO1xucG9zdE1hbi5yZWdpc3RlcldvcmtlcihNU0dfRVZFTlRTLlVQREFURV9IRUFETElORVMsIHNldEhlYWRsaW5lc0FuZFNvdXJjZSk7XG5cbi8vIFJlbmRlciB0aGUgRE9NXG5maWdtYS5zaG93VUkoX19odG1sX18pO1xuXG4vLyBSZXNpemUgVUkgdG8gbWF4IHZpZXdwb3J0IGRpbWVuc2lvbnNcbmNvbnN0IHsgd2lkdGgsIGhlaWdodCB9ID0gZmlnbWEudmlld3BvcnQuYm91bmRzO1xuY29uc3QgeyB6b29tIH0gPSBmaWdtYS52aWV3cG9ydDtcbmNvbnN0IGluaXRpYWxXaW5kb3dXaWR0aCA9IE1hdGgucm91bmQod2lkdGggKiB6b29tKTtcbmNvbnN0IGluaXRpYWxXaW5kb3dIZWlnaHQgPSBNYXRoLnJvdW5kKGhlaWdodCAqIHpvb20pO1xuZmlnbWEudWkucmVzaXplKGluaXRpYWxXaW5kb3dXaWR0aCwgaW5pdGlhbFdpbmRvd0hlaWdodCk7XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7O0FBQU8sTUFBSztBQUFMLFlBQUs7QUFDVjtBQUNBO0FBQ0E7QUFBQSxLQUhVO0FBTUwsTUFBSztBQUFMLFlBQUs7QUFDVjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQUEsS0FSVTtBQVdMLE1BQUs7QUFBTCxZQUFLO0FBQ1Y7QUFDQTtBQUFBLEtBRlU7QUFzQkwsTUFBSztBQUFMLFlBQUs7QUFDVix1Q0FBVztB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
