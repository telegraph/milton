import { h, Component } from "preact";

import { renderInline } from "../outputRender";
import { MSG_EVENTS, STAGES, UI_TEXT } from "../constants";
import { Header } from "./Header";
import { ResponsiveView } from "./ResponsiveView";
import { FrameSelection } from "./FrameSelection";
import { Save } from "./Save";
import { decodeSvgToString } from "../utils/svg";
import { postMan } from "../utils/messages";
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
    loading: false,
    svgObjectUrl: "",
  };

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

    const { selectedFrames, frames, headline, subhead, source } = this.state;

    const ids = selectedFrames.map((id) => [id, frames[id].uid]);
    console.log("IDS", ids);
    let svgText = await decodeSvgToString(svgData, ids);

    console.log("SVG file size", (svgText?.length || 1) / 1024);

    const selected = Object.values(frames).filter((f) =>
      selectedFrames.includes(f.id)
    );

    const html = renderInline({
      frames: selected,
      svgText: svgText,
      headline,
      subhead,
      source,
    });

    this.setState({
      svgObjectUrl: html,
      stage: STAGES.RESPONSIVE_PREVIEW,
      loading: false,
    });
  };

  // TODO: Merge goNext and goBack
  goNext = (): void => {
    const { stage } = this.state;

    switch (stage) {
      case STAGES.CHOOSE_FRAMES:
        this.getOutputRender();
        this.setState({ loading: true });
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

  toggleFrameSelect = (id: string): void => {
    const { selectedFrames } = this.state;

    this.setState({
      selectedFrames: selectedFrames.includes(id)
        ? selectedFrames.filter((frameId) => id !== frameId)
        : [...selectedFrames, id],
    });
  };

  toggleSelectAll = (): void => {
    const { selectedFrames, frames } = this.state;
    if (selectedFrames.length > 0) {
      this.setState({ selectedFrames: [] });
    } else {
      this.setState({ selectedFrames: Object.values(frames).map((f) => f.id) });
    }
  };

  handleFormUpdate = (props: HeadlinesInterface): void => {
    this.setState({ ...props });
    postMan.send({ workload: MSG_EVENTS.UPDATE_HEADLINES, data: props });
  };

  render(): h.JSX.Element {
    const { version } = this.props;
    const {
      error,
      stage,
      loading,
      svgObjectUrl,
      headline,
      subhead,
      source,
      selectedFrames,
      frames,
    } = this.state;

    console.log(this.state);

    return (
      <div className="f2h">
        <Header
          stage={stage}
          handleBackClick={this.goBack}
          handleNextClick={this.goNext}
          disableNext={stage === STAGES.SAVE_OUTPUT}
        />

        <div className="f2h__body">
          {error && <div className="error">{error}</div>}
          {loading && (
            <div className="loading">
              <p className="loading__msg">Merging frames</p>
              <p className="loading__msg">Rendering HTML</p>
              <p className="loading__msg">Optimising images</p>
              <p className="loading__msg">Simplifying shapes</p>
            </div>
          )}

          {!error && !loading && stage === STAGES.CHOOSE_FRAMES && (
            <FrameSelection
              frames={frames}
              selectedFrames={selectedFrames}
              handleClick={this.toggleFrameSelect}
              toggleSelectAll={this.toggleSelectAll}
              headline={headline}
              subhead={subhead}
              source={source}
              handleFormUpdate={this.handleFormUpdate}
            />
          )}
          {!error && !loading && stage === STAGES.RESPONSIVE_PREVIEW && (
            <ResponsiveView svgObjectUrl={svgObjectUrl} />
          )}
          {!error && !loading && stage === STAGES.SAVE_OUTPUT && (
            <Save svgObjectUrl={svgObjectUrl} />
          )}
        </div>
        <p className="f2h__version">Version: {version}</p>
      </div>
    );
  }
}
