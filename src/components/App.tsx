import { h, Component } from "preact";
import produce from "immer";
import { processSvg } from "../utils/processSvg";
import { renderInline } from "../outputRender";
import {
  MSG_EVENTS,
  STAGES,
  UI_TEXT,
  INITIAL_UI_SIZE,
  OUTPUT_FORMATS,
} from "../constants";
import { Header } from "./Header";
import { ResponsiveView } from "./ResponsiveView";
import { FrameSelection } from "./FrameSelection";
// import { Preview } from "./Preview";
import { Save } from "./Save";
import { decodeSvgToString } from "../utils/svg";
import { sendMessage } from "../utils/messages";
import {
  AppState,
  AppPropsInterface,
  MsgFramesType,
  FrameCollection,
  MsgCompressImageType,
  MsgRenderType,
  MsgEventType,
  HeadlinesInterface,
  UiPostMessageEvent,
} from "types";
import { crunchSvg } from "utils/crunchSvg";

export class App extends Component<AppPropsInterface, AppState> {
  readonly state: AppState = {
    error: undefined,
    ready: false,
    frames: {},
    stage: STAGES.CHOOSE_FRAMES,
    selectedFrames: [],
    responsive: true,
    headline: undefined,
    subhead: undefined,
    source: undefined,
  };

  componentDidMount(): void {
    // Listen for events from the backend
    window.addEventListener("message", (e: UiPostMessageEvent) =>
      this.handleEvents(e.data.pluginMessage)
    );

    sendMessage(MSG_EVENTS.DOM_READY);
  }

  updateInitialState = (data: MsgFramesType): void => {
    const { frames, headline, subhead, source } = data;

    if (!Array.isArray(frames) || frames?.length < 1) {
      this.setState({ error: "No frames!" });
      console.error("Post error: no frames", data);
      return;
    }

    const frameData: FrameCollection = {};
    for (const frame of frames) {
      const { id } = frame;
      const rndId = btoa(`${Math.random()}`).substr(6, 6);
      frameData[id] = { ...frame, uid: `f2h__${rndId}` };
    }

    const selectedFrames = frames.map((frame) => frame.id);

    this.setState({
      frames: frameData,
      ready: true,
      headline,
      subhead,
      source,
      selectedFrames,
    });
  };

  handleRenderMessage = (data: MsgRenderType): void => {
    const { svgData } = data;
    if (!svgData) {
      this.setState({ error: "Failed to render" });
      console.error("Post message: failed to render", data);
      return;
    }

    // processSvg(svg)
    //   .then(() => console.log("done"))
    //   .catch((err) => console.error(err));

    // const { frames } = this.state;

    // Revoke old URL blob if previously set
    const { selectedFrames, frames, headline, subhead, source } = this.state;

    let svgText = decodeSvgToString(svgData);

    // Replace figma IDs "00:00" with CSS valid IDs
    Object.values(frames)
      .filter((f) => selectedFrames.includes(f.id))
      .forEach((f) => {
        console.log(f.id);
        svgText = svgText.replace(
          `id="${f.id}"`,
          `id="${f.id}" class="${f.uid}" `
        );
      });

    const targetFrames = Object.values(frames).filter(({ id }) =>
      selectedFrames.includes(id)
    );

    const html = renderInline({
      frames: targetFrames,
      svgText: svgText,
      headline,
      subhead,
      source,
    });
    this.setState({ svgObjectUrl: html, stage: STAGES.RESPONSIVE_PREVIEW });
  };

  handleEvents = (data: MsgEventType): void => {
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

      default:
        this.setState({ error: "Unknown post message" });
        console.error("UI post message error", data);
        break;
    }
  };

  // TODO: Merge goNext and goBack
  goNext = (): void => {
    const { stage } = this.state;
    // const { length } = Object.values(frames).filter((f) => f.selected);

    // if (length === 0) {
    //   return;
    // }

    switch (stage) {
      case STAGES.CHOOSE_FRAMES:
        this.getOutputRender();
        console.log("in here");
        return;
      // return this.setState({ stage: STAGES.RESPONSIVE_PREVIEW });

      // case STAGES.PREVIEW_OUTPUT:
      //   if (length === nextIndex) {
      //     return this.setState({ stage: STAGES.RESPONSIVE_PREVIEW });
      //   } else {
      //     return this.setState({ previewIndex: nextIndex });
      //   }

      case STAGES.RESPONSIVE_PREVIEW:
        return this.setState({ stage: STAGES.SAVE_OUTPUT });

      case STAGES.SAVE_OUTPUT:
        return;
    }
  };

  goBack = (): void => {
    const { stage } = this.state;

    switch (stage) {
      case STAGES.CHOOSE_FRAMES:
        return;

      // case STAGES.PREVIEW_OUTPUT:
      //   if (previewIndex === 0) {
      //     this.setState({ stage: STAGES.CHOOSE_FRAMES });
      //   } else {
      //     this.setState({ previewIndex: previewIndex - 1 });
      //   }
      //   return;

      case STAGES.RESPONSIVE_PREVIEW:
        return this.setState({ stage: STAGES.CHOOSE_FRAMES });

      case STAGES.SAVE_OUTPUT:
        return this.setState({ stage: STAGES.RESPONSIVE_PREVIEW });
    }
  };

  getOutputRender = (): void => {
    const { selectedFrames } = this.state;

    sendMessage(MSG_EVENTS.RENDER, { ids: selectedFrames });
  };

  toggleProp = (
    id: string,
    prop: "selected" | "responsive" | "svgOptimised"
  ): void => {
    const { frames } = this.state;
    const cloneFrames = JSON.parse(JSON.stringify(frames)) as FrameCollection;
    cloneFrames[id][prop] = !cloneFrames[id][prop];

    this.setState({ frames: cloneFrames });
  };

  toggleFrameSelect = (id: string): void => this.toggleProp(id, "selected");

  toggleResonsive = (id: string): void => this.toggleProp(id, "responsive");

  toggleOptimised = (id: string): void => {
    const { frames } = this.state;
    const { svgCompressed, svg, svgOptimised } = frames[id];

    if (svg && !svgOptimised && !svgCompressed) {
      const el = document.createElement("div");
      el.innerHTML = svg;
      const svgEl = el.querySelector("svg");

      if (!svgEl) {
        console.error("Missing SVG in SVG string");
        return;
      }

      crunchSvg(svgEl);
      const cloneFrames = JSON.parse(JSON.stringify(frames)) as FrameCollection;
      cloneFrames[id].svgCompressed = svgEl.outerHTML;
      cloneFrames[id].svgOptimised = true;
      this.setState({ frames: cloneFrames });
    } else {
      this.toggleProp(id, "svgOptimised");
    }
  };

  toggleAllProp = (propName: "selected" | "responsive"): void => {
    const { frames } = this.state;
    const shouldDeselectAll = Object.values(frames).some(
      (frame) => frame[propName]
    );

    const draftState = produce(this.state, (draftState) => {
      Object.values(draftState.frames).forEach(
        (frame) => (frame[propName] = !shouldDeselectAll)
      );
    });

    this.setState(draftState);
  };

  toggleSelectAll = (): void => this.toggleAllProp("selected");

  // toggleResponsiveAll = (): void => this.toggleAllProp("responsive");

  handleFormUpdate = (props: HeadlinesInterface): void => {
    this.setState({ ...props });
    sendMessage(MSG_EVENTS.UPDATE_HEADLINES, props);
  };

  switchView = (): h.JSX.Element => {
    const {
      frames,
      selectedFrames,
      stage,
      headline,
      subhead,
      source,
      svgObjectUrl,
    } = this.state;

    // const framesArr = Object.values(frames).sort((a, b) =>
    //   a.width <= b.width ? -1 : 1
    // );
    // const selectedFrames = framesArr.filter((frame) => frame.selected);

    // // If previewing frame without a render then request if from the backends
    // // TODO: Move out of render
    // if (
    //   stage === STAGES.PREVIEW_OUTPUT &&
    //   !selectedFrames[previewIndex].svg &&
    //   loading === false
    // ) {
    //   this.getOutputRender(selectedFrames[previewIndex].id);
    // }

    switch (stage) {
      case STAGES.CHOOSE_FRAMES:
        return (
          <FrameSelection
            frames={frames}
            selectedFrames={selectedFrames}
            handleClick={this.toggleFrameSelect}
            toggleResonsive={this.toggleResonsive}
            toggleSelectAll={this.toggleSelectAll}
            // toggleResponsiveAll={this.toggleResponsiveAll}
            headline={headline}
            subhead={subhead}
            source={source}
            handleFormUpdate={this.handleFormUpdate}
          />
        );

      // case STAGES.PREVIEW_OUTPUT:
      //   return (
      //     <Preview
      //       frame={selectedFrames[previewIndex]}
      //       windowHeight={windowHeight}
      //       windowWidth={windowWidth}
      //     />
      //   );

      case STAGES.RESPONSIVE_PREVIEW:
        return <ResponsiveView svgObjectUrl={svgObjectUrl} />;

      case STAGES.SAVE_OUTPUT:
        return <Save svgObjectUrl={svgObjectUrl} />;

      default:
        return <div>Loading...</div>;
    }
  };

  render(): h.JSX.Element {
    const { version } = this.props;
    const { error, frames, stage } = this.state;

    console.log(this.state);

    return (
      <div className="f2h">
        <Header
          stage={stage}
          handleBackClick={this.goBack}
          handleNextClick={this.goNext}
          disableNext={stage === STAGES.SAVE_OUTPUT}
          // frame={selectedFrame}
          handleOptimseClick={this.toggleOptimised}
        />

        <div className="f2h__body">
          {error ? <div className="error">{error}</div> : this.switchView()}
        </div>
        <p className="f2h__version">Version: {version}</p>
      </div>
    );
  }
}
