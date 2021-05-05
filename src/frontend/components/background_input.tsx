import { h, Component } from "preact";
import { HexColorPicker } from "react-colorful";
import { debounce } from "../../utils/common";
import { UI_TEXT } from "../../constants";

function cleanColourValue(value: string): string {
  let colour = value.trim().toLocaleUpperCase();

  if (!colour.startsWith("#")) {
    colour = "#" + colour;
  }

  return colour;
}

interface Props {
  colour: string;
  handleChange: (colour: string) => void;
}

interface State {
  colourPickerVisible: boolean;
}

export class BackgroundInput extends Component<Props, State> {
  state: State = {
    colourPickerVisible: false,
  };

  openColourPicker = (): void => {
    this.setState({ colourPickerVisible: true });
  };

  closeColourPicker = (): void => {
    this.setState({ colourPickerVisible: false });
  };

  handleColourChange = (colour: string): void => {
    const newColour = cleanColourValue(colour);
    this.props.handleChange(newColour);
  };

  debouncedColourChange = debounce(this.handleColourChange, 100);

  render() {
    const { colour } = this.props;
    const { colourPickerVisible } = this.state;

    return (
      <div class="side_panel side_panel--background-color">
        <div class="side_panel__row side_panel__row--title">
          {UI_TEXT.TITLE_BACKGROUND_COLOUR}
        </div>

        <div class="side_panel__row side_panel__row--colour">
          {colourPickerVisible && (
            <div class="modal modal--colour-picker">
              <header class="modal_header">
                <span class="modal_title">Background</span>
                <button class="modal_close" onClick={this.closeColourPicker}>
                  x
                </button>
              </header>
              <HexColorPicker
                color={colour}
                onChange={this.debouncedColourChange}
              />
            </div>
          )}

          <button
            class="btn--colour-picker"
            onClick={this.openColourPicker}
            style={`background-color: ${colour};`}
          ></button>

          <input
            id="backgroundColour"
            class="input--text input--text-colour"
            type="text"
            value={colour}
            maxLength={7}
            minLength={4}
            placeholder="#CFCFCF"
            pattern="#[a-fA-F0-9]"
            onFocus={this.closeColourPicker}
            onInput={(e) => this.handleColourChange(e.currentTarget.value)}
            spellcheck={false}
          />
        </div>
      </div>
    );
  }
}
