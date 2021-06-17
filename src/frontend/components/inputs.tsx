import { EMBED_PROPERTIES, UI_TEXT } from "constants";
import {
  actionSetResponsive,
  actionToggleSelectedFrame,
  ActionTypes,
  actionUpdateEmbedProps,
} from "frontend/actions";
import { Fragment, h, JSX } from "preact";
import { cleanUrl, URL_REGEX_LOOSE } from "utils/common";

export function HeadlineInput(props: {
  headline: string;
  dispatch: (action: ActionTypes) => void;
}) {
  const { headline, dispatch } = props;

  function updateHeadline(event: JSX.TargetedEvent<HTMLDivElement>): void {
    const cleanValue = event.currentTarget.innerText.trim();
    actionUpdateEmbedProps(EMBED_PROPERTIES.HEADLINE, cleanValue)(dispatch);
  }

  return (
    <div
      contentEditable={true}
      class="input input--textbox input--headline"
      id={EMBED_PROPERTIES.HEADLINE}
      dangerouslySetInnerHTML={{ __html: headline }}
      data-empty={!headline}
      data-placeholder={UI_TEXT.EMBED_PROPS_HEADLINE_PLACEHOLDER}
      onBlur={updateHeadline}
      spellcheck
    />
  );
}

export function SubheadInput(props: {
  subhead: string;
  dispatch: (action: ActionTypes) => void;
}) {
  const { subhead, dispatch } = props;

  function updateSubhead(event: JSX.TargetedEvent<HTMLDivElement>): void {
    const cleanValue = event.currentTarget.innerText.trim();
    actionUpdateEmbedProps(EMBED_PROPERTIES.SUBHEAD, cleanValue)(dispatch);
  }

  return (
    <div
      contentEditable={true}
      class="input input--textbox input--headline"
      id={EMBED_PROPERTIES.SUBHEAD}
      dangerouslySetInnerHTML={{ __html: subhead }}
      data-empty={!subhead}
      data-placeholder={UI_TEXT.EMBED_PROPS_SUB_HEAD_PLACEHOLDER}
      onBlur={updateSubhead}
      spellcheck
    />
  );
}

export function SourceInput(props: {
  source: string;
  dispatch: (action: ActionTypes) => void;
}) {
  const { source, dispatch } = props;

  function updateSource(event: JSX.TargetedEvent<HTMLDivElement>): void {
    const cleanValue = event.currentTarget.innerText.trim();
    actionUpdateEmbedProps(EMBED_PROPERTIES.SOURCE, cleanValue)(dispatch);
  }

  return (
    <div
      contentEditable={true}
      class="input input--textbox input--headline"
      id={EMBED_PROPERTIES.SUBHEAD}
      dangerouslySetInnerHTML={{ __html: source }}
      data-empty={!source}
      data-placeholder={UI_TEXT.EMBED_PROPS_SOURCE_PLACEHOLDER}
      onBlur={updateSource}
      spellcheck
    />
  );
}

export function SourceUrlInput(props: {
  sourceUrl: string;
  dispatch: (action: ActionTypes) => void;
}) {
  const { sourceUrl, dispatch } = props;

  function updateSourceUrl(e: JSX.TargetedFocusEvent<HTMLInputElement>) {
    const url = cleanUrl(e.currentTarget.value);
    actionUpdateEmbedProps(EMBED_PROPERTIES.SOURCE_URL, url)(dispatch);
  }

  return (
    <input
      type="url"
      pattern={URL_REGEX_LOOSE}
      class="input input--text input--url"
      value={sourceUrl}
      placeholder={UI_TEXT.EMBED_PROPS_SOURCE_URL_PLACEHOLDER}
      id={EMBED_PROPERTIES.SOURCE_URL}
      onBlur={updateSourceUrl}
      spellcheck={false}
    />
  );
}

export function EmbedUrlInput(props: {
  embedUrl: string;
  dispatch: (action: ActionTypes) => void;
}) {
  const { embedUrl, dispatch } = props;

  function updateEmbedUrl(e: JSX.TargetedFocusEvent<HTMLInputElement>) {
    const url = cleanUrl(e.currentTarget.value);
    actionUpdateEmbedProps(EMBED_PROPERTIES.EMBED_URL, url)(dispatch);
  }

  return (
    <input
      type="url"
      pattern={URL_REGEX_LOOSE}
      class="input input--text input--url"
      value={embedUrl}
      placeholder={UI_TEXT.EMBED_PROPS_URL_PLACEHOLDER}
      id={EMBED_PROPERTIES.EMBED_URL}
      onBlur={updateEmbedUrl}
      spellcheck={false}
    />
  );
}

export function ResponsiveToggle(props: {
  responsive: boolean;
  dispatch: (action: ActionTypes) => void;
}) {
  const { responsive, dispatch } = props;

  function updateResponsive() {
    dispatch(actionSetResponsive(!responsive));
  }

  return (
    <Fragment>
      <input
        id="responsive"
        class="input__checkbox"
        type="checkbox"
        checked={responsive}
        onInput={updateResponsive}
      />

      <label class="input__label" for="responsive">
        {UI_TEXT.RESPONSIVE_LABEL}
      </label>
    </Fragment>
  );
}

export function FrameSelectionInput(props: {
  id: string;
  name: string;
  selected: boolean;
  disabled: boolean;
  dispatch: (action: ActionTypes) => void;
}) {
  const { id, name, selected, disabled, dispatch } = props;

  function updateFrameSelection() {
    dispatch(actionToggleSelectedFrame(id));
  }

  return (
    <Fragment>
      <label
        for={id}
        class="input__label"
        data-active={selected}
        disabled={disabled}
      >
        {name}
      </label>

      <input
        id={id}
        class="input__checkbox"
        type="checkbox"
        checked={selected}
        disabled={disabled}
        onInput={updateFrameSelection}
      />
    </Fragment>
  );
}
