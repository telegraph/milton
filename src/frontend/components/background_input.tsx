import throttle from "just-throttle";
import type { JSX } from "preact";
import { Component, Fragment, h } from "preact";
import { HexColorPicker } from "react-colorful";
import { UI_TEXT } from "../../constants";
import { Modal } from "./modal/modal";

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

  debouncedColourChange = throttle(this.handleColourChange, 100);

  render(): JSX.Element {
    const { colour } = this.props;
    const { colourPickerVisible } = this.state;

    return (
      <Fragment>
        {colourPickerVisible && (
          <Modal
            title={UI_TEXT.TITLE_BACKGROUND_MODAL}
            draggable={true}
            onClose={this.closeColourPicker}
          >
            <HexColorPicker
              color={colour}
              onChange={this.debouncedColourChange}
            />
          </Modal>
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
      </Fragment>
    );
  }
}
