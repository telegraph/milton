import { AppContext } from "frontend/app_context";
import {
  Dropdown,
  DropdownOption,
} from "frontend/components/dropdown/dropdown";
import { h, JSX } from "preact";
import { FrameDataInterface } from "types";
import { UI_TEXT } from "../../constants";

const DEFAULT_BREAKPOINTS = [
  { value: 304, title: "Article mobile" },
  { value: 456, title: "Article tablet" },
  { value: 712, title: "Article desktop" },
];

function breakpointOptions(frames: FrameDataInterface[]) {
  let breakpointOptions: DropdownOption[] = [];

  for (const { width: value } of frames) {
    const title = `Frame ${value}px`;
    const optionItem = { value, title, className: "frame_width" };
    breakpointOptions.push(optionItem);
  }

  breakpointOptions = breakpointOptions.sort((a, b) => {
    return a.value > b.value ? 1 : -1;
  });

  return breakpointOptions.concat(DEFAULT_BREAKPOINTS);
}

export function Breakpoints(): JSX.Element {
  return (
    <div class="breakpoints">
      <AppContext.Consumer>
        {({ breakpointWidth, setBreakpointWidth, getOutputFrames }) => {
          const outputFrames = getOutputFrames();
          const breakpoints = breakpointOptions(outputFrames);
          const activeIndex = breakpoints.findIndex(
            ({ value }) => value === breakpointWidth
          );

          return (
            <Dropdown
              label={`${UI_TEXT.LABEL_BREAKPOINTS} ${breakpointWidth}px`}
              onSelect={(val) => setBreakpointWidth(val)}
              options={breakpoints}
              tooltip={UI_TEXT.ZOOM_TOOLTIP}
              activeIndex={activeIndex}
            />
          );
        }}
      </AppContext.Consumer>
    </div>
  );
}
