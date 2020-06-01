import { h, Fragment } from "preact";
import type { App, FrameDataType } from "../ui";

type FrameSelectionProps = {
  frames: FrameDataType[];
  handleClick: App["handleFrameSelectionChange"];
  toggleResonsive: App["toggleResonsive"];
  toggleSelectAll: App["toggleSelectAll"];
  toggleResponsiveAll: App["toggleResponsiveAll"];
};

export function FrameSelection(props: FrameSelectionProps) {
  const { frames, handleClick, toggleResonsive, toggleSelectAll, toggleResponsiveAll } = props;

  const selectedCount = frames.filter((frame) => frame.selected).length;
  const someFramesSelected = selectedCount > 0 && selectedCount < frames.length;
  const allSelected = selectedCount === frames.length;

  const responsiveCount = frames.filter((frame) => frame.responsive).length;
  const someResponsiveSelected = responsiveCount > 0 && responsiveCount < frames.length;
  const allResponsiveSelected = responsiveCount === frames.length;

  return (
    <div class="f2h__frame_selection">
      <p class="f2h__sel_header f2h__sel_header--name">
        Selected frames{" "}
        <input
          name="selectAll"
          id="selectAll"
          type="checkbox"
          onClick={toggleSelectAll}
          checked={allSelected}
          ref={(el) => el && (el.indeterminate = someFramesSelected)}
        />
      </p>
      <p class="f2h__sel_header f2h__sel_header--width">Width</p>
      <p class="f2h__sel_header f2h__sel_header--responsive">
        Responsive{" "}
        <input
          type="checkbox"
          id="responsiveAll"
          name="responsiveAll"
          onClick={toggleResponsiveAll}
          checked={allResponsiveSelected}
          ref={(el) => el && (el.indeterminate = someResponsiveSelected)}
        />
      </p>

      {frames.map(({ name, id, width, selected, responsive }) => (
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
