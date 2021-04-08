import { h, JSX } from "preact";
import { UI_TEXT } from "../../constants";
import { ActionTypes, actionSetZoom } from "frontend/actions";
import { Dropdown } from "frontend/components/dropdown/dropdown";

interface ZoomProps {
  zoom: number;
  handleChange: (action: ActionTypes) => void;
}

export function Zoom({ zoom, handleChange }: ZoomProps): JSX.Element {
  const zoomLabel = `${(zoom * 100).toFixed(0)}%`;
  const ZOOM_STEPS = 2;
  const ZOOM_MIN = 0.015625;
  const ZOOM_MAX = 100;

  const zoomOptions = [
    { text: "Zoom in +", value: Math.min(zoom * ZOOM_STEPS, ZOOM_MAX) },
    { text: "Zoom out -", value: Math.max(ZOOM_MIN, zoom / ZOOM_STEPS) },
    { text: "Zoom 100%", value: 1 },
  ];

  return (
    <div class="zoom">
      <Dropdown
        label={zoomLabel}
        handleChange={(val: number) => handleChange(actionSetZoom(val))}
        options={zoomOptions}
        tooltip={UI_TEXT.ZOOM_TOOLTIP}
      />
    </div>
  );
}
