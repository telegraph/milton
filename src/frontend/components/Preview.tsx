import { h, Component, RefObject, createRef } from "preact";

enum BUTTONS {
  LEFT = 0,
  MIDDLE = 1,
  RIGHT = 2,
}

interface PreviewProps {
  rendering: boolean;
  html: string;
  responsive: boolean;
  breakpointWidth: number;
  breakpointHeight: number;
  zoom: number;
}

interface PreviewStateInterface {
  x: number;
  y: number;
  startX: number;
  startY: number;
  translateX: number;
  translateY: number;
  offsetWidth: number;
  offsetHeight: number;
  prevOffsetWidth: number;
  prevOffsetHeight: number;
  panningEnabled: boolean;
  isPanning: boolean;
  resizing: boolean;
  prevMouseX: number;
  prevMouseY: number;
  selected: boolean;
}

export class Preview extends Component<PreviewProps, PreviewStateInterface> {
  state: PreviewStateInterface = {
    x: 0,
    y: 0,
    startX: 0,
    startY: 0,
    offsetWidth: 0,
    offsetHeight: 0,
    prevOffsetWidth: 0,
    prevOffsetHeight: 0,
    translateX: 0,
    translateY: 0,
    panningEnabled: false,
    isPanning: false,
    resizing: false,
    prevMouseX: 0,
    prevMouseY: 0,
    selected: false,
  };

  previewEl: RefObject<HTMLDivElement> = createRef();

  startPanning = (e: MouseEvent) => {
    const { button, x, y } = e;

    if (this.state.panningEnabled) {
      this.setState({ startX: x, startY: y, isPanning: true });
      return;
    }

    if (button === BUTTONS.MIDDLE && this.state.isPanning === false) {
      this.setState({
        startX: x,
        startY: y,
        isPanning: true,
        panningEnabled: true,
      });
    }
  };

  panPreview = (e: MouseEvent) => {
    if (this.state.panningEnabled && this.state.isPanning) {
      const distanceX = e.x - this.state.startX;
      const distanceY = e.y - this.state.startY;

      this.setState({ x: distanceX, y: distanceY });
    }
  };

  stopPanning = (e: MouseEvent) => {
    if (this.state.panningEnabled === false) return;

    this.setState({
      isPanning: false,
      panningEnabled: e.button === BUTTONS.LEFT,
      translateX: this.state.translateX + this.state.x,
      translateY: this.state.translateY + this.state.y,
      x: 0,
      y: 0,
    });
  };

  enablePanning = ({ code }: KeyboardEvent) => {
    if (code === "Space" && this.state.panningEnabled === false) {
      this.setState({ panningEnabled: true });
    }
  };

  disablePanning = ({ code }: KeyboardEvent) => {
    if (code === "Space" && this.state.panningEnabled) {
      this.setState({ panningEnabled: false, isPanning: false });
    }
  };

  enableSelection = (e: MouseEvent) => {
    e.stopPropagation();
    this.setState({ selected: true });
  };

  disableSelection = () => {
    this.setState({ selected: false });
  };

  startResize = ({ button, x, y }: MouseEvent) => {
    if (button === BUTTONS.LEFT)
      this.setState({ resizing: true, prevMouseX: x, prevMouseY: y });
  };

  updateResize = (e: MouseEvent) => {
    if (this.state.resizing === false) return;

    const {
      prevMouseX,
      prevMouseY,
      prevOffsetWidth,
      prevOffsetHeight,
    } = this.state;
    const { zoom } = this.props;

    // const newOffsetWidth = (e.x - prevMouseX) / zoom + prevOffsetWidth;
    // const newOffsetHeight = (e.y - prevMouseY) / zoom + prevOffsetHeight;

    const newOffsetWidth = (e.x - prevMouseX) / zoom + prevOffsetWidth;
    const newOffsetHeight = (e.y - prevMouseY) / zoom + prevOffsetHeight;

    this.setState({
      offsetWidth: newOffsetWidth,
      offsetHeight: newOffsetHeight,
    });
  };

  endResize = () => {
    if (this.state.resizing === false) return;

    this.setState({
      resizing: false,
      prevMouseX: 0,
      prevMouseY: 0,
      prevOffsetWidth: this.state.offsetWidth,
      prevOffsetHeight: this.state.offsetHeight,
    });
  };

  componentDidMount() {
    if (!this.previewEl.current) return;

    const previewRefEl = this.previewEl.current;
    previewRefEl.addEventListener("mousedown", this.startPanning);
    previewRefEl.addEventListener("mousemove", this.panPreview);
    previewRefEl.addEventListener("mouseup", this.stopPanning);
    previewRefEl.addEventListener("mouseleave", this.stopPanning);
    window.addEventListener("keydown", this.enablePanning);
    window.addEventListener("keyup", this.disablePanning);
  }

  componentWillUnmount() {
    if (!this.previewEl.current) return;

    const previewRefEl = this.previewEl.current;
    previewRefEl.removeEventListener("mousedown", this.startPanning);
    previewRefEl.removeEventListener("mousemove", this.panPreview);
    previewRefEl.removeEventListener("mouseup", this.stopPanning);
    previewRefEl.removeEventListener("mouseleave", this.stopPanning);
    window.removeEventListener("keydown", this.enablePanning);
    window.removeEventListener("keyup", this.disablePanning);
  }

  componentDidUpdate({ breakpointWidth }: PreviewProps) {
    if (breakpointWidth !== this.props.breakpointWidth) {
      this.setState({
        x: 0,
        y: 0,
        translateX: 0,
        translateY: 0,
        offsetWidth: 0,
        offsetHeight: 0,
      });
    }
  }

  render() {
    const { breakpointWidth, html, zoom, rendering } = this.props;
    const {
      offsetWidth,
      offsetHeight,
      translateX,
      translateY,
      resizing,
      panningEnabled,
      selected,
      x,
      y,
    } = this.state;

    console.log(this.state);

    const iframeWidth = breakpointWidth + offsetWidth * 2;
    const iframeHeight = breakpointWidth + offsetHeight * 2;
    const IFRAME_HEIGHT_MARGIN = 160;

    const iframeStyle = `
    width: ${iframeWidth}px;
    height: ${iframeHeight}px;
    transform: scale(${zoom});
  `;

    const iframeWrapperStyle = `
    width: ${iframeWidth * zoom}px;
    height: ${iframeHeight * zoom}px;
    transform:  translateX(${translateX + x}px) translateY(${translateY + y}px);
  `;

    return (
      <section class={`preview ${resizing ? "preview--resizing" : ""}`}>
        {rendering && <div class="preview__rendering">Rendering</div>}

        <div class="preview__settings">
          <p>
            {Math.round(iframeWidth)} x {Math.round(iframeHeight)}
          </p>
        </div>

        <div
          class={`preview__container ${
            panningEnabled ? "preview__container--drag" : ""
          }`}
          ref={this.previewEl}
          onMouseUp={this.endResize}
          onMouseMove={this.updateResize}
          onClick={this.disableSelection}
        >
          <div
            class={`preview__iframe_wrapper  ${
              selected ? "preview__iframe_wrapper--selected" : ""
            }`}
            style={iframeWrapperStyle}
            onClick={this.enableSelection}
          >
            <iframe class="preview__iframe" srcDoc={html} style={iframeStyle} />
            <button
              class="preview__iframe_resize"
              onMouseDown={this.startResize}
            >
              Resize
            </button>
          </div>
        </div>
      </section>
    );
  }
}
