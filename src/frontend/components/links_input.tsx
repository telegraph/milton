import { h, FunctionComponent, JSX } from "preact";
import { URL_REGEX } from "utils/common";
import { EMBED_PROPERTIES, ERRORS, UI_TEXT } from "../../constants";
import {
  actionUpdateEmbedProps,
  actionSetError,
  ActionTypes,
  actionClearError,
} from "../actions";

interface LinkInputProps {
  sourceUrl: string;
  embedUrl: string;
  handleChange: (action: ActionTypes) => void;
}

function isValidURLValue(url: string) {
  return url === "" || URL_REGEX.test(url);
}

export const LinksInput: FunctionComponent<LinkInputProps> = (
  props: LinkInputProps
) => {
  const { sourceUrl, embedUrl, handleChange } = props;

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
    <div class="side_panel links">
      <div class="side_panel__row side_panel__row--title">
        {UI_TEXT.TITLE_LINKS}
      </div>

      <div class="side_panel__row side_panel__row--vertical">
        <input
          type="url"
          pattern="https?://.*"
          class="input input--text input--url"
          value={embedUrl}
          placeholder={UI_TEXT.EMBED_PROPS_URL_PLACEHOLDER}
          id={EMBED_PROPERTIES.EMBED_URL}
          onChange={inputChange}
          data-error-text={UI_TEXT.EMBED_PROPS_INVALID_URL}
        />
        <span class="input__error">{UI_TEXT.EMBED_PROPS_INVALID_URL}</span>
      </div>

      <div class="side_panel__row side_panel__row--vertical">
        <input
          class="input input--text input--url"
          type="url"
          pattern="https?://.*"
          placeholder={UI_TEXT.EMBED_PROPS_SOURCE_URL_PLACEHOLDER}
          value={sourceUrl}
          id={EMBED_PROPERTIES.SOURCE_URL}
          onChange={inputChange}
        />
        <span class="input__error">{UI_TEXT.EMBED_PROPS_INVALID_URL}</span>
      </div>
    </div>
  );
};
