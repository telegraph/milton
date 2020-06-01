import { h, Fragment } from "preact";
import type { App, FrameDataType } from "../ui";

type FrameSelectionProps = {
  frames: FrameDataType[];
  handleClick: App["handleFrameSelectionChange"];
  toggleResonsive: App["toggleResonsive"];
};

export function FrameSelection(props: FrameSelectionProps) {
  const { frames, handleClick, toggleResonsive } = props;
  const sizeSorted = [...frames].sort((a, b) => (a.width <= b.width ? -1 : 1));

  return (
    <div class="f2h__frame_selection">
      <p class="f2h__sel_header f2h__sel_header--name">Selected frames</p>
      <p class="f2h__sel_header f2h__sel_header--width">Width</p>
      <p class="f2h__sel_header f2h__sel_header--responsive">Responsive</p>

      {sizeSorted.map(({ name, id, width, selected, responsive }) => (
        <Fragment>
          <label class="f2h__label f2h__label--name">
            <input
              class="f2h__checkbox"
              type="checkbox"
              checked={selected}
              onClick={() => handleClick(id)}
              id={name}
              name={name}
            />
            {name}
          </label>

          <span class="f2h__sel_width">{width}px</span>

          <input
            class="f2h__checkbox f2h__input--responsive"
            type="checkbox"
            checked={responsive}
            onClick={() => toggleResonsive(id)}
            id={name}
            name={name}
          />
        </Fragment>
      ))}
    </div>
  );
}
