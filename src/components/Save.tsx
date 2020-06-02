import { h, Component } from "preact";
import { OUTPUT_FORMATS } from "../constants";
import { renderInline } from "../outputRender";
import type { FrameDataType } from "../ui";

type SaveProps = {
  handleClick: Function;
  outputFormat: OUTPUT_FORMATS;
  frames: FrameDataType[];
};

interface SaveState {
  advancedOpen: boolean;
}

export class Save extends Component<SaveProps, SaveState> {
  state: SaveState = {
    advancedOpen: false,
  };

  toggleAdvancedDisplay = () => {
    this.setState({
      advancedOpen: !this.state.advancedOpen,
    });
  };

  render() {
    const { handleClick, outputFormat, frames } = this.props;
    const { advancedOpen } = this.state;
    const raw = renderInline(frames, outputFormat);

    return (
      <div class="f2h__save">
        <div class="f2h__save_options">
          <button class="f2h__save_btn">Copy embed to clipboard</button>
          <button class="f2h__save_btn">Download iframe HTML file</button>
        </div>

        <h2 class="f2h__save__subhead f2h__save_advanced-header">
          <span class="f2h__save_advanced_title">Advanced settings</span>
          <button class="f2h__save_advanced_show" onClick={this.toggleAdvancedDisplay}>{`${
            advancedOpen ? "hide" : "show"
          }`}</button>
        </h2>

        {advancedOpen && (
          <div class="f2h__save_advanced">
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
        )}
      </div>
    );
  }
}
