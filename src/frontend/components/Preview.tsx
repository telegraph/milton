import { STATUS } from "constants";
import type { JSX, RefObject } from "preact";
import { Component, createRef, h } from "preact";
import { AppContext, StateInterface } from "../app_context";

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

export class Preview extends Component<{}, PreviewStateInterface> {
  static contextType = AppContext;
  context!: StateInterface;
  private privateContext!: StateInterface;

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

  getIframeHeight = (): number => {
    let height = 10;

    const iframeBody = this.iframeEl.current?.contentDocument?.body;
    if (iframeBody) {
      height = iframeBody.getBoundingClientRect().height;
    }

    return height;
  };

  updateIframeHeight = (): void => {
    const height = this.getIframeHeight();

    if (height !== this.state.height) {
      this.setState({ height, prevHeight: height });
    }
  };

  resizeMove = (x: number, y: number): void => {
    const { prevWidth, prevHeight } = this.state;
    const { zoom } = this.context;

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
    const { deltaY, deltaX, ctrlKey } = event;
    const { setZoom, zoom } = this.context;

    if (ctrlKey) {
      const ZOOM_STEP = 0.1;
      let newZoom = deltaY > 0 ? zoom - ZOOM_STEP : zoom + ZOOM_STEP;
      newZoom = Math.max(0.2, newZoom);
      newZoom = Math.min(6, newZoom);

      setZoom(newZoom);
    } else {
      const MOVEMENT_IMPEDANCE = 0.6;
      const x = this.state.x - deltaX * MOVEMENT_IMPEDANCE;
      const y = this.state.y - deltaY * MOVEMENT_IMPEDANCE;

      this.setState({ x, y, prevX: x, prevY: y });
    }
  };

  handlePointerDown = (event: PointerEvent): void => {
    const { button } = event;

    if (button === 1) {
      this.setState({ panning: true });
      return;
    }

    if (button === 0 && this.state.spaceDown) {
      this.setState({ panning: true });
      return;
    }

    if (button === 0 && this.state.selected) {
      this.setState({ selected: false });
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

  async componentDidMount() {
    window.focus();
    this.privateContext = this.context;
    this.iframeEl.current?.addEventListener("load", this.updateIframeHeight);
    window.addEventListener("keydown", this.setSpace);
    window.addEventListener("keyup", this.setSpace);
  }

  componentWillUnmount(): void {
    window.removeEventListener("keydown", this.setSpace);
    window.removeEventListener("keyup", this.setSpace);
    this.iframeEl.current?.removeEventListener("load", this.updateIframeHeight);
  }

  async componentDidUpdate(): Promise<void> {
    const { getRenderPropsHash, breakpointWidth } = this.context;
    const newHash = getRenderPropsHash(this.context);
    const oldHash = getRenderPropsHash(this.privateContext);

    if (newHash !== oldHash) {
      this.privateContext = this.context;
      const html = await this.context.getHtml();
      this.iframeEl.current?.setAttribute("srcDoc", html);
    }

    if (breakpointWidth !== this.privateContext.breakpointWidth) {
      const height = this.getIframeHeight();

      this.setState({
        panning: false,
        width: 0,
        x: 0,
        y: 0,
        height,
        prevHeight: this.state.height,
      });

      this.privateContext = this.context;
    }
  }

  render(): JSX.Element {
    const { width, height, selected, x, y, spaceDown, panning } = this.state;
    const { breakpointWidth, status, backgroundColour, zoom, embedUrl } =
      this.context;

    // FIXME: Do we need this?
    const iframeWidth = Math.max(1, breakpointWidth + width);
    const iframeHeight = Math.max(1, height);

    return (
      <section
        class="preview"
        style={{ background: backgroundColour }}
        data-panning={panning || spaceDown}
      >
        {status === STATUS.RENDERING && (
          <div class="preview__rendering">Rendering</div>
        )}

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

            <p class="preview__meta">
              <span class="preview__meta-dimensions">
                {Math.round(iframeWidth)} x {Math.round(iframeHeight)}
              </span>

              {embedUrl && (
                <a href={embedUrl} class="preview__meta--url">
                  {embedUrl}
                </a>
              )}
            </p>
          </div>
        </PointerCapture>
      </section>
    );
  }
}
