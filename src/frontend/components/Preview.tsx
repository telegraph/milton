import { h, Component, RefObject, createRef } from "preact";

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
  };

  previewEl: RefObject<HTMLDivElement> = createRef();

  startPanning = (e: MouseEvent) => {
    if (this.state.panningEnabled) {
      this.setState({ startX: e.x, startY: e.y, isPanning: true });
    }
  };

  panPreview = (e: MouseEvent) => {
    if (this.state.panningEnabled && this.state.isPanning) {
      const distanceX = e.x - this.state.startX;
      const distanceY = e.y - this.state.startY;

      this.setState({ x: distanceX, y: distanceY });
    }
  };

  stopPanning = () => {
    if (this.state.panningEnabled) {
      this.setState({
        isPanning: false,
        translateX: this.state.translateX + this.state.x,
        translateY: this.state.translateY + this.state.y,
        x: 0,
        y: 0,
      });
    }
  };

  enablePanning = (e: KeyboardEvent) => {
    if (e.code === "Space" && this.state.panningEnabled === false) {
      this.setState({ panningEnabled: true });
    }
  };

  disablePanning = (e: KeyboardEvent) => {
    if (e.code === "Space" && this.state.panningEnabled) {
      this.setState({ panningEnabled: false, isPanning: false });
    }
  };

  startResize = (e: MouseEvent) => {
    // Only resize on left mouse button press
    if (e.button === 0) this.setState({ resizing: true, x: e.x, y: e.y });
  };

  endResize = () => {
    if (this.state.resizing) {
      this.setState({
        resizing: false,
        prevMouseX: 0,
        prevMouseY: 0,
        prevOffsetWidth: this.state.offsetWidth,
        prevOffsetHeight: this.state.offsetHeight,
      });
    }
  };

  updateResize = (e: MouseEvent) => {
    if (this.state.resizing) {
      const {
        prevMouseX,
        prevMouseY,
        prevOffsetWidth,
        prevOffsetHeight,
      } = this.state;
      const { zoom } = this.props;

      const newOffsetWidth = (e.x - prevMouseX) / zoom + prevOffsetWidth;
      const newOffsetHeight = (e.y - prevMouseY) / zoom + prevOffsetHeight;
      this.setState({
        offsetWidth: newOffsetWidth,
        offsetHeight: newOffsetHeight,
      });
    }
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

  render() {
    const { breakpointWidth, html, zoom, rendering } = this.props;
    const {
      offsetWidth,
      offsetHeight,
      translateX,
      translateY,
      resizing,
      panningEnabled,
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
        >
          <div class="preview__iframe_wrapper" style={iframeWrapperStyle}>
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
