import { h } from 'preact';
import type { FrameDataType } from '../ui';
import { FRAME_WARNING_SIZE } from '../constants';
import { FrameContainer } from '../outputRender';

type PreviewProps = {
  frame: FrameDataType;
  render: string | undefined;
};

export function Preview(props: PreviewProps) {
  const { frame, render } = props;
  const { name, width } = frame;

  const renderCharCount = render?.length || 0;
  const fileKbSize = Math.round(renderCharCount / 1000);
  const isFileLarge = fileKbSize > FRAME_WARNING_SIZE;

  return (
    <div class="f2h__preview">
      <h2 class="f2h__preview_title">
        {name} <span class="f2h__preview_width">{width}px</span>{' '}
        <span
          class={
            isFileLarge
              ? 'f2h__file_size f2h__file_size--large'
              : 'f2h__file_size'
          }
        >
          {fileKbSize}kB
        </span>
      </h2>

      {isFileLarge && (
        <p class="f2h__size_warning">
          File size is very large, consider using smaller images and simplier
          shapes
        </p>
      )}

      {render ? (
        <FrameContainer {...frame} svgStr={render} />
      ) : (
        <p class="f2h__preview_loading">Loading...</p>
      )}
    </div>
  );
}
