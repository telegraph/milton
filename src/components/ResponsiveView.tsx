import { h } from 'preact';
import { renderInline } from '../outputRender';
import { OUTPUT_FORMATS } from '../constants';
import type { AppState } from '../ui';

type ResponsiveViewProps = {
  frames: AppState['frames'];
  renders: AppState['renders'];
  responsive: boolean;
};

export function ResponsiveView(props: ResponsiveViewProps) {
  const { frames, renders, responsive } = props;

  const width = frames.reduce((p, { width }) => (width > p ? width : p), 0);
  const height = frames.reduce((p, { height }) => (height > p ? height : p), 0);

  const rawHtml = renderInline(
    frames,
    renders,
    OUTPUT_FORMATS.IFRAME,
    responsive
  );

  return (
    <div class="f2h__responsive_preview">
      <p>Use the window below to test how the frames behave when resizing.</p>

      <div class="f2h__responsive__wrapper">
        <div class="f2h__ruler">
          <div class="f2h__ruler_break f2h__ruler_break--0"></div>
          <div class="f2h__ruler_break f2h__ruler_break--1"></div>
          <div class="f2h__ruler_break f2h__ruler_break--2"></div>
        </div>

        <iframe
          style={`height: ${height}px; width: ${width}px;`}
          class="f2h__responsive__sandbox"
          scrolling="no"
          srcdoc={rawHtml}
          sandbox=""
        ></iframe>
      </div>
    </div>
  );
}
