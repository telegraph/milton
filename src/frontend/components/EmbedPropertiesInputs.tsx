import { h, JSX } from "preact";
import { URL_REGEX } from "utils/common";
import { EMBED_PROPERTIES, ERRORS } from "../../constants";
import {
  actionUpdateEmbedProps,
  actionSetError,
  ActionTypes,
} from "../actions";

interface EmbedPropertiesInputs {
  headline: string;
  subhead: string;
  source: string;
  sourceUrl: string;
  embedUrl: string;
  handleChange: (action: ActionTypes) => void;
}

function isValidURLValue(url: string) {
  return url === "" || URL_REGEX.test(url);
}

export function EmbedPropertiesInputs({
  headline,
  subhead,
  source,
  sourceUrl,
  embedUrl,
  handleChange,
}: EmbedPropertiesInputs): JSX.Element {
  const inputChange = (event: JSX.TargetedEvent<HTMLInputElement>): void => {
    const { id, value } = event.currentTarget;
    const cleanValue = value.trim();

    actionUpdateEmbedProps(id as EMBED_PROPERTIES, cleanValue)(handleChange);

    if (
      id === EMBED_PROPERTIES.EMBED_URL ||
      id === EMBED_PROPERTIES.SOURCE_URL
    ) {
      if (!isValidURLValue(cleanValue)) {
        handleChange(actionSetError(ERRORS.INPUT_INVALID_URL));
      }
    }
  };

  return (
    <fieldset class="embed_properties">
      <legend>Embed properties</legend>
      <label>
        <span>Headline</span>
        <input
          type="text"
          id={EMBED_PROPERTIES.HEADLINE}
          value={headline}
          onChange={inputChange}
        />
      </label>

      <label>
        <span>Sub headline</span>
        <input
          type="text"
          value={subhead}
          id={EMBED_PROPERTIES.SUBHEAD}
          onChange={inputChange}
        />
      </label>

      <label>
        <span>Source</span>
        <input
          type="text"
          value={source}
          id={EMBED_PROPERTIES.SOURCE}
          onChange={inputChange}
        />
      </label>

      <label>
        <span>Source URL</span>
        <input
          type="url"
          pattern="https?://.*"
          placeholder="https://example.com"
          value={sourceUrl}
          id={EMBED_PROPERTIES.SOURCE_URL}
          onChange={inputChange}
        />
      </label>

      <label>
        <span>Embed URL</span>
        <input
          type="url"
          pattern="https?://.*"
          value={embedUrl}
          placeholder="https://example.com"
          id={EMBED_PROPERTIES.EMBED_URL}
          onChange={inputChange}
        />
      </label>
    </fieldset>
  );
}
