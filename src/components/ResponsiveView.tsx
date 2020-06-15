import { h } from "preact";
import { renderInline } from "../outputRender";
import { OUTPUT_FORMATS } from "../constants";
import { FrameDataInterface, AppState } from "types";

interface ResponsiveViewProps
  extends Pick<
    AppState,
    "source" | "headline" | "subhead" | "windowWidth" | "windowHeight"
  > {
  frames: FrameDataInterface[];
}

export function ResponsiveView(props: ResponsiveViewProps): h.JSX.Element {
  const {
    frames,
    headline,
    subhead,
    source,
    windowHeight,
    windowWidth,
  } = props;

  const maxWidth = Math.max(...frames.map((f) => f.width));
  const maxHeight = Math.max(...frames.map((f) => f.height));
  const minWidth = Math.min(windowWidth - 100, maxWidth);
  const minHeight = Math.min(windowHeight - 160, maxHeight);

  const rawHtml = renderInline({
    frames,
    iframe: OUTPUT_FORMATS.IFRAME,
    headline,
    subhead,
    source,
  });

  return (
    <div className="f2h__responsive_preview">
      <p>Use the window below to test how the frames behave when resizing.</p>

      <div className="f2h__responsive__wrapper">
        <iframe
          style={`height: ${minHeight}px; width: ${minWidth}px;`}
          className="f2h__responsive__sandbox"
          srcDoc={rawHtml}
        ></iframe>
      </div>
    </div>
  );
}
