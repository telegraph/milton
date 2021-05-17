import { h, JSX } from "preact";
import { FigmaFramesType } from "types";

import { actionToggleSelectedFrame, ActionTypes } from "../actions";

interface FramesProps {
  figmaFrames: FigmaFramesType;
  selectedFrames: string[];
  handleChange: (action: ActionTypes) => void;
}

export function Frames({
  figmaFrames,
  selectedFrames,
  handleChange,
}: FramesProps): JSX.Element {
  const sizeSortedFrames = Object.values(figmaFrames).sort((a, b) =>
    a.width > b.width ? 1 : -1
  );

  return (
    <div class="side_panel selection">
      <div class="side_panel__row side_panel__row--title">Frames selected</div>

      {sizeSortedFrames.map(({ name, id }) => (
        <div
          key={id}
          class="side_panel__row side_panel__row--input selection__item"
          data-active={selectedFrames.includes(id)}
        >
          <label
            key={id}
            for={id}
            class="input__label"
            data-active={selectedFrames.includes(id)}
          >
            {name}
          </label>

          <input
            id={id}
            class="input__checkbox"
            type="checkbox"
            checked={selectedFrames.includes(id)}
            onInput={() => handleChange(actionToggleSelectedFrame(id))}
          />
        </div>
      ))}
    </div>
  );
}
