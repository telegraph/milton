import { h, Component, JSX } from "preact";
import { UI_TEXT } from "../../constants";
import { ActionTypes, actionSetZoom } from "frontend/actions";
import { Dropdown } from "frontend/components/dropdown/dropdown";

enum KEYS {
  ZOOM_IN = "Equal",
  ZOOM_OUT = "Minus",
}

interface ZoomProps {
  zoom: number;
  handleChange: (action: ActionTypes) => void;
}

export class Zoom extends Component<ZoomProps> {
  ZOOM_STEPS = 2;
  ZOOM_MIN = 0.015625;
  ZOOM_MAX = 100;

  handleKeyboardInput = ({ code }: KeyboardEvent): void => {
    const { handleChange, zoom } = this.props;

    if (code === KEYS.ZOOM_IN) {
      const newZoom = Math.min(zoom * this.ZOOM_STEPS, this.ZOOM_MAX);
      handleChange(actionSetZoom(newZoom));
    }

    if (code === KEYS.ZOOM_OUT) {
      const newZoom = Math.max(this.ZOOM_MIN, zoom / this.ZOOM_STEPS);
      handleChange(actionSetZoom(newZoom));
    }
  };

  componentDidMount(): void {
    window.addEventListener("keydown", this.handleKeyboardInput);
  }

  componentWillUnmount(): void {
    window.removeEventListener("keydown", this.handleKeyboardInput);
  }

  render(): JSX.Element {
    const { handleChange, zoom } = this.props;
    const zoomLabel = `${(zoom * 100).toFixed(0)}%`;
    const zoomOptions = [
      {
        text: "Zoom in +",
        value: Math.min(zoom * this.ZOOM_STEPS, this.ZOOM_MAX),
      },
      {
        text: "Zoom out -",
        value: Math.max(this.ZOOM_MIN, zoom / this.ZOOM_STEPS),
      },
      { text: "Zoom 100%", value: 1 },
    ];

    return (
      <div class="zoom">
        <Dropdown
          label={zoomLabel}
          onSelect={(val: number) => handleChange(actionSetZoom(val))}
          options={zoomOptions}
          tooltip={UI_TEXT.ZOOM_TOOLTIP}
        />
      </div>
    );
  }
}
