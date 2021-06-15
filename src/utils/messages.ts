import { MSG_EVENTS } from "../constants";

type Callback = (result: unknown, err?: string) => unknown;

interface IPostmanMessage {
  name: string;
  uid: string;
  workload: MSG_EVENTS;
  data: unknown;
  returning?: boolean;
  err?: string;
}

class Postman {
  private name: string;
  private inFigmaSandbox: boolean;
  private callbackStore: Record<string, Callback>;
  private workers: Record<string, Callback>;

  private TIMEOUT = 30000;

  constructor(props?: { messageName?: string; scope: null }) {
    this.name = props?.messageName || "POSTMAN";
    this.inFigmaSandbox = typeof figma === "object";
    this.callbackStore = {};
    this.workers = {};

    // Add message event listener
    this.inFigmaSandbox
      ? figma.ui.on("message", this.receive)
      : window.addEventListener("message", this.receive);
  }

  private receive = async (event: MessageEvent) => {
    const msgBody: IPostmanMessage = this.inFigmaSandbox
      ? event
      : event?.data?.pluginMessage;
    const { data, workload, name, uid, returning, err } = msgBody || {};

    try {
      // Do nothing if post message isn't for us
      if (this.name !== name) return;

      if (returning && !this.callbackStore[uid]) {
        throw new Error(`Missing callback: ${uid}`);
      }

      if (!returning && !this.workers[workload]) {
        throw new Error(`No workload registered: ${workload}`);
      }

      if (returning) {
        this.callbackStore[uid](data, err);
      } else {
        const workloadResult = await this.workers[workload](data);
        this.postBack({ data: workloadResult, uid, workload });
      }
    } catch (err) {
      this.postBack({ uid, err: "Postman failed", workload });
      console.error("Postman failed", err);
    }
  };

  public registerWorker = (eventType: MSG_EVENTS, fn: Callback) => {
    this.workers[eventType] = fn;
  };

  public removeWorker = (eventType: MSG_EVENTS) =>
    delete this.workers[eventType];

  private postBack = (props: {
    uid: string;
    workload: MSG_EVENTS;
    data?: unknown;
    err?: string;
  }) =>
    this.postMessage({
      name: this.name,
      uid: props.uid,
      data: props.data,
      returning: true,
      workload: props.workload,
      err: props.err,
    });

  private postMessage = (messageBody: IPostmanMessage) =>
    this.inFigmaSandbox
      ? figma.ui.postMessage(messageBody)
      : parent.postMessage({ pluginMessage: messageBody }, "*");

  public send = (props: {
    workload: MSG_EVENTS;
    data?: unknown;
  }): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      const { workload, data } = props;

      const randomId = Math.random().toString(36).substr(5);

      this.postMessage({
        name: this.name,
        uid: randomId,
        workload,
        data,
      });

      this.callbackStore[randomId] = (result: unknown, err?: string) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      };

      setTimeout(() => reject(new Error("Timed out")), this.TIMEOUT);
    });
  };
}

export const postMan = new Postman();
