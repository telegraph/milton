import { h } from "preact";
import { EMBED_PROPERTIES, UI_TEXT } from "constants";
import { AppContext } from "frontend/app_context";
import { cleanUrl } from "utils/common";
import { BackgroundInput } from "./background_input";

export function Sidebar() {
  return (
    <AppContext.Consumer>
      {(props) => {
        const {
          selectedFrames,
          frames,
          setEmbedUrl,
          embedUrl,
          setFrameSelection,
          responsive,
          toggleResponsive,
          googleFonts,
          toggleGoogleFonts,
          customHTML,
          setCustomHTML,
          setSourceUrl,
          sourceUrl,
          source,
          setSource,
          subhead,
          setSubhead,
          headline,
          setHeadline,
        } = props;

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
                  checked={responsive}
                  onInput={toggleResponsive}
                />
                <label for="responsive" class="input__label">
                  {UI_TEXT.LABEL_RESPONSIVE}
                </label>
              </div>

              <div class="side_panel__row side_panel__row--input">
                <input
                  id="googleFonts"
                  class="input__checkbox"
                  type="checkbox"
                  checked={googleFonts}
                  onInput={toggleGoogleFonts}
                />
                <label for="googleFonts" class="input__label">
                  {UI_TEXT.LABEL_GOOGLE_FONTS}
                </label>
              </div>
            </div>

            <div class="side_panel side_panel--information">
              <div class="side_panel__row side_panel__row--title">
                {UI_TEXT.TITLE_HEADERS_FOOTER}
              </div>

              <div class="side_panel__row side_panel__row--headline">
                <input
                  class="input input--textbox input--icon input--icon--text"
                  id={EMBED_PROPERTIES.HEADLINE}
                  placeholder={UI_TEXT.PLACEHOLDER_EMBED_PROPS_HEADLINE}
                  onKeyDown={(e) => e.stopImmediatePropagation()}
                  onChange={({ currentTarget }) => {
                    setHeadline(currentTarget.value.trim());
                  }}
                  spellcheck
                  value={headline}
                />
              </div>

              <div class="side_panel__row side_panel__row--headline">
                <input
                  class="input input--textbox input--icon input--icon--text"
                  id={EMBED_PROPERTIES.SUBHEAD}
                  placeholder={UI_TEXT.PLACEHOLDER_EMBED_PROPS_SUB_HEAD}
                  onKeyDown={(e) => e.stopImmediatePropagation()}
                  onChange={({ currentTarget }) => {
                    setSubhead(currentTarget.value.trim());
                  }}
                  spellcheck
                  value={subhead}
                />
              </div>

              <div class="side_panel__row side_panel__row--headline">
                <input
                  class="input input--textbox input--icon input--icon--text"
                  id={EMBED_PROPERTIES.SOURCE}
                  placeholder={UI_TEXT.PLACEHOLDER_EMBED_PROPS_SOURCE}
                  onKeyDown={(e) => e.stopImmediatePropagation()}
                  onChange={({ currentTarget }) => {
                    setSource(currentTarget.value.trim());
                  }}
                  spellcheck
                  value={source}
                />
              </div>

              <div class="side_panel__row side_panel__row--headline">
                <input
                  type="url"
                  class="input input--textbox input--icon input--icon--url"
                  id={EMBED_PROPERTIES.SOURCE_URL}
                  placeholder={UI_TEXT.PLACEHOLDER_EMBED_PROPS_SOURCE_URL}
                  onKeyDown={(e) => e.stopImmediatePropagation()}
                  onChange={({ currentTarget }) => {
                    setSourceUrl(cleanUrl(currentTarget.value));
                  }}
                  value={sourceUrl}
                />
              </div>
            </div>

            {/* Destination URL  */}
            <div class="side_panel side_panel--destination">
              <div class="side_panel__row side_panel__row--title">
                {UI_TEXT.TITLE_DESTINATION_URL}
              </div>

              <div class="side_panel__row ">
                <input
                  type="url"
                  class="input input--textbox input--icon input--icon--url"
                  id={EMBED_PROPERTIES.EMBED_URL}
                  placeholder={UI_TEXT.PLACEHOLDER_EMBED_PROPS_URL}
                  onKeyDown={(e) => e.stopImmediatePropagation()}
                  onChange={({ currentTarget }) => {
                    setEmbedUrl(cleanUrl(currentTarget.value));
                  }}
                  value={embedUrl}
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

            {/* Custom  HTML  */}
            <div class="side_panel side_panel--destination">
              <div class="side_panel__row side_panel__row--title">
                {UI_TEXT.LABEL_CUSTOM_HTML}
              </div>

              <div class="side_panel__row ">
                <textarea
                  // @ts-expect-error
                  spellCheck="false"
                  placeholder={UI_TEXT.PLACEHOLDER_CUSTOM_HTML}
                  onKeyDown={(e) => e.stopImmediatePropagation()}
                  class="input input--textbox input--icon input--icon--text input--html"
                  onChange={(e) => {
                    const { value } = e.target as HTMLTextAreaElement;
                    setCustomHTML(value);
                  }}
                  value={customHTML}
                />
              </div>
            </div>
          </div>
        );
      }}
    </AppContext.Consumer>
  );
}
