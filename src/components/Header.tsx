import { h, Fragment } from "preact";
import { STAGES, UI_TEXT, FRAME_WARNING_SIZE } from "../constants";
import type { FrameDataType } from "types";

function FrameInfo(props: { frame: FrameDataType | false }) {
  if (!props.frame) return null;

  const {
    name,
    width,
    height,
    svg,
    responsive,
    svgCompressed,
    svgOptimised,
  } = props.frame;

  const renderCharCount =
    (svgOptimised ? svgCompressed?.length : svg?.length) || 0;
  const fileKbSize = renderCharCount / 1000;
  const isFileLarge = fileKbSize > FRAME_WARNING_SIZE;
  let fileSizeClassName = "f2h__file_size";
  if (isFileLarge) {
    fileSizeClassName += " f2h__file_size f2h__notice--error";
  }

  let responsiveClassName = "f2h__info_responsive";
  if (responsive === false) {
    responsiveClassName += " f2h__info_responsive--no";
  }

  return (
    <p class="f2h__info">
      <span class="f2h__info_title">"{name}"</span>{" "}
      <span class="f2h__info_meta">
        {width} x {height}, <span class={responsiveClassName}>responsive</span>,{" "}
        <span class={fileSizeClassName}>{fileKbSize.toPrecision(2)}kB</span>
      </span>
    </p>
  );
}

type HeaderProps = {
  stage: STAGES;
  handleNextClick: () => void;
  handleBackClick: () => void;
  handleOptimseClick: (id: string) => void;
  disableNext: boolean;
  frame: FrameDataType;
};

export function Header(props: HeaderProps) {
  const {
    stage,
    handleBackClick,
    handleNextClick,
    disableNext,
    frame,
    handleOptimseClick,
  } = props;

  let title;
  let nextText;
  let backText;

  switch (stage) {
    case STAGES.CHOOSE_FRAMES:
      title = UI_TEXT.TITLE_CHOOSE_FRAME;
      nextText = UI_TEXT.BUTTON_NEXT;
      backText = UI_TEXT.BUTTON_PREVIOUS;
      break;

    case STAGES.RESPONSIVE_PREVIEW:
      title = UI_TEXT.TITLE_RESPONSIVE_PREVIEW;
      nextText = UI_TEXT.BUTTON_NEXT;
      backText = UI_TEXT.BUTTON_PREVIOUS;
      break;

    case STAGES.PREVIEW_OUTPUT:
      title = `${UI_TEXT.TITLE_PREVIEW}`;
      nextText = UI_TEXT.BUTTON_NEXT;
      backText = UI_TEXT.BUTTON_PREVIOUS;
      break;

    case STAGES.SAVE_OUTPUT:
      title = UI_TEXT.TILE_OUTPUT;
      backText = UI_TEXT.BUTTON_PREVIOUS;
      break;
  }

  return (
    <header class="f2h__header">
      <h1 class="f2h__title">{title}</h1>

      {stage === STAGES.PREVIEW_OUTPUT && (
        <Fragment>
          <FrameInfo frame={frame} />
          <label class="f2h__svg_optimise">
            <input
              type="checkbox"
              checked={frame.svgOptimised}
              name="optimise"
              id="optimise"
              onClick={() => handleOptimseClick(frame.id)}
            />
            <span>Optimise SVG</span>
          </label>
        </Fragment>
      )}

      <nav class="f2h__nav">
        {stage !== STAGES.CHOOSE_FRAMES && (
          <button class="f2h__btn btn--secondary" onClick={handleBackClick}>
            {backText}
          </button>
        )}

        {nextText && (
          <button
            class="f2h__btn btn--primary"
            onClick={handleNextClick}
            disabled={disableNext}
          >
            {nextText}
          </button>
        )}
      </nav>
    </header>
  );
}
