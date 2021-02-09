import { ERRORS, UI_TEXT } from "constants";
import { FunctionComponent, h } from "preact";

export const ErrorNotification: FunctionComponent<{
  errors: ERRORS[];
  errorInfo: { [key in ERRORS]?: string };
}> = (props) => {
  const { errors, errorInfo } = props;

  return (
    <section class="error_notification">
      <h2 class="error_notification__heading">Warning</h2>
      <ol class="error_notification__list">
        {errors.map((err) => (
          <li key={err}>
            {UI_TEXT.ERRORS[err]}
            <pre>{errorInfo[err]}</pre>
          </li>
        ))}
      </ol>
    </section>
  );
};
