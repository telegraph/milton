import { h, JSX } from "preact";
import { ActionTypes } from "frontend/actions";

interface ZoomProps {
  zoom: number;
  handleChange: (action: ActionTypes) => void;
}

export function Zoom({ zoom, handleChange }: ZoomProps): JSX.Element {
  return <div></div>;
}
