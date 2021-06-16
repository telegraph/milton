import { actionSetBreakpoint, ActionTypes } from "frontend/actions";
import { Dropdown } from "frontend/components/dropdown/dropdown";
import { h, JSX } from "preact";
import { FrameDataInterface } from "types";
import { UI_TEXT } from "../../constants";

const DEFAULT_BREAKPOINTS = [
  { value: 304, title: "Article mobile" },
  { value: 456, title: "Article tablet" },
  { value: 712, title: "Article desktop" },
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
  let breakpointOptions: {
    value: number;
    title: string;
    className?: string;
  }[] = [];

  for (const { width } of outputFrames) {
    const optionItem = {
      value: width,
      title: `Frame ${width}px`,
      className: "frame_width",
    };
    breakpointOptions.push(optionItem);
  }

  breakpointOptions = breakpointOptions.sort((a, b) => {
    return a.value > b.value ? 1 : -1;
  });

  breakpointOptions = breakpointOptions.concat(DEFAULT_BREAKPOINTS);

  const breakpointLabel = `${UI_TEXT.LABEL_BREAKPOINTS} ${breakpointWidth}px`;

  const activeIndex = breakpointOptions.findIndex(
    ({ value }) => value === breakpointWidth
  );

  return (
    <div class="breakpoints">
      <Dropdown
        label={breakpointLabel}
        onSelect={(val: number) => handleChange(actionSetBreakpoint(val))}
        options={breakpointOptions}
        tooltip={UI_TEXT.ZOOM_TOOLTIP}
        activeIndex={activeIndex}
      />
    </div>
  );
}
