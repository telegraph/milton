import { h, Component, render } from "preact";

import Compressor from "compressorjs";

import { MSG_EVENTS, STAGES, UI_TEXT, INITIAL_UI_SIZE } from "./constants";
import { Header } from "./components/Header";
import { FrameSelection } from "./components/FrameSelection";
import { Preview } from "./components/Preview";
import { Save } from "./components/Save";
import type { textData } from "./index";
import { ResponsiveView } from "./components/ResponsiveView";

// Import CSS files as plain text via esbuild loader option
// @ts-expect-error
import uiCss from "./ui.css";
// @ts-expect-error
import fontsCss from "./fonts.css";
// @ts-expect-error
import embedCss from "./embed.css";

function decodeSvgToString(svg: Uint8Array) {
  let svgStr = new TextDecoder("utf-8").decode(svg);
  // NOTE: Figma generates non-unique IDs for masks which can clash when
  // embedding multiple SVGSs. We do a string replace for unique IDs
  const regex = /id="(.+?)"/g;
  const ids: string[] = [];
  let matches;

  while ((matches = regex.exec(svgStr))) {
    const [, id] = matches;
    ids.push(id);
  }

  ids.forEach((id) => {
    const rnd = Math.random().toString(32).substr(2);
    const randomId = `${id}-${rnd}`;
    // Replace ID
    svgStr = svgStr.replace(`id="${id}"`, `id="${randomId}"`);
    // Replace anchor refs
    svgStr = svgStr.replace(`#${id}`, `#${randomId}`);
  });

  // Update HTTP links to HTTPS
  svgStr = svgStr.replace(/http:\/\//g, "https://");

  return svgStr;
}

export type FrameDataType = {
  name: string;
  width: number;
  height: number;
  id: string;
  uid: string;
  textNodes: textData[];
  responsive: boolean;
  selected: boolean;
  svg?: string;
};

type MsgEventType =
  | MsgFramesType
  | MsgRenderType
  | MsgNoFramesType
  | MsgErrorType
  | MsgCompressImageType;

export interface MsgFramesType {
  type: MSG_EVENTS.FOUND_FRAMES;
  frames: Omit<FrameDataType, "uid">[];
  windowWidth: number;
  windowHeight: number;
  headline: string | undefined;
  subhead: string | undefined;
  source: string | undefined;
}

export interface MsgRenderType {
  type: MSG_EVENTS.RENDER;
  svg: Uint8Array;
  frameId: string;
}

export interface MsgNoFramesType {
  type: MSG_EVENTS.NO_FRAMES;
}

export interface MsgErrorType {
  type: MSG_EVENTS.ERROR;
  errorText: string;
}

export interface MsgCompressImageType {
  type: MSG_EVENTS.COMPRESS_IMAGE;
  image: Uint8Array;
  width: number;
  height: number;
  quality: number;
  uid: string;
}

export interface MsgCompressedImageType {
  type: MSG_EVENTS.COMPRESSED_IMAGE;
  image: Uint8Array;
  uid: string;
}

export interface FrameCollection {
  [id: string]: FrameDataType;
}

export type AppState = {
  error: undefined | string;
  ready: boolean;
  frames: FrameCollection;
  stage: STAGES;
  previewIndex: number;
  isResizing: boolean;
  mouseStartX: number;
  mouseStartY: number;
  windowWidth: number;
  windowHeight: number;
  responsive: boolean;
  headline: string | undefined;
  subhead: string | undefined;
  source: string | undefined;
  loading: boolean;
};

export class App extends Component {
  state: AppState = {
    error: undefined,
    ready: false,
    frames: {},
    stage: STAGES.CHOOSE_FRAMES,
    previewIndex: 0,
    isResizing: false,
    mouseStartX: 0,
    mouseStartY: 0,
    windowWidth: INITIAL_UI_SIZE.width,
    windowHeight: INITIAL_UI_SIZE.height,
    responsive: true,
    headline: undefined,
    subhead: undefined,
    source: undefined,
    loading: false,
  };

  componentDidMount() {
    window.addEventListener("message", (e) =>
      this.handleEvents(e.data.pluginMessage)
    );

    // Send backend message that UI is ready
    parent.postMessage({ pluginMessage: { type: MSG_EVENTS.DOM_READY } }, "*");
  }

  updateInitialState = (data: MsgFramesType) => {
    let { frames, windowHeight, windowWidth, headline, subhead, source } = data;

    if (!Array.isArray(frames) || frames?.length < 1) {
      this.setState({ error: "No frames!" });
      console.error("Post error: no frames", data);
      return;
    }

    const frameData: FrameCollection = {};
    for (const frame of frames) {
      const { id } = frame;
      const rndId = Math.random().toString(32).substr(2);
      frameData[id] = { ...frame, uid: `f2h-${rndId}` };
    }

    this.setState({
      frames: frameData,
      ready: true,
      windowWidth,
      windowHeight,
      headline,
      subhead,
      source,
    });
  };

  compressImage = (msg: MsgCompressImageType) => {
    const { image, width, height, uid } = msg;

    // Create image from blob to access native image sizes the resize and
    // compress
    const blob = new Blob([image], { type: "image/png" });
    const imgUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.src = imgUrl;
    img.addEventListener("load", () => {
      let targetWidth = 0;
      let targetHeight = 0;

      // Don't scale image up if node is larger than image
      if (width > img.width || height > img.height) {
        targetWidth = img.width;
        targetHeight = img.height;
      } else {
        // Scale to largest dimension
        const aspectRatio = img.width / img.height;
        targetWidth = aspectRatio >= 1 ? height * aspectRatio : width;
        targetHeight = aspectRatio >= 1 ? height : width / aspectRatio;
      }

      new Compressor(blob, {
        width: targetWidth,
        height: targetHeight,
        quality: 0.7,
        convertSize: 100000,
        success: async (newImage) => {
          const buf = await newImage.arrayBuffer();
          const data = new Uint8Array(buf);
          parent.postMessage(
            {
              pluginMessage: {
                type: MSG_EVENTS.COMPRESSED_IMAGE,
                image: data,
                uid: uid,
              },
            },
            "*"
          );
        },
      });
    });

    img.addEventListener("error", (err) => {
      this.setState({ error: "Failed to compress image" });
      console.error(err);
    });
  };

  handleRenderMessage = (data: MsgRenderType) => {
    const { frameId, svg } = data;
    if (!frameId || !svg) {
      this.setState({ error: "Failed to render", loading: false });
      console.error("Post message: failed to render", data);
      return;
    }

    const targetFrame = this.state.frames[frameId];
    const svgStr = decodeSvgToString(svg);

    this.setState({
      frames: {
        ...this.state.frames,
        [frameId]: { ...targetFrame, svg: svgStr },
      },
      loading: false,
    });
  };

  handleEvents = (data: MsgEventType) => {
    console.log("UI post", data);
    switch (data.type) {
      case MSG_EVENTS.FOUND_FRAMES:
        this.updateInitialState(data);
        break;

      case MSG_EVENTS.NO_FRAMES:
        this.setState({ error: UI_TEXT.ERROR_MISSING_FRAMES });
        break;

      case MSG_EVENTS.ERROR:
        console.error("UI post message error", data);
        this.setState({
          error: `${UI_TEXT.ERROR_UNEXPECTED}: ${data.errorText}`,
        });
        break;

      case MSG_EVENTS.RENDER:
        this.handleRenderMessage(data);
        break;

      case MSG_EVENTS.COMPRESS_IMAGE:
        this.compressImage(data);
        break;

      default:
        this.setState({ error: "Unknown post message" });
        console.error("UI post message error", data);
        break;
    }
  };

  handleFrameSelectionChange = (id: string) => {
    const { frames } = this.state;
    const targetFrame = frames[id];

    this.setState({
      frames: {
        ...frames,
        [id]: {
          ...targetFrame,
          selected: !targetFrame.selected,
        },
      },
    });
  };

  goNext = () => {
    const { stage, previewIndex, frames } = this.state;
    const { length } = Object.values(frames).filter((f) => f.selected);

    if (length === 0) {
      return;
    }

    switch (stage) {
      case STAGES.CHOOSE_FRAMES:
        return this.setState({ stage: STAGES.PREVIEW_OUTPUT });

      case STAGES.PREVIEW_OUTPUT:
        const nextIndex = previewIndex + 1;
        if (length === nextIndex) {
          return this.setState({ stage: STAGES.RESPONSIVE_PREVIEW });
        } else {
          return this.setState({ previewIndex: nextIndex });
        }

      case STAGES.RESPONSIVE_PREVIEW:
        return this.setState({ stage: STAGES.SAVE_OUTPUT });

      case STAGES.SAVE_OUTPUT:
        return;
    }
  };

  goBack = () => {
    const { stage, previewIndex } = this.state;

    switch (stage) {
      case STAGES.CHOOSE_FRAMES:
        return;

      case STAGES.PREVIEW_OUTPUT:
        if (previewIndex === 0) {
          this.setState({ stage: STAGES.CHOOSE_FRAMES });
        } else {
          this.setState({ previewIndex: previewIndex - 1 });
        }
        return;

      case STAGES.RESPONSIVE_PREVIEW:
        return this.setState({ stage: STAGES.PREVIEW_OUTPUT });

      case STAGES.SAVE_OUTPUT:
        return this.setState({ stage: STAGES.RESPONSIVE_PREVIEW });
    }
  };

  getOutputRender = (frameId: String) => {
    this.setState({ loading: true });

    parent.postMessage(
      { pluginMessage: { type: MSG_EVENTS.RENDER, frameId } },
      "*"
    );
  };

  startResizing = (event: MouseEvent) => {
    const { isResizing } = this.state;

    if (!isResizing) {
      const { x, y } = event;
      this.setState({ isResizing: true, mouseStartX: x, mouseStartY: y });
      window.addEventListener("mousemove", this.handleResize);
    }
  };

  handleResize = (event: MouseEvent) => {
    const {
      isResizing,
      mouseStartX,
      mouseStartY,
      windowWidth,
      windowHeight,
    } = this.state;

    if (isResizing) {
      const { x, y } = event;
      const width = windowWidth + (x - mouseStartX);
      const height = windowHeight + (y - mouseStartY);

      parent.postMessage(
        {
          pluginMessage: { type: MSG_EVENTS.RESIZE, width, height },
        },
        "*"
      );

      // Post message to backend
    }
  };

  stopResizing = () => {
    const { isResizing } = this.state;

    if (!isResizing) {
      return;
    }

    console.log("stop resizing", isResizing);
    const { width, height } = document.body.getBoundingClientRect();

    this.setState({
      isResizing: false,
      windowWidth: width,
      windowHeight: height,
    });
    window.removeEventListener("mousemove", this.handleResize);
  };

  toggleResonsive = (id: string) => {
    const { frames } = this.state;
    const targetFrame = frames[id];

    this.setState({
      frames: {
        ...frames,
        [id]: {
          ...targetFrame,
          responsive: !targetFrame.responsive,
        },
      },
    });
  };

  toggleSelectAll = () => {
    const { frames } = this.state;
    const shouldDeselectAll = Object.values(frames).some(
      (frame) => frame.selected
    );

    const newFrames: FrameCollection = JSON.parse(JSON.stringify(frames));
    Object.values(newFrames).forEach(
      (frame) => (frame.selected = !shouldDeselectAll)
    );

    this.setState({ frames: newFrames });
  };

  toggleResponsiveAll = () => {
    const { frames } = this.state;
    const shouldDeselectAll = Object.values(frames).some(
      (frame) => frame.responsive
    );

    const newFrames: FrameCollection = JSON.parse(JSON.stringify(frames));
    Object.values(newFrames).forEach(
      (frame) => (frame.responsive = !shouldDeselectAll)
    );

    this.setState({ frames: newFrames });
  };

  handleFormUpdate = (
    headline: string | undefined,
    subhead: string | undefined,
    source: string | undefined
  ) => {
    this.setState(
      {
        headline,
        subhead,
        source,
      },
      () => {
        parent.postMessage(
          {
            pluginMessage: {
              type: MSG_EVENTS.UPDATE_HEADLINES,
              headline,
              subhead,
              source,
            },
          },
          "*"
        );
      }
    );
  };

  switchView = () => {
    const {
      frames,
      stage,
      previewIndex,
      windowHeight,
      windowWidth,
      headline,
      subhead,
      source,
      loading,
    } = this.state;

    const framesArr = Object.values(frames).sort((a, b) =>
      a.width <= b.width ? -1 : 1
    );
    let selectedFrames = framesArr.filter((frame) => frame.selected);

    // If previewing frame without a render then request if from the backends
    // TODO: Move out of render
    if (
      stage === STAGES.PREVIEW_OUTPUT &&
      !selectedFrames[previewIndex].svg &&
      loading === false
    ) {
      this.getOutputRender(selectedFrames[previewIndex].id);
    }

    switch (stage) {
      case STAGES.CHOOSE_FRAMES:
        return (
          <FrameSelection
            frames={framesArr}
            handleClick={this.handleFrameSelectionChange}
            toggleResonsive={this.toggleResonsive}
            toggleSelectAll={this.toggleSelectAll}
            toggleResponsiveAll={this.toggleResponsiveAll}
            headline={headline}
            subhead={subhead}
            source={source}
            handleFormUpdate={this.handleFormUpdate}
          />
        );

      case STAGES.PREVIEW_OUTPUT:
        const selectedFrame = selectedFrames[previewIndex];
        return (
          <Preview
            frame={selectedFrame}
            windowHeight={windowHeight}
            windowWidth={windowWidth}
          />
        );

      case STAGES.RESPONSIVE_PREVIEW:
        return (
          <ResponsiveView
            windowHeight={windowHeight}
            windowWidth={windowWidth}
            frames={selectedFrames}
            headline={headline}
            subhead={subhead}
            source={source}
          />
        );

      case STAGES.SAVE_OUTPUT:
        return (
          <Save
            frames={selectedFrames}
            headline={headline}
            subhead={subhead}
            source={source}
          />
        );

      default:
        return <div>Loading...</div>;
    }
  };

  render() {
    const { error, frames, stage, previewIndex, loading } = this.state;

    return (
      <div class="f2h" onMouseLeave={this.stopResizing}>
        <Header
          stage={stage}
          handleBackClick={this.goBack}
          handleNextClick={this.goNext}
          disableNext={loading || stage === STAGES.SAVE_OUTPUT}
          frame={Object.values(frames)[previewIndex]}
        />

        <div class="f2h__body">
          {error ? <div class="error">{error}</div> : this.switchView()}
        </div>
      </div>
    );
  }
}

function injectCss(css: string) {
  const styleEl = document.createElement("style");
  const styleText = document.createTextNode(css);
  styleEl.appendChild(styleText);
  document.head.appendChild(styleEl);
}

injectCss(uiCss);
injectCss(embedCss);
injectCss(fontsCss);

// Render app
render(<App />, document.body);
