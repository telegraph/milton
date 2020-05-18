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
  switch (stage) {
    case STAGES.CHOOSE_FRAMES:
      title = UI_TEXT.TITLE_CHOOSE_FRAME;
      break;

    case STAGES.PREVIEW_OUTPUT:
      title = `${UI_TEXT.TITLE_PREVIEW} ${
        paginationIndex + 1
      } of ${paginationLength}`;
      break;

    case STAGES.SAVE_OUTPUT:
      title = UI_TEXT.TILE_OUTPUT;
      break;
  }

  return (
    <header>
      <h1>{title}</h1>
      <nav>
        {stage !== STAGES.CHOOSE_FRAMES && (
          <button onClick={handleBackClick}>Back</button>
        )}

        {stage !== STAGES.SAVE_OUTPUT && (
          <button onClick={handleNextClick} disabled={disableNext}>
            Next
          </button>
        )}
      </nav>
    </header>
  );
}
