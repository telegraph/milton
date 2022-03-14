import {
  EMBED_PROPERTIES,
  MSG_EVENTS,
  NOTIFICATIONS_IDS,
  STATUS,
} from "constants";
import { Component, createContext, h } from "preact";
import { FigmaFramesType, FrameDataInterface } from "types";
import { postMan } from "utils/messages";
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
  googleFonts: boolean;
  zoom: number;
  breakpointWidth: number;
  backgroundColour: string;
  customHTML: string;
  notificationId: NOTIFICATIONS_IDS | undefined;
  notificationMessage?: string;
}

interface StateMethods {
  setZoom: (val: number) => void;
  setBreakpointWidth: (width: number) => void;
  setNotification: (id?: NOTIFICATIONS_IDS, msg?: string) => void;
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
  toggleGoogleFonts: () => void;
  getHTMLRenderPropsHash: (state: StateInterface) => string;
  setCustomHTML: (text: string) => void;
}

export interface StateInterface extends StateMethods, StateProps {}

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
  googleFonts: true,
  breakpointWidth: 100,
  backgroundColour: "#C4C4C4",
  customHTML: "",

  notificationId: undefined,
  notificationMessage: "",
};

export const AppContext = createContext({} as StateInterface);

export class AppProvider extends Component<{}, StateInterface> {
  svgCache: Record<string, string> = {};

  getSvg = async (framesIds: string[]): Promise<string> => {
    let svg = "";
    const cacheId = [...framesIds].sort().join("");

    if (this.svgCache[cacheId]) {
      return this.svgCache[cacheId];
    }

    try {
      svg = await renderSvg(framesIds);
    } catch (err) {
      console.error("Failed to render SVG", err);
      throw NOTIFICATIONS_IDS.ERROR_FAILED_TO_RENDER_BACKEND_SVG;
    }

    this.svgCache[cacheId] = svg;
    return svg;
  };

  getFigmaFrames = async (): Promise<void> => {
    try {
      this.setState({ status: STATUS.RENDERING });
      const response = await getRootFramesFromBackend();
      await this.getSvg(response.selectedFrames);
      this.setState({ ...response, status: STATUS.IDLE });
    } catch (err) {
      this.setNotification(err);
    }
  };

  getOutputFrames = (): FrameDataInterface[] => {
    const { selectedFrames, frames } = this.state;

    return Object.values(frames).filter(({ id }) =>
      selectedFrames.includes(id)
    );
  };

  getHtml = async (): Promise<string> => {
    const {
      headline,
      embedUrl,
      subhead,
      source,
      sourceUrl,
      responsive,
      fileKey,
      selectedFrames,
      googleFonts,
      customHTML,
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
      googleFonts,
      customHTML,
    });
  };

  setFrameSelection = (id: string) => {
    const { selectedFrames, frames } = this.state;
    let newSelection: string[];

    if (selectedFrames.includes(id)) {
      newSelection = selectedFrames.filter((frameId) => id !== frameId);
    } else {
      newSelection = selectedFrames.concat(id);
    }

    const widths = Object.values(frames)
      .filter(({ id }) => newSelection.includes(id))
      .map(({ width }) => width);

    const minWidth = Math.min(...widths);

    this.setState({ selectedFrames: newSelection, breakpointWidth: minWidth });
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

  setNotification = (id?: NOTIFICATIONS_IDS, msg?: string): void => {
    this.setState({
      notificationId: id,
      notificationMessage: msg,
      status: STATUS.ERROR,
    });
  };

  getHTMLRenderPropsHash = (state: StateInterface): string => {
    return [
      state.googleFonts,
      state.embedUrl,
      state.headline,
      state.subhead,
      state.source,
      state.sourceUrl,
      state.responsive,
      state.customHTML,
      ...state.selectedFrames,
    ].join();
  };

  setCustomHTML = (text: string) => {
    this.setState({ customHTML: text }, () => {
      console.log("TODO: Save to local storage");

      postMan
        .send({ workload: MSG_EVENTS.SET_CUSTOM_HTML, data: text })
        .catch((err) =>
          console.error("Failed to send custom HTML to backend", err)
        );
    });
  };

  state: StateInterface = {
    ...initialProps,
    toggleGoogleFonts: () =>
      this.setState({ googleFonts: !this.state.googleFonts }),
    toggleResponsive: () =>
      this.setState({ responsive: !this.state.responsive }),
    setZoom: (val) => this.setState({ zoom: val }),
    setBreakpointWidth: (width) => this.setState({ breakpointWidth: width }),
    setNotification: this.setNotification,
    setHeadline: this.setHeadline,
    setSubhead: this.setSubhead,
    setSource: this.setSource,
    setSourceUrl: this.setSourceUrl,
    setEmbedUrl: this.setEmbedUrl,
    setBackgroundColour: (val) => this.setState({ backgroundColour: val }),
    setFrameSelection: this.setFrameSelection,
    getOutputFrames: this.getOutputFrames,
    getHtml: this.getHtml,
    getHTMLRenderPropsHash: this.getHTMLRenderPropsHash,
    setCustomHTML: this.setCustomHTML,
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
