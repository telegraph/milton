import { h, Component } from "preact";
import { NOTIFICATIONS, NOTIFICATIONS_IDS, NOTIFICATION_TYPE } from "constants";
import { ActionTypes, actionClearNotification } from "frontend/actions";

interface NotificationBarProps {
  dispatch: (action: ActionTypes) => void;
  id?: NOTIFICATIONS_IDS;
  message?: string;
}

interface NotificationBarState {
  timerId: number | undefined;
}

export class NotificationBar extends Component<
  NotificationBarProps,
  NotificationBarState
> {
  state: NotificationBarState = {
    timerId: undefined,
  };

  TIMEOUT_LENGTH = 2 * 1000;

  removeNotification = () => {
    this.props.dispatch(actionClearNotification());
    clearTimeout(this.state.timerId);
    this.setState({ timerId: undefined });
  };

  componentDidUpdate(oldProps: NotificationBarProps) {
    if (this.props.id === undefined) return;
    if (this.props.id === oldProps.id) return;

    if (NOTIFICATIONS[this.props.id].type !== NOTIFICATION_TYPE.INFO) {
      clearTimeout(this.state.timerId);
      return;
    }

    if (NOTIFICATIONS[this.props.id].type === NOTIFICATION_TYPE.INFO) {
      const timerId = setTimeout(this.removeNotification, this.TIMEOUT_LENGTH);
      this.setState({ timerId });
    }
  }

  componentWillUnmount() {
    clearTimeout(this.state.timerId);
  }

  render() {
    const { id, message } = this.props;

    if (id === undefined) return null;

    return (
      <section
        class={`notification_bar notification_bar--${NOTIFICATIONS[id].type}`}
      >
        <p class="notification_bar__text">
          {NOTIFICATIONS[id].text}
          <span class="notification_bar__message">{message}</span>
        </p>
        <button
          class="btn btn__close btn__close--white"
          title="Close"
          onClick={this.removeNotification}
        />
      </section>
    );
  }
}
