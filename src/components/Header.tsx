import { h } from 'preact';
import { STAGES, UI_TEXT } from '../constants';
import type { App } from '../ui';

type HeaderProps = {
  stage: STAGES;
  handleNextClick: App['goNext'];
  handleBackClick: App['goBack'];
  disableNext: boolean;
  paginationIndex: number;
  paginationLength: number;
};

export function Header(props: HeaderProps) {
  const {
    stage,
    handleBackClick,
    handleNextClick,
    disableNext,
    paginationIndex,
    paginationLength,
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
      title = `${UI_TEXT.TITLE_PREVIEW} ${
        paginationIndex + 1
      } of ${paginationLength}`;
      nextText = UI_TEXT.BUTTON_NEXT;
      backText = UI_TEXT.BUTTON_PREVIOUS;
      break;

    case STAGES.SAVE_OUTPUT:
      title = UI_TEXT.TILE_OUTPUT;
      nextText = UI_TEXT.BUTTON_DOWNLOAD;
      backText = UI_TEXT.BUTTON_PREVIOUS;
      break;
  }

  return (
    <header class="f2h__header">
      <h1 class="f2h__title">{title}</h1>
      <nav class="f2h__nav">
        {stage !== STAGES.CHOOSE_FRAMES && (
          <button class="f2h__btn btn--secondary" onClick={handleBackClick}>
            {backText}
          </button>
        )}

        <button
          class="f2h__btn btn--primary"
          onClick={handleNextClick}
          disabled={disableNext}
        >
          {nextText}
        </button>
      </nav>
    </header>
  );
}
