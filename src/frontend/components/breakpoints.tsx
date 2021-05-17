import { FrameDataInterface } from "types";
import { h, JSX } from "preact";
import { UI_TEXT, DEFAULT_BREAKPOINTS } from "../../constants";
import { Dropdown } from "frontend/components/dropdown/dropdown";
import { ActionTypes, actionSetBreakpoint } from "frontend/actions";

interface BreakpointsProps {
  breakpointIndex: number;
  outputFrames: FrameDataInterface[];
  handleChange: (action: ActionTypes) => void;
}

export function Breakpoints({
  outputFrames,
  breakpointIndex,
  handleChange,
}: BreakpointsProps): JSX.Element {
  const breakpoints = [
    ...outputFrames.map(({ width, height }) => ({
      width,
      height,
      default: false,
    })),
    ...DEFAULT_BREAKPOINTS,
  ];

  const breakpointOptions = breakpoints.map((breakpoint, index) => {
    const width = Math.round(breakpoint.width);
    let text = `${width}px `;
    text += breakpoint.default ? "" : "frame";

    return { text, value: index };
  });

  const width = Math.round(breakpoints[breakpointIndex]?.width || 0);
  const breakpointLabel = `Select breakpoint: ${width}px`;

  return (
    <div class="breakpoints">
      <Dropdown
        label={breakpointLabel}
        onSelect={(val: number) => {
          handleChange(actionSetBreakpoint(val, breakpoints[val].width));
        }}
        options={breakpointOptions}
        tooltip={UI_TEXT.ZOOM_TOOLTIP}
      />
    </div>
  );
}
