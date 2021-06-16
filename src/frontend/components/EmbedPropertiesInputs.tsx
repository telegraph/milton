import { h, JSX } from "preact";
import { cleanUrl, URL_REGEX_LOOSE } from "utils/common";
import { EMBED_PROPERTIES, UI_TEXT } from "../../constants";
import { ActionTypes, actionUpdateEmbedProps } from "../actions";

interface EmbedPropertiesInputs {
  headline: string;
  subhead: string;
  source: string;
  sourceUrl: string;
  handleChange: (action: ActionTypes) => void;
}

export function EmbedPropertiesInputs({
  headline,
  subhead,
  source,
  sourceUrl,
  handleChange,
}: EmbedPropertiesInputs): JSX.Element {
  const inputChange = (event: JSX.TargetedEvent<HTMLDivElement>): void => {
    const { id, innerText } = event.currentTarget;
    const cleanValue = innerText.trim();

    actionUpdateEmbedProps(id as EMBED_PROPERTIES, cleanValue)(handleChange);
  };

  return (
    <div class="side_panel information">
      <div class="side_panel__row side_panel__row--title">
        {UI_TEXT.TITLE_HEADERS_FOOTER}
      </div>

      <div class="side_panel__row side_panel__row--headline">
        <div
          contentEditable={true}
          class="input input--textbox input--headline"
          id={EMBED_PROPERTIES.HEADLINE}
          dangerouslySetInnerHTML={{ __html: headline }}
          placeholder={UI_TEXT.EMBED_PROPS_HEADLINE_PLACEHOLDER}
          onBlur={inputChange}
          spellcheck
        />
      </div>

      <div class="side_panel__row side_panel__row--headline">
        <div
          contentEditable={true}
          class="input input--textbox input--headline"
          dangerouslySetInnerHTML={{ __html: subhead }}
          id={EMBED_PROPERTIES.SUBHEAD}
          placeholder={UI_TEXT.EMBED_PROPS_SUB_HEAD_PLACEHOLDER}
          onBlur={inputChange}
          spellcheck
        />
      </div>

      <div class="side_panel__row side_panel__row--headline">
        <div
          contentEditable={true}
          class="input input--textbox input--headline"
          dangerouslySetInnerHTML={{ __html: source }}
          id={EMBED_PROPERTIES.SOURCE}
          placeholder={UI_TEXT.EMBED_PROPS_SOURCE_PLACEHOLDER}
          onBlur={inputChange}
          spellcheck
        />
      </div>

      <div class="side_panel__row side_panel__row--url">
        <input
          type="url"
          pattern={URL_REGEX_LOOSE}
          class="input input--text input--url"
          value={sourceUrl}
          placeholder={UI_TEXT.EMBED_PROPS_SOURCE_URL_PLACEHOLDER}
          id={EMBED_PROPERTIES.SOURCE_URL}
          onBlur={(e) =>
            actionUpdateEmbedProps(
              EMBED_PROPERTIES.SOURCE_URL,
              cleanUrl(e.currentTarget.value)
            )(handleChange)
          }
          spellcheck={false}
        />
      </div>
    </div>
  );
}
