import { h } from "preact";
import { EMBED_PROPERTIES, UI_TEXT } from "constants";
import { AppContext } from "frontend/app_context";
import { cleanUrl } from "utils/common";
import { BackgroundInput } from "./background_input";

export function Sidebar() {
  return (
    <AppContext.Consumer>
      {(props) => {
        const { selectedFrames, frames, setFrameSelection } = props;

        return (
          <div class="sidebar">
            <div class="side_panel side_panel--frames">
              <div class="side_panel__row side_panel__row--title">
                {UI_TEXT.TITLE_FRAMES}
              </div>

              {Object.values(frames).map((frame) => {
                const selected = selectedFrames.includes(frame.id);
                const disabled = selected && selectedFrames.length < 2;

                return (
                  <div
                    key={frame.id}
                    data-active={selected}
                    class="side_panel__row side_panel__row--input selection__item"
                  >
                    <label
                      for={frame.id}
                      class="input__label"
                      data-active={selected}
                      disabled={disabled}
                    >
                      {frame.name}
                    </label>

                    <input
                      id={frame.id}
                      class="input__checkbox"
                      type="checkbox"
                      checked={selected}
                      disabled={disabled}
                      onChange={() => {
                        setFrameSelection(frame.id);
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Responsive toggle  */}
            <div class="side_panel">
              <div class="side_panel__row side_panel__row--input">
                <input
                  id="responsive"
                  class="input__checkbox"
                  type="checkbox"
                  checked={props.responsive}
                  onInput={() => {
                    props.toggleResponsive();
                  }}
                />
                <label for="responsive" class="input__label">
                  {UI_TEXT.RESPONSIVE_LABEL}
                </label>
              </div>
            </div>

            <div class="side_panel side_panel--information">
              <div class="side_panel__row side_panel__row--title">
                {UI_TEXT.TITLE_HEADERS_FOOTER}
              </div>

              <div class="side_panel__row side_panel__row--headline">
                <div
                  contentEditable={true}
                  class="input input--textbox input--icon input--icon--text"
                  id={EMBED_PROPERTIES.HEADLINE}
                  data-empty={!props.headline}
                  data-placeholder={UI_TEXT.EMBED_PROPS_HEADLINE_PLACEHOLDER}
                  onBlur={({ currentTarget }) => {
                    props.setHeadline(currentTarget.innerText.trim());
                  }}
                  spellcheck
                  dangerouslySetInnerHTML={{ __html: props.headline }}
                />
              </div>

              <div class="side_panel__row side_panel__row--headline">
                <div
                  contentEditable={true}
                  class="input input--textbox input--icon input--icon--text"
                  id={EMBED_PROPERTIES.SUBHEAD}
                  data-empty={!props.subhead}
                  data-placeholder={UI_TEXT.EMBED_PROPS_SUB_HEAD_PLACEHOLDER}
                  onBlur={({ currentTarget }) => {
                    props.setSubhead(currentTarget.innerText.trim());
                  }}
                  spellcheck
                  dangerouslySetInnerHTML={{ __html: props.subhead }}
                />
              </div>

              <div class="side_panel__row side_panel__row--headline">
                <div
                  contentEditable={true}
                  class="input input--textbox input--icon input--icon--text"
                  id={EMBED_PROPERTIES.SUBHEAD}
                  data-empty={!props.source}
                  data-placeholder={UI_TEXT.EMBED_PROPS_SOURCE_PLACEHOLDER}
                  onBlur={({ currentTarget }) => {
                    props.setSource(currentTarget.innerText.trim());
                  }}
                  spellcheck
                  dangerouslySetInnerHTML={{ __html: props.source }}
                />
              </div>

              <div class="side_panel__row side_panel__row--headline">
                <div
                  contentEditable={true}
                  class="input input--textbox input--icon input--icon--url"
                  id={EMBED_PROPERTIES.SOURCE_URL}
                  data-empty={!props.sourceUrl}
                  data-placeholder={UI_TEXT.EMBED_PROPS_SOURCE_URL_PLACEHOLDER}
                  onBlur={({ currentTarget }) => {
                    props.setSourceUrl(cleanUrl(currentTarget.innerText));
                  }}
                  spellcheck
                  dangerouslySetInnerHTML={{ __html: props.sourceUrl }}
                />
              </div>
            </div>

            {/* Destination URL  */}
            <div class="side_panel side_panel--destination">
              <div class="side_panel__row side_panel__row--title">
                {UI_TEXT.TITLE_DESTINATION_URL}
              </div>

              <div class="side_panel__row ">
                <div
                  contentEditable={true}
                  class="input input--textbox input--icon input--icon--url"
                  id={EMBED_PROPERTIES.EMBED_URL}
                  data-empty={!props.sourceUrl}
                  data-placeholder={UI_TEXT.EMBED_PROPS_URL_PLACEHOLDER}
                  onBlur={({ currentTarget }) => {
                    props.setEmbedUrl(cleanUrl(currentTarget.innerText));
                  }}
                  spellcheck
                  dangerouslySetInnerHTML={{ __html: props.embedUrl }}
                />
              </div>
            </div>

            {/* Preview background colour picker  */}
            <div class="side_panel side_panel--background-color">
              <div class="side_panel__row side_panel__row--title">
                {UI_TEXT.TITLE_BACKGROUND_COLOUR}
              </div>

              <div class="side_panel__row side_panel__row--colour">
                <BackgroundInput />
              </div>
            </div>
          </div>
        );
      }}
    </AppContext.Consumer>
  );
}
