import { FrameDataInterface } from "types";
import { h, JSX } from "preact";
import { UI_TEXT } from "../../constants";
import { Dropdown } from "frontend/components/dropdown/dropdown";
import { ActionTypes, actionSetBreakpoint } from "frontend/actions";

const DEFAULT_BREAKPOINTS = [
  { value: 320, title: "mobile" },
  { value: 480, title: "large mobile" },
  { value: 640, title: "tablet" },
  { value: 720, title: "iPad" },
  { value: 1024, title: "laptop" },
  { value: 1200, title: "desktop" },
];

interface BreakpointsProps {
  breakpointWidth: number;
  outputFrames: FrameDataInterface[];
  handleChange: (action: ActionTypes) => void;
}

export function Breakpoints({
  outputFrames,
  breakpointWidth,
  handleChange,
}: BreakpointsProps): JSX.Element {
  let breakpointOptions: { value: number; title: string }[] = [];

  for (const { width } of outputFrames) {
    const optionItem = { value: width, title: `Frame ${width}px` };
    breakpointOptions.push(optionItem);
  }

  breakpointOptions = breakpointOptions.concat(DEFAULT_BREAKPOINTS);

  const breakpointLabel = `Select breakpoint: ${breakpointWidth}px`;

  return (
    <div class="breakpoints">
      <Dropdown
        label={breakpointLabel}
        onSelect={(val: number) => handleChange(actionSetBreakpoint(val))}
        options={breakpointOptions}
        tooltip={UI_TEXT.ZOOM_TOOLTIP}
      />
    </div>
  );
}
