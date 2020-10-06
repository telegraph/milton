import { h, Component, createRef, RefObject } from "preact";
import { AppState } from "types";

interface ResponsiveViewProps extends Pick<AppState, "svgMarkup"> {
  frameWidths: number[];
}

export class ResponsiveView extends Component<
  ResponsiveViewProps,
  { widthIndex: number; iframeWidth: number }
> {
  iframeEl: RefObject<HTMLIFrameElement> = createRef();
  inputEl: RefObject<HTMLInputElement> = createRef();
  iframeObserver: MutationObserver | undefined;

  constructor(props: ResponsiveViewProps) {
    super(props);
    const { frameWidths } = props;

    this.state = {
      widthIndex: 0,
      iframeWidth: frameWidths[0],
    };
  }

  componentDidMount(): void {
    if (this.iframeEl.current) {
      this.iframeObserver = new MutationObserver(this.handleResize);

      this.iframeObserver.observe(this.iframeEl.current, {
        attributes: true,
        childList: false,
        subtree: false,
      });
    }
  }

  componentWillUnmount(): void {
    this.iframeObserver?.disconnect();
  }

  handleResize = (mutList: MutationRecord[]): void => {
    for (const { attributeName, type, target } of mutList) {
      if (type === "attributes" && attributeName === "style") {
        const { width } = (target as HTMLIFrameElement).getBoundingClientRect();
        this.setState({ iframeWidth: width });
      }
    }
  };

  setIndex = (i: number): void => {
    this.setState({ widthIndex: i });

    if (this.iframeEl.current) {
      const { frameWidths } = this.props;
      this.iframeEl.current.style.width = `${frameWidths[i]}px`;
    }
  };

  handleInputChange = (): void => {
    if (this.inputEl.current && this.iframeEl.current) {
      const { value } = this.inputEl.current;
      this.iframeEl.current.style.width = `${value}px`;
    }
  };

  render(): h.JSX.Element {
    const { widthIndex, iframeWidth } = this.state;
    const { svgMarkup, frameWidths } = this.props;

    return (
      <div className="f2h__responsive_preview">
        <div className="f2h__responsive_info">
          <p className="f2h__responsive_width">
            <input
              type="number"
              min="1"
              value={iframeWidth}
              ref={this.inputEl}
              onChange={this.handleInputChange}
              className="f2h__responsive_input"
            />
            px
          </p>

          <p className="f2h__responsive_breakpoints">
            Breakpoints
            {frameWidths.map((width, i) => (
              <span
                key={width}
                className={`responsive_width_btn ${
                  widthIndex === i ? "active" : ""
                }`}
                onClick={() => this.setIndex(i)}
              >
                {width}
              </span>
            ))}
          </p>
        </div>

        <div className="f2h__responsive__wrapper">
          <iframe
            style={`width: {frameWidths[widthIndex]}px`}
            width={frameWidths[0]}
            className="f2h__responsive__sandbox"
            srcDoc={svgMarkup}
            ref={this.iframeEl}
          ></iframe>
        </div>
      </div>
    );
  }
}
