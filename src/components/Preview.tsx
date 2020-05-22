import { h } from 'preact';
import type { FrameDataType } from '../ui';
import { FRAME_WARNING_SIZE } from '../constants';
import { FrameContainer } from '../outputRender';

type PreviewProps = {
  frame: FrameDataType;
};

export function Preview(props: PreviewProps) {
  const { frame } = props;
  const { name, width, svg } = frame;

  const renderCharCount = svg?.length || 0;
  const fileKbSize = Math.ceil(renderCharCount / 1000);
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

      {svg ? (
        <FrameContainer {...frame} />
      ) : (
        <p class="f2h__preview_loading">Loading...</p>
      )}
    </div>
  );
}
