import type { JSX, RefObject } from "preact";
import { h, Component, createRef } from "preact";

enum DIRECTIONS {
  NW = "NW",
  NE = "NE",
  SE = "SE",
  SW = "SW",
}

interface PointerCaptureProps {
  onMove: (x: number, y: number) => void;
  direction?: DIRECTIONS;
  onEnd?: () => void;
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

    console.log(x, direction);

    this.props.onMove(x, y);
  };

  private handlePointerDown = (event: PointerEvent): void => {
    event.stopPropagation();
    const { clientX, clientY, button } = event;

    console.log("in here", button);
    if (button !== 0) return;

    this.el.current?.setPointerCapture(event.pointerId);
    this.el.current?.addEventListener("pointermove", this.pointerMove);

    this.setState({
      isActive: true,
      startX: clientX,
      startY: clientY,
    });
  };

  private handlePointerUp = (event: PointerEvent): void => {
    this.el.current?.releasePointerCapture(event.pointerId);
    this.el.current?.removeEventListener("pointermove", this.pointerMove);

    this.setState({ isActive: false });
    this.props.onEnd && this.props.onEnd();
  };

  render() {
    const { children, className } = this.props;

    return (
      <div
        class={`pointer_capture ${className ? className : ""}`}
        onPointerDown={this.handlePointerDown}
        onPointerUp={this.handlePointerUp}
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
  zoom: number;
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
  };

  previewEl: RefObject<HTMLDivElement> = createRef();
  iframeEl: RefObject<HTMLIFrameElement> = createRef();

  enableSelection = (): void => this.setState({ selected: true });

  disableSelection = (): void => this.setState({ selected: false });

  updateIframeHeight = (): void => {
    if (!this.iframeEl.current) return;
    const iframe = this.iframeEl.current;
    const height =
      iframe.contentDocument?.body?.getBoundingClientRect().height ?? 100;

    this.setState({ height, prevHeight: height });
  };

  resizeMove = (x: number, y: number) => {
    const { prevWidth, prevHeight } = this.state;
    const { zoom } = this.props;

    this.setState({
      width: prevWidth + (x / zoom) * 2,
      height: prevHeight + (y / zoom) * 2,
    });
  };

  resizeEnd = () => {
    const { width, height } = this.state;
    this.setState({ prevWidth: width, prevHeight: height });
  };

  onPan = (x: number, y: number) =>
    this.setState({ x: x + this.state.prevX, y: y + this.state.prevY });

  panEnd = () => this.setState({ prevX: this.state.x, prevY: this.state.y });

  componentDidMount(): void {
    if (!this.previewEl.current || !this.iframeEl.current) return;

    this.iframeEl.current.addEventListener("load", this.updateIframeHeight);
  }

  componentWillUnmount(): void {
    if (!this.previewEl.current || !this.iframeEl.current) return;
    this.iframeEl.current?.removeEventListener("load", this.updateIframeHeight);
  }

  componentDidUpdate({ breakpointWidth }: PreviewProps): void {
    if (breakpointWidth !== this.props.breakpointWidth) {
    }
  }

  render(): JSX.Element {
    const { width, height, selected, x, y } = this.state;
    const { breakpointWidth, html, zoom, rendering, backgroundColour } =
      this.props;

    const iframeWidth = Math.max(100, breakpointWidth + width);
    const iframeHeight = Math.max(100, height);

    return (
      <section class="preview" style={{ background: backgroundColour }}>
        {rendering && <div class="preview__rendering">Rendering</div>}

        <PointerCapture
          onMove={this.onPan}
          onEnd={this.panEnd}
          className="preview__container"
        >
          <div
            class="preview__iframe_wrapper"
            data-active={selected}
            style={{
              width: iframeWidth * zoom,
              height: iframeHeight * zoom,
              transform: `translateX(${x}px) translateY(${y}px)`,
            }}
            onClick={this.enableSelection}
          >
            <iframe
              class="preview__iframe"
              srcDoc={html}
              style={{
                width: iframeWidth,
                height: iframeHeight,
                transform: `scale(${zoom})`,
              }}
              ref={this.iframeEl}
            />

            <PointerCapture
              direction={DIRECTIONS.NW}
              onMove={this.resizeMove}
              onEnd={this.resizeEnd}
            >
              <button class="preview__iframe_resize preview__iframe_resize--NW">
                RESIZE NW
              </button>
            </PointerCapture>

            <PointerCapture
              direction={DIRECTIONS.NE}
              onMove={this.resizeMove}
              onEnd={this.resizeEnd}
            >
              <button class="preview__iframe_resize preview__iframe_resize--NE">
                RESIZE NE
              </button>
            </PointerCapture>

            <PointerCapture
              direction={DIRECTIONS.SE}
              onMove={this.resizeMove}
              onEnd={this.resizeEnd}
            >
              <button class="preview__iframe_resize preview__iframe_resize--SE">
                RESIZE SE
              </button>
            </PointerCapture>

            <PointerCapture
              direction={DIRECTIONS.SW}
              onMove={this.resizeMove}
              onEnd={this.resizeEnd}
            >
              <button class="preview__iframe_resize preview__iframe_resize--SW">
                RESIZE SW
              </button>
            </PointerCapture>

            <p class="preview__dimensions">
              {Math.round(iframeWidth)} x {Math.round(iframeHeight)}
            </p>
          </div>
        </PointerCapture>
      </section>
    );
  }
}
