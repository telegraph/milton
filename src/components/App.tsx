import { h, Component } from "preact";
import produce from "immer";
import { saveAs } from "file-saver";
import { renderInline } from "../outputRender";
import { MSG_EVENTS, STAGES, UI_TEXT } from "../constants";
import { Header } from "./Header";
import { ResponsiveView } from "./ResponsiveView";
import { FrameSelection } from "./FrameSelection";
// import { Preview } from "./Preview";
import { Save } from "./Save";
import { decodeSvgToString } from "../utils/svg";
import { sendMessage, postMan } from "../utils/messages";
import {
  AppState,
  AppPropsInterface,
  MsgFramesType,
  FrameCollection,
  HeadlinesInterface,
} from "types";

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

  constructor(props) {
    super(props);
  }

  componentDidMount(): void {
    postMan
      .send({ workload: MSG_EVENTS.GET_ROOT_FRAMES })
      .then(this.updateInitialState)
      .catch((err) => console.error("erer", err));
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

  handleRenderMessage = async (svgData: Uint8Array): Promise<void> => {
    if (!svgData) {
      this.setState({ error: "Failed to render" });
      console.error("Post message: failed to render");
      return;
    }

    console.log(new TextDecoder("utf-8").decode(svgData));

    // Revoke old URL blob if previously set
    const { selectedFrames, frames, headline, subhead, source } = this.state;

    let svgText = await decodeSvgToString(svgData);

    console.log("SVG file size", (svgText?.length || 1) / 1024);

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

  // TODO: Merge goNext and goBack
  goNext = (): void => {
    const { stage } = this.state;

    switch (stage) {
      case STAGES.CHOOSE_FRAMES:
        this.getOutputRender();
        return;

      case STAGES.RESPONSIVE_PREVIEW:
        this.setState({ stage: STAGES.SAVE_OUTPUT });
        return;

      case STAGES.SAVE_OUTPUT:
        return;
    }
  };

  goBack = (): void => {
    const { stage } = this.state;

    switch (stage) {
      case STAGES.CHOOSE_FRAMES:
        return;

      case STAGES.RESPONSIVE_PREVIEW:
        this.setState({ stage: STAGES.CHOOSE_FRAMES });
        return;

      case STAGES.SAVE_OUTPUT:
        this.setState({ stage: STAGES.RESPONSIVE_PREVIEW });
        return;
    }
  };

  getOutputRender = (): void => {
    const { selectedFrames } = this.state;

    // sendMessage(MSG_EVENTS.RENDER, { ids: selectedFrames });
    postMan
      .send({ workload: MSG_EVENTS.RENDER, data: selectedFrames })
      .then(this.handleRenderMessage)
      .catch((err) => {
        console.error("error getting render", err);
      });
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
    const { error, stage } = this.state;

    console.log(this.state);

    return (
      <div className="f2h">
        <Header
          stage={stage}
          handleBackClick={this.goBack}
          handleNextClick={this.goNext}
          disableNext={stage === STAGES.SAVE_OUTPUT}
          // frame={selectedFrame}
        />

        <div className="f2h__body">
          {error ? <div className="error">{error}</div> : this.switchView()}
        </div>
        <p className="f2h__version">Version: {version}</p>
      </div>
    );
  }
}
