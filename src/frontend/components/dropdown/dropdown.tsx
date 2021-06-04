import { h, Component } from "preact";

interface DropdownProps {
  label: string;
  options: { title: string; value: any }[];
  onSelect: (val: any) => void;
  onBlur?: (val: any) => void;
  onOpen?: () => void;
  onClose?: () => void;
  tooltip?: string;
  activeIndex?: number;
  manualInput?: boolean;
  manualValue?: any;
  showIcon?: boolean;
  className?: string;
}

export class Dropdown extends Component<DropdownProps> {
  state = {
    open: false,
  };

  toggleOpen = (): void => {
    const open = !this.state.open;

    if (open && this.props.onOpen) this.props.onOpen();
    if (open === false && this.props.onClose) this.props.onClose();

    this.setState({ open });
  };

  render() {
    const {
      label,
      tooltip,
      manualValue,
      options,
      onSelect,
      onBlur,
      manualInput = false,
      className = "",
      showIcon = true,
    } = this.props;

    const { open } = this.state;

    return (
      <div class={`dropdown ${open ? "dropdown--open" : ""} ${className}`}>
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
                  key={option.title}
                  class="dropdown__option"
                  onClick={() => onSelect(option.value)}
                >
                  {option.title}
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
