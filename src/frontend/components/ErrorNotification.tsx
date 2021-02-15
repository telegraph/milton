import { ERRORS, UI_TEXT } from "constants";
import { FunctionComponent, h } from "preact";

export const ErrorNotification: FunctionComponent<{
  errors: { [key in ERRORS]?: string };
}> = (props) => {
  const { errors } = props;
  if (Object.keys(errors).length < 1) return null;

  return (
    <section class="error_notification">
      <h2 class="error_notification__heading">Warning</h2>
      <ol class="error_notification__list">
        {Object.entries(errors).map(([errorKey, errorMessage]) => (
          <li key={errorKey}>
            {UI_TEXT.ERRORS[errorKey]}
            {errorMessage && <pre>{errorMessage}</pre>}
          </li>
        ))}
      </ol>
    </section>
  );
};
