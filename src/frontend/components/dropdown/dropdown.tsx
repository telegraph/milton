import { h, Component } from "preact";

interface DropdownProps {
  label: string;
  options: { text: string; value: any }[];
  onSelect: (val: any) => void;
  onBlur?: (val: any) => void;
  tooltip?: string;
  activeIndex?: number;
  manualInput?: boolean;
  manualValue?: any;
  showIcon?: boolean;
}

export class Dropdown extends Component<DropdownProps> {
  state = {
    open: false,
  };

  toggleOpen = (): void => this.setState({ open: !this.state.open });

  render() {
    const {
      label,
      tooltip,
      manualValue,
      options,
      onSelect,
      onBlur,
      manualInput = false,
      showIcon = true,
    } = this.props;

    const { open } = this.state;

    return (
      <div class={`dropdown ${open ? "dropdown--open" : ""}`}>
        <button
          class={`dropdown__btn ${open ? "dropdown__btn--active" : ""}`}
          onClick={this.toggleOpen}
          title={tooltip}
        >
          {label} {showIcon && <span class="dropdown__arrow">⌄</span>}
        </button>

        {open && (
          <div class="dropdown__list">
            <div class="dropdown__list_inner">
              {manualInput && (
                <input
                  class="dropdown__input"
                  value={manualValue}
                  onBlur={(event) =>
                    onBlur && onBlur(event.currentTarget.value)
                  }
                />
              )}

              {options.map((option) => (
                <button
                  key={option.text}
                  class="dropdown__option"
                  onClick={() => onSelect(option.value)}
                >
                  {option.text}
                </button>
              ))}
            </div>

            <div class="dropdown__list_modal" onClick={this.toggleOpen}></div>
          </div>
        )}
      </div>
    );
  }
}
