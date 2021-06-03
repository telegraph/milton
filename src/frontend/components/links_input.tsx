import { h, Component } from "preact";
import { EMBED_PROPERTIES, UI_TEXT } from "../../constants";
import { actionUpdateEmbedProps, ActionTypes } from "../actions";

interface Props {
  sourceUrl: string;
  embedUrl: string;
  handleChange: (action: ActionTypes) => void;
}

export class LinksInput extends Component<Props> {
  private URL_VALIDATION = "https?://.*";
  private PROTOCOL_VALIDATION = /^http?s:\/\//i;

  private cleanUrl = (text: string): string => {
    const urlText = text.trim();

    if (urlText === "") return "";
    if (!this.PROTOCOL_VALIDATION.test(urlText)) return "https://" + urlText;
    return urlText;
  };

  private handleInput = (event: h.JSX.TargetedFocusEvent<HTMLInputElement>) => {
    const { handleChange } = this.props;
    const { value, id } = event.currentTarget;
    const url = this.cleanUrl(value);

    actionUpdateEmbedProps(id as EMBED_PROPERTIES, url)(handleChange);
  };

  render(): h.JSX.Element {
    const { sourceUrl, embedUrl } = this.props;

    return (
      <div class="side_panel links">
        <div class="side_panel__row ">
          <input
            class="input input--text input--url"
            type="url"
            pattern={this.URL_VALIDATION}
            placeholder={UI_TEXT.EMBED_PROPS_SOURCE_URL_PLACEHOLDER}
            value={sourceUrl}
            id={EMBED_PROPERTIES.SOURCE_URL}
            onBlur={this.handleInput}
            spellcheck={false}
          />
          <span class="input__error">{UI_TEXT.EMBED_PROPS_INVALID_URL}</span>
        </div>

        <div class="side_panel__row ">
          <input
            type="url"
            pattern={this.URL_VALIDATION}
            class="input input--text input--url"
            value={embedUrl}
            placeholder={UI_TEXT.EMBED_PROPS_URL_PLACEHOLDER}
            id={EMBED_PROPERTIES.EMBED_URL}
            onBlur={this.handleInput}
            data-error-text={UI_TEXT.EMBED_PROPS_INVALID_URL}
            spellcheck={false}
          />
          <span class="input__error">{UI_TEXT.EMBED_PROPS_INVALID_URL}</span>
        </div>
      </div>
    );
  }
}
