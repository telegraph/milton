import { h, Component } from "preact";
import { MSG_EVENTS, STAGES, UI_TEXT, INITIAL_UI_SIZE } from "../constants";
import { Header } from "./Header";
import { ResponsiveView } from "./ResponsiveView";
import { FrameSelection } from "./FrameSelection";
import { Preview } from "./Preview";
import { Save } from "./Save";
import { decodeSvgToString } from "../utils/svg";
import { compressImage } from "../utils/compressImage";
import { sendMessage } from "../utils/messages";
import type {
  AppState,
  MsgFramesType,
  FrameCollection,
  MsgCompressImageType,
  MsgRenderType,
  MsgEventType,
  HeadlinesInterface,
} from "types";

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
    // Listen for events from the backend
    window.addEventListener("message", (e) =>
      this.handleEvents(e.data.pluginMessage)
    );

    sendMessage(MSG_EVENTS.DOM_READY);
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
      frameData[id] = { ...frame, uid: `f2h-${rndId}`, svgOptimise: false };
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

  compressImage = async (msg: MsgCompressImageType) => {
    try {
      const { image, width, height, uid } = msg;
      const imgData = compressImage(image, width, height);
      sendMessage(MSG_EVENTS.COMPRESSED_IMAGE, { image: imgData, uid });
    } catch (err) {
      console.error(err);
      this.setState({ error: "Failed to compress image" });
    }
  };

  handleRenderMessage = (data: MsgRenderType) => {
    const { frameId, svg } = data;
    if (!frameId || !svg) {
      this.setState({ error: "Failed to render", loading: false });
      console.error("Post message: failed to render", data);
      return;
    }

    const { frames } = this.state;
    const svgStr = decodeSvgToString(svg);
    const cloneFrames = JSON.parse(JSON.stringify(frames)) as FrameCollection;
    cloneFrames[frameId].svg = svgStr;
    this.setState({ frames: cloneFrames, loading: false });
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

  // TODO: Merge goNext and goBack
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
    sendMessage(MSG_EVENTS.RENDER, { frameId });
  };

  toggleProp = (id: string, prop: "selected" | "responsive") => {
    const { frames } = this.state;
    const cloneFrames = JSON.parse(JSON.stringify(frames)) as FrameCollection;
    cloneFrames[id][prop] = !cloneFrames[id][prop];

    this.setState({ frames: cloneFrames });
  };

  toggleFrameSelect = (id: string) => this.toggleProp(id, "selected");

  toggleResonsive = (id: string) => this.toggleProp(id, "responsive");

  toggleAllProp = (propName: "selected" | "responsive") => {
    const { frames } = this.state;
    const shouldDeselectAll = Object.values(frames).some(
      (frame) => frame[propName]
    );

    const newFrames: FrameCollection = JSON.parse(JSON.stringify(frames));
    Object.values(newFrames).forEach(
      (frame) => (frame[propName] = !shouldDeselectAll)
    );

    this.setState({ frames: newFrames });
  };

  toggleSelectAll = () => this.toggleAllProp("selected");

  toggleResponsiveAll = () => this.toggleAllProp("responsive");

  handleFormUpdate = (props: HeadlinesInterface) => {
    this.setState({ ...props });
    sendMessage(MSG_EVENTS.UPDATE_HEADLINES, props);
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
            handleClick={this.toggleFrameSelect}
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
      <div class="f2h">
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
