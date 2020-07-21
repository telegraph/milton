import { h, Component, createRef } from "preact";
import { renderInline } from "../outputRender";
import { OUTPUT_FORMATS } from "../constants";
import { FrameDataInterface, AppState } from "types";

interface ResponsiveViewProps
  extends Pick<AppState, "source" | "headline" | "subhead" | "svgMarkup"> {
  frames: FrameDataInterface[];
}

export class ResponsiveView extends Component<ResponsiveViewProps> {
  render(): h.JSX.Element {
    const { svgMarkup } = this.props;

    return (
      <div className="f2h__responsive_preview">
        <p>Use the window below to test how the frames behave when resizing.</p>

        <div className="f2h__responsive__wrapper">
          <iframe
            className="f2h__responsive__sandbox"
            srcDoc={svgMarkup}
          ></iframe>
        </div>
      </div>
    );
  }
}
