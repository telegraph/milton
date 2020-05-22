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
  textNodes: textData[];
  uid: string;
};

interface MsgEventType {
  type: MSG_EVENTS;
  frames?: FrameDataType[];
  selectedFrames?: string[];
  rawRender?: string;
  renderId?: string;
  errorText?: string;
  svgStr?: string;
  frameId?: string;
}

export type AppState = {
  error: undefined | string;
  ready: boolean;
  frames: FrameDataType[];
  selectedFrames: string[];
  stage: STAGES;
  previewIndex: number;
  renders: { [id: string]: string };
  outputFormat: OUTPUT_FORMATS;
  isResizing: boolean;
  mouseStartX: number;
  mouseStartY: number;
  windowWidth: number;
  windowHeight: number;
};

export class App extends Component {
  state: AppState = {
    error: undefined,
    ready: false,
    frames: [],
    selectedFrames: [],
    stage: STAGES.CHOOSE_FRAMES,
    previewIndex: 0,
    renders: {},
    outputFormat: OUTPUT_FORMATS.INLINE,
    isResizing: false,
    mouseStartX: 0,
    mouseStartY: 0,
    windowWidth: INITIAL_UI_SIZE.width,
    windowHeight: INITIAL_UI_SIZE.height,
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
    const { type, frames, selectedFrames, frameId, svgStr, errorText } = data;

    switch (type) {
      case MSG_EVENTS.FOUND_FRAMES:
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
          selectedFrames,
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
        this.setState({ error: `${UI_TEXT.ERROR_UNEXPECTED}: ${errorText}` });
        break;

      case MSG_EVENTS.RENDER:
        if (!frameId || !svgStr) {
          this.setState({ error: 'Failed to render' });
          console.error('Post message: failed to render', data);
          return;
        }

        this.setState({
          renders: { ...this.state.renders, [frameId]: svgStr },
        });
        return;

      default:
        this.setState({ error: 'Unknown error o_O?' });
        console.error('Unknown UI event type', type, data);
    }
  };

  handleFrameSelectionChange = (id: string) => {
    const { selectedFrames, frames } = this.state;

    let newSelections: string[] = [];

    if (selectedFrames.includes(id)) {
      newSelections = selectedFrames.filter((i) => i !== id);
    } else {
      newSelections = [...selectedFrames, id];
    }

    newSelections = frames
      .filter((frame) => newSelections.includes(frame.id))
      .sort((a, b) => (a.width < b.width ? -1 : 1))
      .map((frame) => frame.id);

    this.setState({ selectedFrames: newSelections });
  };

  goNext = () => {
    const { stage, selectedFrames, previewIndex } = this.state;

    if (selectedFrames.length < 1) {
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
      previewIndex < selectedFrames.length - 1
    ) {
      this.setState({ previewIndex: previewIndex + 1 });
      return;
    }

    if (
      stage === STAGES.PREVIEW_OUTPUT &&
      previewIndex === selectedFrames.length - 1
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

  getMaxFrameDimensions = (frames: FrameDataType[]) => {
    let width = frames.reduce((p, { width }) => (width > p ? width : p), 0);
    let height = frames.reduce((p, { height }) => (height > p ? height : p), 0);

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
    const { frames, renders, outputFormat, selectedFrames } = this.state;
    const outputFrames = frames.filter(({ id }) => selectedFrames.includes(id));
    const filename = 'figma-to-html-test.html';
    const raw = renderInline(outputFrames, renders, outputFormat);
    const blob = new Blob([raw], { type: 'text/html' });

    saveAs(blob, filename);
  };

  startResizing = (event: MouseEvent) => {
    console.log('starting resizing');
    const { isResizing } = this.state;

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
    console.log('stop resizing', isResizing);

    if (isResizing) {
      const { width, height } = document.body.getBoundingClientRect();

      this.setState({
        isResizing: false,
        windowWidth: width,
        windowHeight: height,
      });
      window.removeEventListener('mousemove', this.handleResize);
    }
  };

  render() {
    const {
      error,
      ready,
      frames,
      selectedFrames,
      stage,
      previewIndex,
      outputFormat,
      renders,
    } = this.state;

    console.log(this.state);

    const previewFrame = frames.find(
      (frame) => frame.id === selectedFrames[previewIndex]
    );

    const previewRender = previewFrame && this.state.renders[previewFrame.id];
    // TODO: Move somewhere else
    // If previewing frame without a render then request if from the backend
    if (previewFrame && !previewRender) {
      this.getOutputRender(previewFrame.id);
    }

    return (
      <div class="f2h" onMouseLeave={this.stopResizing}>
        <Header
          stage={stage}
          paginationLength={selectedFrames.length}
          paginationIndex={previewIndex}
          handleBackClick={this.goBack}
          handleNextClick={this.goNext}
          disableNext={selectedFrames.length < 1}
        />
        <div class="f2h__body">
          {error && <div class="error">{error}</div>}

          {ready && stage === STAGES.CHOOSE_FRAMES && (
            <FrameSelection
              frames={frames}
              selections={selectedFrames}
              handleClick={this.handleFrameSelectionChange}
            />
          )}

          {ready && previewFrame && stage === STAGES.PREVIEW_OUTPUT && (
            <Preview frame={previewFrame} render={previewRender} />
          )}

          {ready && stage === STAGES.RESPONSIVE_PREVIEW && (
            <ResponsiveView
              frames={frames.filter(({ id }) => selectedFrames.includes(id))}
              renders={renders}
            />
          )}

          {ready && stage === STAGES.SAVE_OUTPUT && (
            <Save
              outputFormat={outputFormat}
              handleClick={this.setOutputFormat}
              frames={frames.filter(({ id }) => selectedFrames.includes(id))}
              renders={renders}
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
