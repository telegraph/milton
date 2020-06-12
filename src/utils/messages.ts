import { MSG_EVENTS } from "../constants";

export function sendMessage(type: MSG_EVENTS, data?: { [id: string]: any }) {
  parent.postMessage(
    {
      pluginMessage: {
        type: type,
        ...data,
      },
    },
    "*"
  );
}
