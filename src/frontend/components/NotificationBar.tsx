import { NOTIFICATIONS, UI_TEXT } from "constants";
import { FunctionComponent, h } from "preact";

export const NotificationBar: FunctionComponent<{
  notifications: string[];
}> = ({ notifications }) => {
  if (notifications.length === 0) return;

  return (
    <section class="notification_bar notification_bar--error">
      <p class="notification_bar__text">
        {NOTIFICATIONS.WARN_CLIPBOARD_COPIED.text}
      </p>
      <button class="btn btn__close btn__close--white" title="Close" />
    </section>
  );
};
