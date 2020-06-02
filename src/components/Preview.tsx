import { h } from "preact";
import type { FrameDataType } from "../ui";
import { FRAME_WARNING_SIZE } from "../constants";
import { FrameContainer } from "../outputRender";

type PreviewProps = {
  frame: FrameDataType;
  windowWidth: number;
  windowHeight: number;
};

export function Preview(props: PreviewProps) {
  const { frame, windowHeight, windowWidth } = props;
  const { name, width, height, svg, responsive } = frame;

  // Frames can be larger than Figma's plugin UI window.
  // To allow the user to see the whole frame we need to scale it down to fit
  // TODO: Get real UI header height?
  const WINDOW_HEADER_HEIGHT = 200;
  const heightRatio = (windowHeight - WINDOW_HEADER_HEIGHT) / height;

  const WINDOW_SIDE_MARGINS = 80;
  const widthRatio = (windowWidth - WINDOW_SIDE_MARGINS) / width;

  const smallestRatio = Math.min(heightRatio, widthRatio);

  const scale = smallestRatio < 1 ? smallestRatio : 1;
  const scaledHeight = height * scale;
  const scaledWidth = width * scale;

  const previewWrapperStyles = `width: ${scaledWidth}; height: ${scaledHeight};`;

  const renderCharCount = svg?.length || 0;
  const fileKbSize = Math.ceil(renderCharCount / 1000);
  const isFileLarge = fileKbSize > FRAME_WARNING_SIZE;

  return (
    <div class="f2h__preview">
      <h2 class="f2h__preview_title">
        <span class="f2h__preview_name">{name}</span>
        {responsive && <span class="f2h__preview_responsive">responsive</span>}
        <span class="f2h__preview_width">{width}px</span>{" "}
        <span class={isFileLarge ? "f2h__file_size f2h__file_size--large" : "f2h__file_size"}>{fileKbSize}kB</span>
      </h2>

      {isFileLarge && (
        <p class="f2h__size_warning">File size is very large, consider using smaller images and simplier shapes</p>
      )}

      {svg ? (
        <div style={previewWrapperStyles}>
          <FrameContainer {...frame} scale={scale} />
        </div>
      ) : (
        <p class="f2h__preview_loading">Loading...</p>
      )}
    </div>
  );
}
