import { h, JSX } from "preact";
import { FigmaFramesType } from "types";
import { STATUS } from "constants";
import {
  actionToggleSelectedFrame,
  actionSetStatus,
  ReducerProps,
} from "../store";

interface FramesProps {
  figmaFrames: FigmaFramesType;
  selectedFrames: string[];
  handleChange: (action: ReducerProps) => void;
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
    <fieldset class="selection">
      <legend>Frames</legend>

      <div class="selection_inner">
        {sizeSortedFrames.map(({ name, id, width, height }) => (
          <label key={id} class="selection__item">
            <input
              class="selection__input"
              type="checkbox"
              checked={selectedFrames.includes(id)}
              onInput={() => handleChange(actionToggleSelectedFrame(id))}
            />

            <span class="selection__name">{name}</span>

            <span class="selection__width">
              {Math.round(width)}x{Math.round(height)}
            </span>
          </label>
        ))}
      </div>

      <button
        class="btn export__generate"
        onClick={() => handleChange(actionSetStatus(STATUS.RENDERING))}
      >
        Update
      </button>
    </fieldset>
  );
}