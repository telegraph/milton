import { h, JSX } from "preact";
import {
  actionSetHeadlineText,
  actionSetSubheadText,
  actionSetSourceText,
  ActionTypes,
} from "../actions";

enum INPUT_TYPES {
  HEADLINE = "HEADLINE",
  SUBHEAD = "SUBHEAD",
  SOURCE = "SOURCE",
}

interface FrameTextProps {
  headline: string;
  subhead: string;
  source: string;
  handleChange: (action: ActionTypes) => void;
}

export function FrameText({
  headline,
  subhead,
  source,
  handleChange,
}: FrameTextProps): JSX.Element {
  const handleInputUpdate = (
    event: JSX.TargetedEvent<HTMLInputElement>
  ): void => {
    const { id, value } = event.currentTarget;

    switch (id) {
      case INPUT_TYPES.HEADLINE:
        handleChange(actionSetHeadlineText(value));
        break;

      case INPUT_TYPES.SUBHEAD:
        handleChange(actionSetSubheadText(value));
        break;

      case INPUT_TYPES.SOURCE:
        handleChange(actionSetSourceText(value));
        break;
    }
  };

  return (
    <fieldset class="headlines">
      <legend>Headlines</legend>
      <label>
        Headline
        <input
          type="text"
          id={INPUT_TYPES.HEADLINE}
          value={headline}
          onChange={handleInputUpdate}
        />
      </label>

      <label>
        Sub headline
        <input
          type="text"
          value={subhead}
          id={INPUT_TYPES.SUBHEAD}
          onChange={handleInputUpdate}
        />
      </label>

      <label>
        Source
        <input
          type="text"
          value={source}
          id={INPUT_TYPES.SOURCE}
          onChange={handleInputUpdate}
        />
      </label>
    </fieldset>
  );
}
