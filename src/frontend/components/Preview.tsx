import type { JSX, RefObject } from "preact";
import { h, Component, createRef } from "preact";

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
  backgroundColour: string;
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
  iframeEl: RefObject<HTMLIFrameElement> = createRef();

  startPanning = (e: MouseEvent): void => {
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

  panPreview = (e: MouseEvent): void => {
    if (this.state.panningEnabled && this.state.isPanning) {
      const distanceX = e.x - this.state.startX;
      const distanceY = e.y - this.state.startY;

      this.setState({ x: distanceX, y: distanceY });
    }
  };

  stopPanning = (e: MouseEvent): void => {
    if (this.state.panningEnabled === false) return;

    let panningEnabled = true;

    if (e.type === "mouseleave" || e.button === BUTTONS.MIDDLE) {
      panningEnabled = false;
    }

    this.setState({
      isPanning: false,
      panningEnabled,
      translateX: this.state.translateX + this.state.x,
      translateY: this.state.translateY + this.state.y,
      x: 0,
      y: 0,
    });
  };

  enablePanning = ({ code }: KeyboardEvent): void => {
    if (code === "Space" && this.state.panningEnabled === false) {
      this.setState({ panningEnabled: true });
    }
  };

  disablePanning = ({ code }: KeyboardEvent): void => {
    if (code === "Space" && this.state.panningEnabled) {
      this.setState({ panningEnabled: false, isPanning: false });
    }
  };

  enableSelection = (e: MouseEvent): void => {
    e.stopPropagation();
    this.setState({ selected: true });
  };

  disableSelection = (): void => {
    this.setState({ selected: false });
  };

  startResize = ({ button, x, y }: MouseEvent): void => {
    if (button === BUTTONS.LEFT)
      this.setState({ resizing: true, prevMouseX: x, prevMouseY: y });
  };

  updateResize = (e: MouseEvent): void => {
    if (this.state.resizing === false) return;

    const {
      prevMouseX,
      prevMouseY,
      prevOffsetWidth,
      prevOffsetHeight,
    } = this.state;
    const { zoom } = this.props;

    const newOffsetWidth = ((e.x - prevMouseX) * 2) / zoom + prevOffsetWidth;
    const newOffsetHeight = ((e.y - prevMouseY) * 2) / zoom + prevOffsetHeight;

    this.setState({
      offsetWidth: newOffsetWidth,
      offsetHeight: newOffsetHeight,
    });
  };

  endResize = (): void => {
    if (this.state.resizing === false) return;

    this.setState({
      resizing: false,
      prevMouseX: 0,
      prevMouseY: 0,
      prevOffsetWidth: this.state.offsetWidth,
      prevOffsetHeight: this.state.offsetHeight,
    });
  };

  updateIframeHeight = (): void => {
    if (!this.iframeEl.current) return;
    const iframe = this.iframeEl.current;
    const height =
      iframe.contentDocument?.body?.getBoundingClientRect().height ?? 100;
    this.setState({
      offsetHeight: height,
      prevOffsetHeight: height,
    });
  };

  componentDidMount(): void {
    if (!this.previewEl.current || !this.iframeEl.current) return;

    const previewRefEl = this.previewEl.current;
    previewRefEl.addEventListener("mousedown", this.startPanning);
    previewRefEl.addEventListener("mousemove", this.panPreview);
    previewRefEl.addEventListener("mouseup", this.stopPanning);
    previewRefEl.addEventListener("mouseleave", this.stopPanning);
    window.addEventListener("keydown", this.enablePanning);
    window.addEventListener("keyup", this.disablePanning);

    this.iframeEl.current.addEventListener("load", this.updateIframeHeight);
  }

  componentWillUnmount(): void {
    if (!this.previewEl.current || !this.iframeEl.current) return;

    const previewRefEl = this.previewEl.current;
    previewRefEl.removeEventListener("mousedown", this.startPanning);
    previewRefEl.removeEventListener("mousemove", this.panPreview);
    previewRefEl.removeEventListener("mouseup", this.stopPanning);
    previewRefEl.removeEventListener("mouseleave", this.stopPanning);
    window.removeEventListener("keydown", this.enablePanning);
    window.removeEventListener("keyup", this.disablePanning);

    this.iframeEl.current.removeEventListener("load", this.updateIframeHeight);
  }

  componentDidUpdate({ breakpointWidth }: PreviewProps): void {
    if (breakpointWidth !== this.props.breakpointWidth) {
      this.setState(
        {
          x: 0,
          y: 0,
          translateX: 0,
          translateY: 0,
          offsetWidth: 0,
          offsetHeight: 0,
          prevOffsetHeight: 0,
          prevOffsetWidth: 0,
        },
        this.updateIframeHeight
      );
    }
  }

  render(): JSX.Element {
    const {
      breakpointWidth,
      html,
      zoom,
      rendering,
      backgroundColour,
    } = this.props;
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

    const iframeWidth = breakpointWidth + offsetWidth;
    const iframeHeight = offsetHeight;

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

        <div
          class={`preview__container ${
            panningEnabled ? "preview__container--drag" : ""
          }`}
          ref={this.previewEl}
          onMouseUp={this.endResize}
          onMouseMove={this.updateResize}
          onClick={this.disableSelection}
          style={`background-color: ${backgroundColour}`}
        >
          <div
            class={`preview__iframe_wrapper  ${
              selected ? "preview__iframe_wrapper--selected" : ""
            }`}
            style={iframeWrapperStyle}
            onClick={this.enableSelection}
          >
            <iframe
              class="preview__iframe"
              srcDoc={html}
              style={iframeStyle}
              ref={this.iframeEl}
            />
            <button
              class="preview__iframe_resize"
              onMouseDown={this.startResize}
            >
              Resize
            </button>

            <p class="preview__dimensions">
              {Math.round(iframeWidth)} x {Math.round(iframeHeight)}
            </p>
          </div>
        </div>
      </section>
    );
  }
}
