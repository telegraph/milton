import { h, JSX } from "preact";
import { actionSetText, ReducerProps } from "../store";

interface FrameTextProps {
  headline: string;
  subhead: string;
  source: string;
  handleChange: (action: ReducerProps) => void;
}

export function FrameText({
  headline,
  subhead,
  source,
  handleChange,
}: FrameTextProps): JSX.Element {
  return (
    <fieldset class="headlines">
      <legend>Headlines</legend>
      <label>
        Headline
        <input
          type="text"
          value={headline}
          onChange={(e) =>
            handleChange(actionSetText({ headline: e.currentTarget.value }))
          }
        />
      </label>

      <label>
        Sub headline
        <input
          type="text"
          value={subhead}
          onChange={(e) =>
            handleChange(actionSetText({ subhead: e.currentTarget.value }))
          }
        />
      </label>

      <label>
        Source
        <input
          type="text"
          value={source}
          onChange={(e) =>
            handleChange(actionSetText({ source: e.currentTarget.value }))
          }
        />
      </label>
    </fieldset>
  );
}
