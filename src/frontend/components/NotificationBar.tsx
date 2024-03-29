import { NOTIFICATIONS } from "constants";
import { AppContext } from "frontend/app_context";
import { h } from "preact";

export function NotificationBar() {
  return (
    <AppContext.Consumer>
      {({ notificationId, notificationMessage, setNotification }) => {
        if (notificationId === undefined) return;
        const notification = NOTIFICATIONS[notificationId];

        return (
          <section
            class={`notification_bar notification_bar--${notification.type}`}
          >
            <p class="notification_bar__text">
              {notification.text}
              <span class="notification_bar__message">
                {notificationMessage}
              </span>
            </p>
            <button
              class="btn btn__close btn__close--white"
              title="Close"
              onClick={() => setNotification()}
            />
          </section>
        );
      }}
    </AppContext.Consumer>
  );
}
