import { AppContext, StateInterface } from "frontend/app_context";
import { Dropdown } from "frontend/components/dropdown/dropdown";
import { Component, h, JSX } from "preact";
import { UI_TEXT } from "../../constants";

enum KEYS {
  ZOOM_IN = "Equal",
  ZOOM_OUT = "Minus",
}

export class Zoom extends Component {
  ZOOM_STEPS = 2;
  ZOOM_MIN = 0.015625;
  ZOOM_MAX = 100;

  static contextType = AppContext;
  context!: StateInterface;

  handleKeyboardInput = ({ code }: KeyboardEvent): void => {
    const { zoom, setZoom: updateZoom } = this.context;

    if (code === KEYS.ZOOM_IN) {
      const newZoom = Math.min(zoom * this.ZOOM_STEPS, this.ZOOM_MAX);
      updateZoom(newZoom);
    }

    if (code === KEYS.ZOOM_OUT) {
      const newZoom = Math.max(this.ZOOM_MIN, zoom / this.ZOOM_STEPS);
      updateZoom(newZoom);
    }
  };

  componentDidMount(): void {
    window.addEventListener("keydown", this.handleKeyboardInput);
  }

  componentWillUnmount(): void {
    window.removeEventListener("keydown", this.handleKeyboardInput);
  }

  render(): JSX.Element {
    const { setZoom: updateZoom, zoom } = this.context;
    const zoomLabel = `${(zoom * 100).toFixed(0)}%`;
    const zoomOptions = [
      {
        title: "Zoom in +",
        value: Math.min(zoom * this.ZOOM_STEPS, this.ZOOM_MAX),
      },
      {
        title: "Zoom out -",
        value: Math.max(this.ZOOM_MIN, zoom / this.ZOOM_STEPS),
      },
      { title: "Zoom 100%", value: 1 },
    ];

    return (
      <div class="zoom">
        <Dropdown
          label={zoomLabel}
          onSelect={(val) => updateZoom(val)}
          options={zoomOptions}
          tooltip={UI_TEXT.ZOOM_TOOLTIP}
        />
      </div>
    );
  }
}
