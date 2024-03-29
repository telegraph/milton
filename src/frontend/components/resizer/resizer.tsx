import { MSG_EVENTS } from "constants";
import { h, Component, createRef, RefObject } from "preact";
import { postMan } from "utils/messages";

export class Resizer extends Component {
  private cornerElement: RefObject<HTMLDivElement> = createRef();

  private startResize = (event: PointerEvent): void => {
    const { current: element } = this.cornerElement;
    element?.setPointerCapture(event.pointerId);
    element?.addEventListener("pointermove", this.handleResize);
  };

  private endResize = (event: PointerEvent): void => {
    const { current: element } = this.cornerElement;
    element?.releasePointerCapture(event.pointerId);
    element?.removeEventListener("pointermove", this.handleResize);
  };

  handleResize = (event: PointerEvent): void => {
    const { clientX, clientY } = event;

    postMan.send({
      workload: MSG_EVENTS.RESIZE_WINDOW,
      data: {
        x: Math.ceil(clientX),
        y: Math.ceil(clientY),
      },
    });
  };

  render(): h.JSX.Element {
    return (
      <div
        class="resizer"
        onPointerDown={this.startResize}
        onPointerUp={this.endResize}
        ref={this.cornerElement}
      ></div>
    );
  }
}
