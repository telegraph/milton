import { h } from 'preact';
import type { FrameDataType } from '../ui';

type PreviewProps = {
  frame: FrameDataType;
  render: string | undefined;
};

export function Preview(props: PreviewProps) {
  const { frame, render } = props;
  const { name, width } = frame;

  return (
    <div class="f2h__preview">
      <h2 class="f2h__preview_title">
        {name} <span class="f2h__preview_width">{width}px</span>
      </h2>

      {render ? (
        <div
          class="f2h__preview_wrapper"
          dangerouslySetInnerHTML={{ __html: render }}
        />
      ) : (
        '<p class="f2h__preview_loading">Loading...</p>'
      )}
    </div>
  );
}
