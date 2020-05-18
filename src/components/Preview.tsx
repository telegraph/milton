import { h } from 'preact';
import type { FrameDataType } from '../ui';

type PreviewProps = {
  frame: FrameDataType;
};

export function Preview(props: PreviewProps) {
  const { frame } = props;
  const { name, width } = frame;

  return (
    <div class="f2h__preview">
      <p>
        {name} <span>{width}px</span>
      </p>
      <div style={`width: ${width}; height: 300px; background: #999;`}></div>
    </div>
  );
}
