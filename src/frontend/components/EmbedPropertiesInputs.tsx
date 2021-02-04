import { h, JSX } from "preact";
import { EMBED_PROPERTIES } from "../../constants";
import {
  actionSetHeadlineText,
  actionSetSubheadText,
  actionSetSourceText,
  actionSetSourceUrl,
  actionSetEmbedUrl,
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

export function EmbedPropertiesInputs({
  headline,
  subhead,
  source,
  sourceUrl,
  embedUrl,
  handleChange,
}: EmbedPropertiesInputs): JSX.Element {
  const handleInputUpdate = (
    event: JSX.TargetedEvent<HTMLInputElement>
  ): void => {
    const { id, value } = event.currentTarget;

    switch (id) {
      case EMBED_PROPERTIES.HEADLINE:
        handleChange(actionSetHeadlineText(value));
        break;

      case EMBED_PROPERTIES.SUBHEAD:
        handleChange(actionSetSubheadText(value));
        break;

      case EMBED_PROPERTIES.SOURCE:
        handleChange(actionSetSourceText(value));
        break;

      case EMBED_PROPERTIES.SOURCE_URL:
        handleChange(actionSetSourceUrl(value));
        break;

      case EMBED_PROPERTIES.EMBED_URL:
        handleChange(actionSetEmbedUrl(value));
        break;
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
          onChange={handleInputUpdate}
        />
      </label>

      <label>
        <span>Sub headline</span>
        <input
          type="text"
          value={subhead}
          id={EMBED_PROPERTIES.SUBHEAD}
          onChange={handleInputUpdate}
        />
      </label>

      <label>
        <span>Source</span>
        <input
          type="text"
          value={source}
          id={EMBED_PROPERTIES.SOURCE}
          onChange={handleInputUpdate}
        />
      </label>

      <label>
        <span>Source URL</span>
        <input
          type="text"
          value={sourceUrl}
          id={EMBED_PROPERTIES.SOURCE_URL}
          onChange={handleInputUpdate}
        />
      </label>

      <label>
        <span>Embed URL</span>
        <input
          type="text"
          value={embedUrl}
          id={EMBED_PROPERTIES.EMBED_URL}
          onChange={handleInputUpdate}
        />
      </label>
    </fieldset>
  );
}
