import { h } from 'preact';
import type { App, FrameDataType } from '../ui';

type FrameSelectionProps = {
  frames: FrameDataType[];
  handleClick: App['handleFrameSelectionChange'];
  toggleResonsive: App['toggleResonsive'];
};

export function FrameSelection(props: FrameSelectionProps) {
  const { frames, handleClick, toggleResonsive } = props;
  console.log(frames);
  return (
    <div class="f2h__frame_selection">
      {frames.map(({ name, id, width, selected, responsive }) => (
        <p>
          <label class="f2h__label">
            <input
              class="f2h__checkbox"
              type="checkbox"
              checked={selected}
              onClick={() => handleClick(id)}
              id={name}
              name={name}
            />
            {name} <span class="f2h__selection_width">{width}px</span>
          </label>
          <label class="f2h__label">
            <input
              class="f2h__checkbox"
              type="checkbox"
              checked={responsive}
              onClick={() => toggleResonsive(id)}
              id={name}
              name={name}
            />
            Responsive
          </label>
        </p>
      ))}
    </div>
  );
}
