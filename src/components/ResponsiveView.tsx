import { h, Component, createRef, RefObject } from "preact";
import { AppState } from "types";

interface ResponsiveViewProps extends Pick<AppState, "svgMarkup"> {
  frameWidths: number[];
}

export class ResponsiveView extends Component<ResponsiveViewProps> {
  iframeEl: RefObject<HTMLIFrameElement> = createRef();

  state = {
    widthIndex: 0,
  };

  setIndex = (i: number) => {
    this.setState({ widthIndex: i });

    if (this.iframeEl.current) {
      const { frameWidths } = this.props;
      this.iframeEl.current.style.width = `${frameWidths[i]}px`;
    }
  };

  render(): h.JSX.Element {
    const { widthIndex } = this.state;
    const { svgMarkup, frameWidths } = this.props;
    const maxWidth = Math.max(...frameWidths);

    return (
      <div className="f2h__responsive_preview">
        {frameWidths.map((width, i) => (
          <p
            className={`responsive_width_btn ${
              widthIndex === i ? "active" : ""
            }`}
            onClick={() => this.setIndex(i)}
            style={`width: ${(width / maxWidth) * 100}%`}
          >
            {width}
          </p>
        ))}

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
