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
  const breakpointOptions = breakpoints.map((breakpoint, i) => ({
    text: `${Math.round(breakpoint.width)}px${
      breakpoint.default ? " default" : ""
    }`,
    value: i,
  }));

  const width = Math.round(breakpoints[breakpointIndex]?.width || 0);

  const breakpointLabel = `Select breakpoint: ${width}px`;

  return (
    <div class="zoom">
      <Dropdown
        label={breakpointLabel}
        handleChange={(val: number) =>
          handleChange(actionSetBreakpointIndex(val))
        }
        options={breakpointOptions}
        tooltip={UI_TEXT.ZOOM_TOOLTIP}
      />
    </div>
  );
}
