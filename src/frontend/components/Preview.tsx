import type { JSX, RefObject } from "preact";
import type { PanzoomObject } from "@panzoom/panzoom";
import { h, Component, createRef } from "preact";
import PanZoom from "@panzoom/panzoom";

enum BUTTONS {
  LEFT = 0,
  MIDDLE = 1,
  RIGHT = 2,
}

enum DIRECTIONS {
  NW,
  NE,
  SE,
  SW,
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
  resizeDirection: DIRECTIONS;
  prevMouseX: number;
  prevMouseY: number;
  selected: boolean;
}

export class Preview extends Component<PreviewProps, PreviewStateInterface> {
  private panZoom: PanzoomObject | undefined;
  private containerElement: RefObject<HTMLDivElement> = createRef();

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
    selected: true,
    resizeDirection: DIRECTIONS.NE,
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

  startResize = (direction: DIRECTIONS, { button, x, y }: MouseEvent): void => {
    if (button === BUTTONS.LEFT)
      this.setState({
        resizing: true,
        prevMouseX: x,
        prevMouseY: y,
        resizeDirection: direction,
      });
  };

  updateResize = (e: MouseEvent): void => {
    if (this.state.resizing === false) return;

    const {
      prevMouseX,
      prevMouseY,
      prevOffsetWidth,
      prevOffsetHeight,
      resizeDirection,
    } = this.state;
    const { zoom } = this.props;
    const { NE, SE, SW } = DIRECTIONS;

    const xDirection =
      resizeDirection === NE || resizeDirection === SW ? 1 : -1;
    const yDirection =
      resizeDirection === SE || resizeDirection === SW ? 1 : -1;

    const scaledXDistance = ((e.x - prevMouseX) * 2) / zoom;
    const scaledYDistance = ((e.y - prevMouseY) * 2) / zoom;

    const newOffsetWidth = scaledXDistance * xDirection + prevOffsetWidth;
    const newOffsetHeight = scaledYDistance * yDirection + prevOffsetHeight;

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

    this.panZoom = PanZoom(this.previewEl.current, {
      excludeClass: "preview__iframe_resize",
      animate: false,
      canvas: true,
    });

    this.previewEl.current.addEventListener("panzoomchange", (event) => {
      this.setState({
        x: event?.detail.x,
        y: event?.detail.y,
      });
    });

    this.iframeEl.current.addEventListener("load", this.updateIframeHeight);
  }

  componentWillUnmount(): void {
    if (!this.previewEl.current || !this.iframeEl.current) return;
    this.iframeEl.current.removeEventListener("load", this.updateIframeHeight);
  }

  componentDidUpdate({ breakpointWidth }: PreviewProps): void {
    if (breakpointWidth !== this.props.breakpointWidth) {
      this.panZoom?.reset();
    }
  }

  render(): JSX.Element {
    const { breakpointWidth, html, zoom, rendering, backgroundColour } =
      this.props;
    const { offsetWidth, offsetHeight, resizing, selected, x, y } = this.state;

    const iframeWidth = Math.max(100, breakpointWidth + offsetWidth);
    const iframeHeight = Math.max(100, offsetHeight);

    const iframeStyle = `
    width: ${iframeWidth}px;
    height: ${iframeHeight}px;
    transform: scale(${zoom});
  `;

    const iframeWrapperStyle = `
    width: ${iframeWidth * zoom}px;
    height: ${iframeHeight * zoom}px;
    transform:  translateX(${x}px) translateY(${y}px);
  `;

    return (
      <section class={`preview ${resizing ? "preview--resizing" : ""}`}>
        {rendering && <div class="preview__rendering">Rendering</div>}

        <div
          class="preview__container"
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
            ref={this.previewEl}
            onClick={this.enableSelection}
          >
            <iframe
              class="preview__iframe"
              srcDoc={html}
              style={iframeStyle}
              ref={this.iframeEl}
            />
            <button
              class="preview__iframe_resize preview__iframe_resize--top-left"
              onMouseDown={(event) => this.startResize(DIRECTIONS.NW, event)}
            >
              Resize
            </button>
            <button
              class="preview__iframe_resize preview__iframe_resize--top-right"
              onMouseDown={(event) => this.startResize(DIRECTIONS.NE, event)}
            >
              Resize
            </button>
            <button
              class="preview__iframe_resize preview__iframe_resize--bottom-left"
              onMouseDown={(event) => this.startResize(DIRECTIONS.SE, event)}
            >
              Resize
            </button>
            <button
              class="preview__iframe_resize preview__iframe_resize--bottom-right"
              onMouseDown={(event) => this.startResize(DIRECTIONS.SW, event)}
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
