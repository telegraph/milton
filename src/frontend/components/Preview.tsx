import { actionSetZoom, ActionTypes } from "frontend/actions";
import type { JSX, RefObject } from "preact";
import { h, Component, createRef } from "preact";

enum DIRECTIONS {
  NW = "NW",
  NE = "NE",
  SE = "SE",
  SW = "SW",
}

interface PointerCaptureProps {
  onMove: (x: number, y: number, event: PointerEvent) => void;
  direction?: DIRECTIONS;
  onStart?: (event: PointerEvent) => void;
  onEnd?: (event: PointerEvent) => void;
  onWheel?: (event: WheelEvent) => void;
  className?: string;
}

interface PointerCaptureState {
  x: number;
  y: number;
  startX: number;
  startY: number;
  isActive: boolean;
}

class PointerCapture extends Component<
  PointerCaptureProps,
  PointerCaptureState
> {
  private el: RefObject<HTMLDivElement> = createRef();

  state: PointerCaptureState = {
    x: 0,
    y: 0,
    startX: 0,
    startY: 0,
    isActive: false,
  };

  private pointerMove = (event: PointerEvent) => {
    if (!this.state.isActive) return;

    const { startX, startY } = this.state;
    const { clientX, clientY } = event;
    const { NE, SE, SW } = DIRECTIONS;
    const { direction = SE } = this.props;

    let x = clientX - startX;
    let y = clientY - startY;
    x *= direction === NE || direction === SE ? 1 : -1;
    y *= direction === SE || direction === SW ? 1 : -1;

    this.props.onMove(x, y, event);
  };

  private handlePointerDown = (event: PointerEvent): void => {
    event.stopPropagation();

    if (this.state.isActive) return;

    this.el.current?.setPointerCapture(event.pointerId);
    this.el.current?.addEventListener("pointermove", this.pointerMove);

    if (this.props.onStart) {
      this.props.onStart(event);
    }

    const { clientX, clientY } = event;

    this.setState({
      isActive: true,
      startX: clientX,
      startY: clientY,
    });
  };

  private handlePointerUp = (event: PointerEvent): void => {
    this.el.current?.releasePointerCapture(event.pointerId);
    this.el.current?.removeEventListener("pointermove", this.pointerMove);

    if (this.props.onEnd) {
      this.props.onEnd(event);
    }

    this.setState({ isActive: false });
  };

  render() {
    const { children, className } = this.props;

    return (
      <div
        class={`pointer_capture ${className ? className : ""}`}
        onPointerDown={this.handlePointerDown}
        onPointerUp={this.handlePointerUp}
        onWheel={this.props.onWheel}
        ref={this.el}
      >
        {children}
      </div>
    );
  }
}

interface PreviewProps {
  rendering: boolean;
  html: string;
  responsive: boolean;
  breakpointWidth: number;
  backgroundColour: string;
  selectedFrames: string[];
  zoom: number;
  dispatch: (action: ActionTypes) => void;
}

interface PreviewStateInterface {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  width: number;
  height: number;
  prevWidth: number;
  prevHeight: number;
  selected: boolean;
  panning: boolean;
  spaceDown: boolean;
}

export class Preview extends Component<PreviewProps, PreviewStateInterface> {
  state: PreviewStateInterface = {
    x: 0,
    y: 0,
    prevX: 0,
    prevY: 0,
    width: 0,
    height: 0,
    prevWidth: 0,
    prevHeight: 0,
    selected: true,
    panning: false,
    spaceDown: false,
  };

  previewEl: RefObject<HTMLDivElement> = createRef();
  iframeEl: RefObject<HTMLIFrameElement> = createRef();

  enableSelection = (event: PointerEvent): void => {
    if (event.button === 0 && this.state.spaceDown === false) {
      event.stopPropagation();
      this.setState({ selected: true });
    }
  };

  disableSelection = (): void => {
    this.setState({ selected: false });
  };

  updateIframeHeight = (): void => {
    if (!this.iframeEl.current) return;
    const iframe = this.iframeEl.current;
    const height =
      iframe.contentDocument?.body?.getBoundingClientRect().height ?? 100;

    this.setState({ height, prevHeight: height });
    console.log("iframe height", height);
  };

  resizeMove = (x: number, y: number): void => {
    const { prevWidth, prevHeight } = this.state;
    const { zoom } = this.props;

    this.setState({
      width: prevWidth + (x / zoom) * 2,
      height: prevHeight + (y / zoom) * 2,
    });
  };

  resizeEnd = (): void => {
    const { width, height } = this.state;
    this.setState({ prevWidth: width, prevHeight: height });
  };

  onPan = (x: number, y: number): void => {
    if (this.state.panning) {
      this.setState({ x: x + this.state.prevX, y: y + this.state.prevY });
    }
  };

  panEnd = (): void => {
    if (this.state.panning) {
      this.setState({
        prevX: this.state.x,
        prevY: this.state.y,
        panning: false,
      });
    }
  };

  handlePanZoom = (event: WheelEvent): void => {
    console.log(event, "wheel");
    const { dispatch, zoom } = this.props;
    const { deltaY, ctrlKey } = event;

    const ZOOM_STEP = 0.1;
    let newZoom = deltaY > 0 ? zoom - ZOOM_STEP : zoom + ZOOM_STEP;
    newZoom = Math.max(0.2, newZoom);
    newZoom = Math.min(6, newZoom);

    console.log(newZoom);
    dispatch(actionSetZoom(newZoom));
  };

  handlePointerDown = (event: PointerEvent): void => {
    console.log(event, "pointer down");

    const { button } = event;

    if (button === 0 && this.state.spaceDown) {
      this.setState({ panning: true });
      return;
    }

    if (button === 0 && this.state.selected) {
      this.setState({ selected: false });
      return;
    }

    if (button === 1) {
      this.setState({ panning: true });
      return;
    }
  };

  setSpace = (event: KeyboardEvent): void => {
    const { type, code } = event;

    if (code === "Space") {
      this.setState({ spaceDown: type === "keydown" });
    }
  };

  disablePanning = (event: KeyboardEvent): void => {
    if (this.state.spaceDown === false) return;
    if (this.state.panning) return;

    const { code } = event;

    if (code === "Space") {
      this.setState({ spaceDown: false });
      return;
    }
  };

  componentDidMount(): void {
    window.focus();

    if (!this.iframeEl.current) return;
    this.iframeEl.current.addEventListener("load", this.updateIframeHeight);
    window.addEventListener("keydown", this.setSpace);
    window.addEventListener("keyup", this.setSpace);
  }

  componentWillUnmount(): void {
    window.removeEventListener("keydown", this.setSpace);
    window.removeEventListener("keyup", this.setSpace);

    if (this.iframeEl.current) {
      this.iframeEl.current.removeEventListener(
        "load",
        this.updateIframeHeight
      );
    }
  }

  componentDidUpdate({ breakpointWidth, selectedFrames }: PreviewProps): void {
    if (breakpointWidth !== this.props.breakpointWidth) {
      this.setState({
        panning: false,
        width: 0,
        x: 0,
        y: 0,
      });
    }

    if (selectedFrames.join() !== this.props.selectedFrames.join()) {
      this.setState({
        panning: false,
        width: 0,
        x: 0,
        y: 0,
      });
    }
  }

  render(): JSX.Element {
    const { width, height, selected, x, y, spaceDown, panning } = this.state;
    const { breakpointWidth, html, zoom, rendering, backgroundColour } =
      this.props;

    const iframeWidth = Math.max(100, breakpointWidth + width);
    const iframeHeight = Math.max(100, height);

    console.log(breakpointWidth);

    return (
      <section
        class="preview"
        style={{ background: backgroundColour }}
        data-panning={panning || spaceDown}
      >
        {rendering && <div class="preview__rendering">Rendering</div>}

        <PointerCapture
          onStart={this.handlePointerDown}
          onMove={this.onPan}
          onEnd={this.panEnd}
          onWheel={this.handlePanZoom}
          className="preview__container"
        >
          <div
            class="preview__iframe_wrapper"
            data-active={selected}
            onPointerDown={this.enableSelection}
            style={{
              width: iframeWidth * zoom,
              height: iframeHeight * zoom,
              transform: `translateX(${x}px) translateY(${y}px)`,
            }}
          >
            <iframe
              class="preview__iframe"
              srcDoc={html}
              ref={this.iframeEl}
              style={{
                width: iframeWidth,
                height: iframeHeight,
                transform: `scale(${zoom})`,
              }}
            />

            {Object.values(DIRECTIONS).map((val) => (
              <PointerCapture
                key={val}
                direction={val}
                onMove={this.resizeMove}
                onEnd={this.resizeEnd}
              >
                <button class={`preview__resize preview__resize--${val}`} />
              </PointerCapture>
            ))}

            <p class="preview__dimensions">
              {Math.round(iframeWidth)} x {Math.round(iframeHeight)}
            </p>
          </div>
        </PointerCapture>
      </section>
    );
  }
}
