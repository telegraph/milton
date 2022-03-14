import type { JSX, RefObject } from "preact";
import { Component, h, createRef } from "preact";
import { AppContext, StateInterface } from "frontend/app_context";
import ColorPicker from "simple-color-picker";
import { UI_TEXT } from "../../constants";

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

  colourPicker: ColorPicker = new ColorPicker();
  colourPickerEl: RefObject<HTMLDivElement> = createRef();

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

  handleColourChange = (): void => {
    const newColour = cleanColourValue(this.colourPicker.getHexString());
    this.context.setBackgroundColour(newColour);

    if (this.state.colourPickerVisible === false) {
      this.setState({ active: false });
    }
  };

  componentDidMount() {
    if (this.colourPickerEl.current) {
      const { backgroundColour } = this.context;

      this.colourPicker.setColor(backgroundColour);
      this.colourPicker.appendTo(this.colourPickerEl.current);
      this.colourPicker.onChange(this.handleColourChange);
    }
  }

  componentWillUnmount() {
    this.colourPicker.remove();
  }

  render(): JSX.Element {
    const { backgroundColour } = this.context;
    const { active, colourPickerVisible } = this.state;

    return (
      <div class="colour_picker" data-active={active}>
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
          data-placeholder={UI_TEXT.PLACEHOLDER_BACKGROUND_COLOUR}
          onFocus={this.handleFocus}
          onBlur={({ currentTarget }) =>
            this.handleColourChange(currentTarget.innerText.trim())
          }
          spellcheck={false}
          dangerouslySetInnerHTML={{ __html: backgroundColour }}
        />

        <div
          class="colour_picker__picker"
          ref={this.colourPickerEl}
          data-active={colourPickerVisible}
        >
          <div
            class="colour_picker__close"
            onClick={this.closeColourPicker}
          ></div>
        </div>
      </div>
    );
  }
}
