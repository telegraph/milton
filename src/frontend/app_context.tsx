import { EMBED_PROPERTIES, NOTIFICATIONS_IDS, STATUS } from "constants";
import { Component, createContext, h } from "preact";
import { FigmaFramesType, FrameDataInterface } from "types";
import { generateEmbedHtml } from "./components/outputRender";
import { getRootFramesFromBackend, renderSvg, saveToFigma } from "./data";

interface StateProps {
  status: STATUS;
  selectedFrames: string[];
  frames: FigmaFramesType;
  fileKey: string;
  headline: string;
  subhead: string;
  source: string;
  sourceUrl: string;
  embedUrl: string;
  responsive: boolean;
  zoom: number;
  breakpointWidth: number;
  backgroundColour: string;
  notificationId: NOTIFICATIONS_IDS | undefined;
  notificationMessage?: string;
}

interface StateMethods {
  setZoom: (val: number) => void;
  setBreakpointWidth: (width: number) => void;
  setNotificationId: (id?: NOTIFICATIONS_IDS) => void;
  setFrameSelection: (id: string) => void;
  setHeadline: (text: string) => void;
  setSubhead: (text: string) => void;
  setSource: (text: string) => void;
  setSourceUrl: (text: string) => void;
  setEmbedUrl: (text: string) => void;
  setBackgroundColour: (text: string) => void;
  getHtml: () => Promise<string>;
  getOutputFrames: () => FrameDataInterface[];
  toggleResponsive: () => void;
}

export interface StateInterface2 extends StateMethods, StateProps {}

const initialProps: StateProps = {
  status: STATUS.LOADING,
  frames: {},
  selectedFrames: [],

  headline: "",
  subhead: "",
  source: "",
  sourceUrl: "",
  embedUrl: "",

  zoom: 1,
  fileKey: "",
  responsive: true,
  breakpointWidth: 100,
  backgroundColour: "#C4C4C4",
  notificationId: undefined,
  notificationMessage: "",
};

export const AppContext = createContext({} as StateInterface2);

export class AppProvider extends Component<{}, StateInterface2> {
  svgCache: Record<string, string> = {};

  getSvg = async (framesIds: string[]): Promise<string> => {
    let svg = "";
    const cacheId = framesIds.join("");

    if (this.svgCache[cacheId]) {
      return this.svgCache[cacheId];
    }

    try {
      svg = await renderSvg(framesIds);
    } catch (err) {
      console.error("Failed to render SVG", err);
    }

    this.svgCache[cacheId] = svg;
    return svg;
  };

  getFigmaFrames = async (): Promise<void> => {
    try {
      const response = await getRootFramesFromBackend();
      await this.getSvg(response.selectedFrames);
      this.setState({ ...response, status: STATUS.IDLE });
    } catch (err) {
      console.error("Failed to fetch initial frames", err);
    }
  };

  getOutputFrames = (): FrameDataInterface[] => {
    const { selectedFrames, frames } = this.state;

    return Object.values(frames).filter(({ id }) =>
      selectedFrames.includes(id)
    );
  };

  getHtml = async (): Promise<string> => {
    // FIXME: Better way to generate HTML
    const {
      headline,
      embedUrl,
      subhead,
      source,
      sourceUrl,
      responsive,
      fileKey,
      selectedFrames,
    } = this.state;
    const outputFrames = this.getOutputFrames();
    const svgText = await this.getSvg(selectedFrames);

    return generateEmbedHtml({
      headline,
      embedUrl,
      subhead,
      source,
      sourceUrl,
      outputFrames,
      responsive,
      svgText,
      fileKey,
    });
  };

  setFrameSelection = (id: string) => {
    const { selectedFrames } = this.state;
    let newSelection: string[];

    if (selectedFrames.includes(id)) {
      newSelection = selectedFrames.filter((frameId) => id !== frameId);
    } else {
      newSelection = selectedFrames.concat(id);
    }

    this.setState({ selectedFrames: newSelection });
  };

  setHeadline = (text: string) => {
    this.setState({ [EMBED_PROPERTIES.HEADLINE]: text });
    saveToFigma(EMBED_PROPERTIES.HEADLINE, text);
  };

  setSubhead = (text: string) => {
    this.setState({ [EMBED_PROPERTIES.SUBHEAD]: text });
    saveToFigma(EMBED_PROPERTIES.SUBHEAD, text);
  };

  setSource = (text: string) => {
    this.setState({ [EMBED_PROPERTIES.SOURCE]: text });
    saveToFigma(EMBED_PROPERTIES.SOURCE, text);
  };

  setSourceUrl = (text: string) => {
    this.setState({ [EMBED_PROPERTIES.SOURCE_URL]: text });
    saveToFigma(EMBED_PROPERTIES.SOURCE_URL, text);
  };

  setEmbedUrl = (text: string) => {
    this.setState({ [EMBED_PROPERTIES.EMBED_URL]: text });
    saveToFigma(EMBED_PROPERTIES.EMBED_URL, text);
  };

  state: StateInterface2 = {
    ...initialProps,
    toggleResponsive: () =>
      this.setState({ responsive: !this.state.responsive }),
    setZoom: (val) => this.setState({ zoom: val }),
    setBreakpointWidth: (width) => this.setState({ breakpointWidth: width }),
    setNotificationId: (id) => this.setState({ notificationId: id }),
    setHeadline: this.setHeadline,
    setSubhead: this.setSubhead,
    setSource: this.setSource,
    setSourceUrl: this.setSourceUrl,
    setEmbedUrl: this.setEmbedUrl,
    setBackgroundColour: (val) => this.setState({ backgroundColour: val }),
    setFrameSelection: this.setFrameSelection,
    getOutputFrames: this.getOutputFrames,
    getHtml: this.getHtml,
  };

  componentDidMount() {
    this.getFigmaFrames();
  }

  render() {
    return (
      <AppContext.Provider value={this.state} children={this.props.children} />
    );
  }
}
