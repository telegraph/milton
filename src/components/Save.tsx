import { h } from 'preact';
import { OUTPUT_FORMATS } from '../constants';
import { renderInline } from '../outputRender';
import type { AppState } from '../ui';

type SaveProps = {
  handleClick: Function;
  outputFormat: OUTPUT_FORMATS;
  frames: AppState['frames'];
  renders: AppState['renders'];
};

export function Save(props: SaveProps) {
  const { handleClick, outputFormat, renders, frames } = props;

  const raw = renderInline(frames, renders, outputFormat);

  return (
    <div class="f2h__save">
      <p class="f2h__save_intro">
        Save output as either inline HTML for an iframe.
      </p>
      <p class="f2h__save_intro">
        You can copy the raw HTML or download an index.html file.
      </p>

      <h2 class="f2h__save__subhead">Format</h2>

      <label for="f2h__input_inline" class="f2h__label">
        <input
          class="f2h__radio_btn"
          type="radio"
          name="inline"
          id="f2h__input_inline"
          value={OUTPUT_FORMATS.INLINE}
          checked={outputFormat === OUTPUT_FORMATS.INLINE}
          onClick={() => handleClick(OUTPUT_FORMATS.INLINE)}
        />
        Inline (default)
      </label>

      <label for="f2h__input_iframe" class="f2h__label">
        <input
          class="f2h__radio_btn"
          type="radio"
          name="iframe"
          id="f2h__input_iframe"
          value={OUTPUT_FORMATS.IFRAME}
          checked={outputFormat === OUTPUT_FORMATS.IFRAME}
          onClick={() => handleClick(OUTPUT_FORMATS.IFRAME)}
        />
        iFrame
      </label>

      <h2 class="f2h__save__subhead">Raw HTML</h2>
      <textarea class="f2h__save__raw" value={raw}></textarea>
    </div>
  );
}
