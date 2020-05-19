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
      <p>
        {name} <span>{width}px</span>
      </p>

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
