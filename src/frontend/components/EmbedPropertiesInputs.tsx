import { h, JSX } from "preact";
import { URL_REGEX } from "utils/common";
import { EMBED_PROPERTIES, ERRORS, UI_TEXT } from "../../constants";
import {
  actionUpdateEmbedProps,
  actionSetError,
  ActionTypes,
  actionClearError,
} from "../actions";

interface EmbedPropertiesInputs {
  headline: string;
  subhead: string;
  source: string;
  handleChange: (action: ActionTypes) => void;
}

function isValidURLValue(url: string) {
  return url === "" || URL_REGEX.test(url);
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

    if (id === EMBED_PROPERTIES.EMBED_URL) {
      !isValidURLValue(cleanValue)
        ? handleChange(actionSetError(ERRORS.INPUT_EMBED_INVALID_URL))
        : handleChange(actionClearError(ERRORS.INPUT_EMBED_INVALID_URL));
    }

    if (id === EMBED_PROPERTIES.SOURCE_URL) {
      !isValidURLValue(cleanValue)
        ? handleChange(actionSetError(ERRORS.INPUT_SOURCE_INVALID_URL))
        : handleChange(actionClearError(ERRORS.INPUT_SOURCE_INVALID_URL));
    }
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
          onChange={inputChange}
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
          onChange={inputChange}
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
          onChange={inputChange}
          spellcheck
        />
      </div>
    </div>
  );
}
