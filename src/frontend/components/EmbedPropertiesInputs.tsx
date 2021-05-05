import { h, JSX } from "preact";
import { EMBED_PROPERTIES, UI_TEXT } from "../../constants";
import { actionUpdateEmbedProps, ActionTypes } from "../actions";

interface EmbedPropertiesInputs {
  headline: string;
  subhead: string;
  source: string;
  handleChange: (action: ActionTypes) => void;
}

export function EmbedPropertiesInputs({
  headline,
  subhead,
  source,
  handleChange,
}: EmbedPropertiesInputs): JSX.Element {
  const inputChange = (
    event: JSX.TargetedEvent<HTMLInputElement | HTMLTextAreaElement>
  ): void => {
    const { id, value } = event.currentTarget;
    const cleanValue = value.trim();

    actionUpdateEmbedProps(id as EMBED_PROPERTIES, cleanValue)(handleChange);
  };

  return (
    <div class="side_panel information">
      <div class="side_panel__row side_panel__row--title">Embed properties</div>

      <div
        class="side_panel__row side_panel__row--headline"
        data-value={headline}
      >
        <textarea
          type="text"
          class="input input--textbox input--headline"
          id={EMBED_PROPERTIES.HEADLINE}
          value={headline}
          placeholder={UI_TEXT.EMBED_PROPS_HEADLINE_PLACEHOLDER}
          onBlur={inputChange}
          spellcheck
        />
      </div>

      <div
        class="side_panel__row side_panel__row--headline"
        data-value={subhead}
      >
        <textarea
          type="text"
          class="input input--textbox input--headline"
          value={subhead}
          id={EMBED_PROPERTIES.SUBHEAD}
          placeholder={UI_TEXT.EMBED_PROPS_SUB_HEAD_PLACEHOLDER}
          onBlur={inputChange}
          spellcheck
        />
      </div>

      <div
        class="side_panel__row side_panel__row--headline"
        data-value={source}
      >
        <textarea
          type="text"
          value={source}
          class="input input--textbox input--headline"
          id={EMBED_PROPERTIES.SOURCE}
          placeholder={UI_TEXT.EMBED_PROPS_SOURCE_PLACEHOLDER}
          onBlur={inputChange}
          spellcheck
        />
      </div>
    </div>
  );
}
