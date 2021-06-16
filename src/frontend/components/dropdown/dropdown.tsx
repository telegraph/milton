import { Component, h } from "preact";

interface DropdownProps {
  label: string;
  options: { title: string; value: number | string; className?: string }[];
  onSelect?: (val: number | string) => void;
  onBlur?: (val: string) => void;
  onOpen?: () => void;
  onClose?: () => void;
  tooltip?: string;
  activeIndex?: number;
  manualInput?: boolean;
  manualValue?: string;
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
      activeIndex,
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

              {options.map((option, index) => (
                <button
                  key={option.title}
                  class={`dropdown__option ${
                    option.className ? option.className : ""
                  }`}
                  onClick={() => onSelect && onSelect(option.value)}
                  data-active={index === activeIndex}
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
