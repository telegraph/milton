import { h, JSX } from "preact";
import { UI_TEXT } from "../../constants";
import { ActionTypes, actionSetBreakpointIndex } from "frontend/actions";
import { Dropdown } from "frontend/components/dropdown/dropdown";

interface BreakpointsProps {
  breakpointIndex: number;
  breakpoints: { width: number; height: number; default?: boolean }[];
  handleChange: (action: ActionTypes) => void;
}

export function Breakpoints({
  breakpoints,
  breakpointIndex,
  handleChange,
}: BreakpointsProps): JSX.Element {
  const breakpointOptions = breakpoints.map((breakpoint, index) => {
    const width = Math.round(breakpoint.width);
    let text = `${width}px - `;
    text += breakpoint.default ? "common" : "frame";

    return { text, value: index };
  });

  const width = Math.round(breakpoints[breakpointIndex]?.width || 0);

  const breakpointLabel = `Select breakpoint: ${width}px`;

  return (
    <div class="zoom">
      <Dropdown
        label={breakpointLabel}
        onSelect={(val: number) => handleChange(actionSetBreakpointIndex(val))}
        options={breakpointOptions}
        tooltip={UI_TEXT.ZOOM_TOOLTIP}
      />
    </div>
  );
}
