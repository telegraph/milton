import { h, Component, createRef } from "preact";
import type { FrameDataType } from "../ui";
import { FRAME_WARNING_SIZE } from "../constants";
import { FrameContainer } from "../outputRender";

type PreviewProps = {
  frame: FrameDataType;
  windowWidth: number;
  windowHeight: number;
};

type PreviewState = {
  nativeSize: boolean;
};

export class Preview extends Component<PreviewProps, PreviewState> {
  state: PreviewState = {
    nativeSize: true,
  };

  innerEl = createRef<HTMLDivElement>();

  componentDidMount() {
    const { scale } = this.getScale();
    this.setState({ nativeSize: scale >= 1 });
  }

  componentDidUpdate(_previousProps: PreviewProps, previousState: PreviewState) {
    const { nativeSize } = previousState;
    const { scale } = this.getScale();
    const isNativeSize = scale >= 1;

    if (nativeSize !== isNativeSize) {
      this.setState({ nativeSize: isNativeSize });
    }
  }

  getScale = () => {
    const { windowHeight, windowWidth, frame } = this.props;
    const { width, height } = frame;

    // Frames can be larger than Figma's plugin UI window.
    // To allow the user to see the whole frame we need to scale it down to fit
    // TODO: Get real UI header height?
    const WINDOW_HEADER_HEIGHT = 140;
    const heightRatio = (windowHeight - WINDOW_HEADER_HEIGHT) / height;

    const WINDOW_SIDE_MARGINS = 120;
    const widthRatio = (windowWidth - WINDOW_SIDE_MARGINS) / width;

    const smallestRatio = Math.min(heightRatio, widthRatio);

    const scale = smallestRatio < 1 ? smallestRatio : 1;
    const scaledHeight = height * scale;
    const scaledWidth = width * scale;

    return {
      scale,
      scaledHeight,
      scaledWidth,
    };
  };

  toggleZoomed = () => {
    // Reposition inner scroll to ensure transform offset matches top left
    const { current: el } = this.innerEl;
    if (el) {
      el.scrollLeft = 0;
      el.scrollTop = 0;
    } else {
      console.error("Missing preview inner DOM element");
    }

    this.setState({ nativeSize: !this.state.nativeSize });
  };

  render() {
    const { frame } = this.props;
    const { svg } = frame;

    const renderCharCount = svg?.length || 0;
    const fileKbSize = Math.ceil(renderCharCount / 1000);
    const isFileLarge = fileKbSize > FRAME_WARNING_SIZE;

    const { nativeSize } = this.state;
    const { scale, scaledHeight, scaledWidth } = this.getScale();
    const previewWrapperStyles = !nativeSize ? `width: ${scaledWidth}; height: ${scaledHeight};` : "";
    let scaleWarning;

    if (scale < 1) {
      scaleWarning = (
        <p class="f2h__scale_warning f2h__notice--warning">
          {!nativeSize && <span>Zoomed {Math.round(scale * 100)}% to fit view. </span>}
          <label>
            Show native size <input type="checkbox" checked={nativeSize} onClick={this.toggleZoomed} />
          </label>
        </p>
      );
    }

    return (
      <div class="f2h__preview">
        {isFileLarge && (
          <p class="f2h__size_warning f2h__notice--warning">
            File size is very large, consider using smaller images and simplier shapes
          </p>
        )}

        {scaleWarning}

        {svg ? (
          <div
            ref={this.innerEl}
            class={`f2h__preview_inner ${!nativeSize ? "f2h__preview_inner--scaled" : ""}`}
            style={previewWrapperStyles}
          >
            <FrameContainer {...frame} scale={!nativeSize && scale} />
          </div>
        ) : (
          <p class="f2h__preview_loading">Loading...</p>
        )}
      </div>
    );
  }
}
