import { h, Component, render } from 'preact';
import { saveAs } from 'file-saver';

import { renderInline } from './outputRender';
import {
  MSG_EVENTS,
  STAGES,
  OUTPUT_FORMATS,
  UI_TEXT,
  INITIAL_UI_SIZE,
} from './constants';
import { Header } from './components/Header';
import { FrameSelection } from './components/FrameSelection';
import { Preview } from './components/Preview';
import { Save } from './components/Save';
import type { textData } from './index';
import { ResponsiveView } from './components/ResponsiveView';

// Import CSS files as plain text via esbuild loader option
// @ts-expect-error
import uiCss from './ui.css';
// @ts-expect-error
import embedCss from './embed.css';

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
  | MsgErrorType;

export interface MsgFramesType {
  type: MSG_EVENTS.FOUND_FRAMES;
  frames: {
    [id: string]: FrameDataType;
  };
}

export interface MsgRenderType {
  type: MSG_EVENTS.RENDER;
  svgStr: string;
  frameId: string;
}

export interface MsgNoFramesType {
  type: MSG_EVENTS.NO_FRAMES;
}

export interface MsgErrorType {
  type: MSG_EVENTS.ERROR;
  errorText: string;
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
  outputFormat: OUTPUT_FORMATS;
  isResizing: boolean;
  mouseStartX: number;
  mouseStartY: number;
  windowWidth: number;
  windowHeight: number;
  responsive: boolean;
};

export class App extends Component {
  state: AppState = {
    error: undefined,
    ready: false,
    frames: {},
    stage: STAGES.CHOOSE_FRAMES,
    previewIndex: 0,
    outputFormat: OUTPUT_FORMATS.INLINE,
    isResizing: false,
    mouseStartX: 0,
    mouseStartY: 0,
    windowWidth: INITIAL_UI_SIZE.width,
    windowHeight: INITIAL_UI_SIZE.height,
    responsive: true,
  };

  componentDidMount() {
    // Register DOM and POST messags
    window.addEventListener('message', (e) =>
      this.handleEvents(e.data.pluginMessage)
    );

    // Send backend message that UI is ready
    parent.postMessage({ pluginMessage: { type: MSG_EVENTS.DOM_READY } }, '*');
  }

  handleEvents = (data: MsgEventType) => {
    switch (data.type) {
      case MSG_EVENTS.FOUND_FRAMES:
        const { frames } = data;

        if (!frames) {
          this.setState({ error: 'No frames!' });
          console.error('Post error: no frames', data);
          return;
        }

        let { width, height } = this.getMaxFrameDimensions(frames);
        if (width > INITIAL_UI_SIZE.maxWidth) {
          width = INITIAL_UI_SIZE.maxWidth;
        }
        if (width < INITIAL_UI_SIZE.minWidth) {
          width = INITIAL_UI_SIZE.minWidth;
        }

        if (height > INITIAL_UI_SIZE.maxHeight) {
          height = INITIAL_UI_SIZE.maxHeight;
        }
        if (height < INITIAL_UI_SIZE.minHeight) {
          height = INITIAL_UI_SIZE.minHeight;
        }

        this.setState({
          frames,
          ready: true,
          windowWidth: width,
          windowHeight: height,
        });

        parent.postMessage(
          {
            pluginMessage: { type: MSG_EVENTS.RESIZE, width, height },
          },
          '*'
        );

        break;

      case MSG_EVENTS.NO_FRAMES:
        this.setState({ error: UI_TEXT.ERROR_MISSING_FRAMES });
        break;

      case MSG_EVENTS.ERROR:
        this.setState({
          error: `${UI_TEXT.ERROR_UNEXPECTED}: ${data.errorText}`,
        });
        break;

      case MSG_EVENTS.RENDER:
        const { frameId, svgStr } = data;
        if (!frameId || !svgStr) {
          this.setState({ error: 'Failed to render' });
          console.error('Post message: failed to render', data);
          return;
        }

        const targetFrame = this.state.frames[frameId];

        this.setState({
          frames: {
            ...this.state.frames,
            [frameId]: { ...targetFrame, svg: svgStr },
          },
        });
        break;

      default:
        this.setState({ error: 'Unknown post message' });
        console.error('UI post message error', data);
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
    const selectedCount = Object.values(frames).filter((f) => f.selected);

    if (selectedCount.length < 1) {
      return;
    }

    if (stage === STAGES.SAVE_OUTPUT) {
      this.saveBinaryFile();
    }

    if (stage === STAGES.CHOOSE_FRAMES) {
      this.setState({ stage: STAGES.PREVIEW_OUTPUT });
      return;
    }

    if (
      stage === STAGES.PREVIEW_OUTPUT &&
      previewIndex < selectedCount.length - 1
    ) {
      this.setState({ previewIndex: previewIndex + 1 });
      return;
    }

    if (
      stage === STAGES.PREVIEW_OUTPUT &&
      previewIndex === selectedCount.length - 1
    ) {
      this.setState({ stage: STAGES.RESPONSIVE_PREVIEW });
      return;
    }

    if (stage === STAGES.RESPONSIVE_PREVIEW) {
      this.setState({ stage: STAGES.SAVE_OUTPUT });
      return;
    }
  };

  goBack = () => {
    const { stage, previewIndex } = this.state;

    if (stage === STAGES.CHOOSE_FRAMES) {
      return;
    }

    if (stage === STAGES.PREVIEW_OUTPUT && previewIndex > 0 && previewIndex) {
      this.setState({ previewIndex: previewIndex - 1 });
      return;
    }

    if (stage === STAGES.PREVIEW_OUTPUT && previewIndex === 0) {
      this.setState({ stage: STAGES.CHOOSE_FRAMES });
      return;
    }

    if (stage === STAGES.RESPONSIVE_PREVIEW) {
      this.setState({ stage: STAGES.PREVIEW_OUTPUT });
      return;
    }

    if (stage === STAGES.SAVE_OUTPUT) {
      this.setState({ stage: STAGES.RESPONSIVE_PREVIEW });
      return;
    }
  };

  getOutputRender = (frameId: String) => {
    parent.postMessage(
      { pluginMessage: { type: MSG_EVENTS.RENDER, frameId } },
      '*'
    );
  };

  getMaxFrameDimensions = (frames: FrameCollection) => {
    const frameVals = Object.values(frames);
    let width = frameVals.reduce((p, { width }) => (width > p ? width : p), 0);
    let height = frameVals.reduce(
      (p, { height }) => (height > p ? height : p),
      0
    );

    const paddingWidth = 16;
    const paddingHeight = 100;
    width = width + paddingWidth;
    height = height + paddingHeight;
    console.log(height);

    return { width, height };
  };

  setOutputFormat = (format: OUTPUT_FORMATS) => {
    this.setState({
      outputFormat: format,
    });
  };

  saveBinaryFile = () => {
    const { frames, outputFormat } = this.state;
    const outputFrames = Object.values(frames).filter((f) => f.selected);

    const filename = 'figma-to-html-test.html';
    const raw = renderInline(outputFrames, outputFormat);
    const blob = new Blob([raw], { type: 'text/html' });

    saveAs(blob, filename);
  };

  startResizing = (event: MouseEvent) => {
    const { isResizing } = this.state;
    console.log('starting resizing');

    if (!isResizing) {
      const { x, y } = event;
      this.setState({ isResizing: true, mouseStartX: x, mouseStartY: y });
      window.addEventListener('mousemove', this.handleResize);
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
        '*'
      );

      // Post message to backend
    }
  };

  stopResizing = () => {
    const { isResizing } = this.state;

    if (!isResizing) {
      return;
    }

    console.log('stop resizing', isResizing);
    const { width, height } = document.body.getBoundingClientRect();

    this.setState({
      isResizing: false,
      windowWidth: width,
      windowHeight: height,
    });
    window.removeEventListener('mousemove', this.handleResize);
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

  render() {
    const {
      error,
      ready,
      frames,
      stage,
      previewIndex,
      outputFormat,
    } = this.state;

    console.log(this.state);

    const framesArr = Object.values(frames);
    const selectedFrames = framesArr.filter((f) => f.selected);
    const selectedCount = selectedFrames.length;
    selectedFrames.sort((a, b) => (a.width < b.width ? -1 : 1));

    // If previewing frame without a render then request if from the backend
    if (stage === STAGES.PREVIEW_OUTPUT && !selectedFrames[previewIndex].svg) {
      this.getOutputRender(selectedFrames[previewIndex].id);
    }

    return (
      <div class="f2h" onMouseLeave={this.stopResizing}>
        <Header
          stage={stage}
          paginationLength={selectedCount}
          paginationIndex={previewIndex}
          handleBackClick={this.goBack}
          handleNextClick={this.goNext}
          disableNext={selectedCount < 1}
        />
        <div class="f2h__body">
          {error && <div class="error">{error}</div>}

          {ready && stage === STAGES.CHOOSE_FRAMES && (
            <FrameSelection
              frames={framesArr}
              handleClick={this.handleFrameSelectionChange}
              toggleResonsive={this.toggleResonsive}
            />
          )}

          {ready &&
            selectedFrames[previewIndex] &&
            stage === STAGES.PREVIEW_OUTPUT && (
              <Preview frame={selectedFrames[previewIndex]} />
            )}

          {ready && stage === STAGES.RESPONSIVE_PREVIEW && (
            <ResponsiveView frames={selectedFrames} />
          )}

          {ready && stage === STAGES.SAVE_OUTPUT && (
            <Save
              outputFormat={outputFormat}
              handleClick={this.setOutputFormat}
              frames={selectedFrames}
            />
          )}
        </div>

        <div
          class="f2h__resizer"
          onMouseDown={this.startResizing}
          onMouseUp={this.stopResizing}
        ></div>
      </div>
    );
  }
}

function injectCss(css: string) {
  const styleEl = document.createElement('style');
  const styleText = document.createTextNode(css);
  styleEl.appendChild(styleText);
  document.head.appendChild(styleEl);
}

injectCss(uiCss);
injectCss(embedCss);

// Render app
render(<App />, document.body);
