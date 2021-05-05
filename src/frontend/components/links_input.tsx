import { h, FunctionComponent } from "preact";
import { EMBED_PROPERTIES, UI_TEXT } from "../../constants";
import { actionUpdateEmbedProps, ActionTypes } from "../actions";

interface LinkInputProps {
  sourceUrl: string;
  embedUrl: string;
  handleChange: (action: ActionTypes) => void;
}

export const LinksInput: FunctionComponent<LinkInputProps> = (
  props: LinkInputProps
) => {
  const { sourceUrl, embedUrl, handleChange } = props;

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
          onChange={(e) =>
            actionUpdateEmbedProps(
              EMBED_PROPERTIES.EMBED_URL,
              e.currentTarget.value.trim()
            )(handleChange)
          }
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
          onChange={(e) =>
            actionUpdateEmbedProps(
              EMBED_PROPERTIES.SOURCE_URL,
              e.currentTarget.value.trim()
            )(handleChange)
          }
        />
        <span class="input__error">{UI_TEXT.EMBED_PROPS_INVALID_URL}</span>
      </div>
    </div>
  );
};
