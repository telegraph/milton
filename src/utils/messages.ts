import { MSG_EVENTS } from "../constants";

export function sendMessage(type: MSG_EVENTS, data?: { [id: string]: any }) {
  console.log("post message", parent.postMessage, type, data);
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
