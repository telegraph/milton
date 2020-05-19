import { h } from 'preact';
import type { App, AppState, FrameDataType } from '../ui';

type FrameSelectionProps = {
  frames: FrameDataType[];
  selections: AppState['selectedFrames'];
  handleClick: App['handleFrameSelectionChange'];
};

export function FrameSelection(props: FrameSelectionProps) {
  const { frames, selections, handleClick } = props;

  const sortedFrames = [...frames].sort((a, b) => {
    return a.width < b.width ? -1 : 1;
  });

  return (
    <div class="f2h__frame_selection">
      {sortedFrames.map(({ name, id, width }) => (
        <label class="f2h__label" for={name}>
          <input
            class="f2h__checkbox"
            type="checkbox"
            key={name}
            value={name}
            checked={selections.includes(id)}
            onClick={() => handleClick(id)}
            id={name}
            name={name}
          />
          {name} <span class="f2h__selection_width">{width}px</span>
        </label>
      ))}
    </div>
  );
}
