import { h } from "preact";
import { STAGES, UI_TEXT, FRAME_WARNING_SIZE } from "../constants";
import type { App, FrameDataType } from "../ui";

function FrameInfo(props: { frame: FrameDataType | false }) {
  if (!props.frame) return null;

  const { name, width, height, svg, responsive } = props.frame;
  const renderCharCount = svg?.length || 0;
  const fileKbSize = Math.ceil(renderCharCount / 1000);
  const isFileLarge = fileKbSize > FRAME_WARNING_SIZE;

  return (
    <p class="f2h__info">
      <span class="f2h__info_title">"{name}"</span>{" "}
      <span class="f2h__info_meta">
        {width} x {height},{" "}
        <span class={`f2h__info_responsive ${responsive ? "" : "f2h__info_responsive--no"}`}>responsive</span>,{" "}
        <span class={isFileLarge ? "f2h__file_size f2h__notice--error" : "f2h__file_size"}>{fileKbSize}kB</span>
      </span>
    </p>
  );
}

type HeaderProps = {
  stage: STAGES;
  handleNextClick: App["goNext"];
  handleBackClick: App["goBack"];
  disableNext: boolean;
  frame: FrameDataType;
};

export function Header(props: HeaderProps) {
  const { stage, handleBackClick, handleNextClick, disableNext, frame } = props;

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

      {stage === STAGES.PREVIEW_OUTPUT && <FrameInfo frame={frame} />}

      <nav class="f2h__nav">
        {stage !== STAGES.CHOOSE_FRAMES && (
          <button class="f2h__btn btn--secondary" onClick={handleBackClick}>
            {backText}
          </button>
        )}

        {nextText && (
          <button class="f2h__btn btn--primary" onClick={handleNextClick} disabled={disableNext}>
            {nextText}
          </button>
        )}
      </nav>
    </header>
  );
}
