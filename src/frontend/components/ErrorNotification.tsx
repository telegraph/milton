import { ERRORS, UI_TEXT } from "constants";
import { FunctionComponent, h } from "preact";

export const ErrorNotification: FunctionComponent<{ errors: ERRORS[] }> = (
  props
) => {
  const { errors } = props;

  return (
    <section class="error_notification">
      <h2 class="error_notification__heading">Warning</h2>
      <ol class="error_notification__list">
        {errors.map((err) => (
          <li key={err}>{UI_TEXT.ERRORS[err]}</li>
        ))}
      </ol>
    </section>
  );
};
