import { AppContext, StateInterface } from "frontend/app_context";
import throttle from "just-throttle";
import type { JSX } from "preact";
import { Component, h } from "preact";
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

interface State {
  colourPickerVisible: boolean;
  active: boolean;
}

export class BackgroundInput extends Component<{}, State> {
  static contextType = AppContext;
  context!: StateInterface;

  state: State = {
    colourPickerVisible: false,
    active: false,
  };

  openColourPicker = (): void => {
    this.setState({ active: true, colourPickerVisible: true });
  };

  closeColourPicker = (): void => {
    this.setState({ colourPickerVisible: false, active: false });
  };

  handleFocus = (): void => {
    this.setState({
      colourPickerVisible: false,
      active: true,
    });
  };

  handleColourChange = (colour: string): void => {
    const newColour = cleanColourValue(colour);
    this.context.setBackgroundColour(newColour);

    if (this.state.colourPickerVisible === false) {
      this.setState({ active: false });
    }
  };

  debouncedColourChange = throttle(this.handleColourChange, 100);

  render(): JSX.Element {
    const { backgroundColour } = this.context;
    const { colourPickerVisible, active } = this.state;

    return (
      <div class="colour_picker" data-active={active}>
        {colourPickerVisible && (
          <Modal
            title={UI_TEXT.TITLE_BACKGROUND_MODAL}
            draggable={true}
            onClose={this.closeColourPicker}
          >
            <HexColorPicker
              color={backgroundColour}
              onChange={this.debouncedColourChange}
            />
          </Modal>
        )}

        <button
          class="btn--colour-picker"
          onClick={this.openColourPicker}
          style={`background-color: ${backgroundColour};`}
        ></button>

        <div
          contentEditable={true}
          class="input input--textbox input--textbox--colour"
          id="backgroundColour"
          data-empty={!backgroundColour}
          data-placeholder={UI_TEXT.BACKGROUND_COLOUR_PLACEHOLDER}
          onFocus={this.handleFocus}
          onBlur={({ currentTarget }) =>
            this.handleColourChange(currentTarget.innerText.trim())
          }
          spellcheck={false}
          dangerouslySetInnerHTML={{ __html: backgroundColour }}
        />
      </div>
    );
  }
}
