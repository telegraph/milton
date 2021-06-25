import { Component, createRef, Fragment, h, JSX, RefObject } from "preact";

interface Props {
  title?: string;
  draggable?: boolean;
  onClose?: () => void;
}

interface State {
  isOpen: boolean;
  xPos: number;
  yPos: number;
  isDragging: boolean;
  clickOffsetX: number;
  clickOffsetY: number;
}

export class Modal extends Component<Props, State> {
  state: State = {
    isOpen: true,
    xPos: 0,
    yPos: 0,
    clickOffsetX: 0,
    clickOffsetY: 0,
    isDragging: false,
  };

  dragEl: RefObject<HTMLDivElement> = createRef();
  rootEl: RefObject<HTMLDivElement> = createRef();

  clamp = (val: number, min: number, max: number): number => {
    if (val <= min) return min;
    if (val >= max) return max;
    return val;
  };

  onDragStart = (event: DragEvent): void => {
    if (!this.dragEl.current) return;

    const { x, y } = this.dragEl.current.getBoundingClientRect();

    this.setState({
      isDragging: true,
      clickOffsetX: event.x - x,
      clickOffsetY: event.y - y,
    });
  };

  onDrag = (event: DragEvent): void => {
    const { clickOffsetX, clickOffsetY } = this.state;
    console.log("drag");

    this.setState({
      xPos: this.clamp(event.x - clickOffsetX, 0, window.innerWidth),
      yPos: this.clamp(event.y - clickOffsetY, 0, window.innerHeight),
    });
  };

  onDragEnd = (event: DragEvent): void => {
    const { clickOffsetX, clickOffsetY } = this.state;

    this.setState({
      isDragging: false,
      xPos: this.clamp(event.x - clickOffsetX, 0, window.innerWidth),
      yPos: this.clamp(event.y - clickOffsetY, 0, window.innerHeight),
    });
  };

  preventDropJump = (event: DragEvent): void => event.preventDefault();

  componentDidMount(): void {
    if (!this.dragEl.current) return;
    if (!this.rootEl.current) return;

    if (this.rootEl.current.parentElement) {
      const { offsetWidth, offsetLeft, offsetTop } =
        this.rootEl.current.parentElement;

      const x = offsetLeft + offsetWidth;
      const y = Math.min(
        window.innerHeight - this.rootEl.current.offsetHeight,
        offsetTop
      );

      this.setState({
        xPos: x,
        yPos: y,
      });
    }

    document.addEventListener("drop", this.preventDropJump);
    document.addEventListener("dragover", this.preventDropJump);
    this.dragEl.current.addEventListener("dragstart", this.onDragStart);
    this.dragEl.current.addEventListener("drag", this.onDrag);
    this.dragEl.current.addEventListener("dragend", this.onDragEnd);
  }

  componentWillUnmount(): void {
    if (!this.dragEl.current) return;

    document.removeEventListener("drop", this.preventDropJump);
    document.removeEventListener("dragover", this.preventDropJump);
    this.dragEl.current.removeEventListener("dragstart", this.onDragStart);
    this.dragEl.current.removeEventListener("drag", this.onDrag);
    this.dragEl.current.removeEventListener("dragend", this.onDragEnd);
  }

  render(): JSX.Element {
    const { xPos, yPos } = this.state;
    const { title, onClose, children } = this.props;

    const style = `
      position: fixed;
      left: ${xPos}px;
      top: ${yPos}px;
      visible
    `;

    return (
      <Fragment>
        <div class="modal" style={style} ref={this.rootEl}>
          <div class="modal__drag_bar" draggable={true} ref={this.dragEl}></div>
          <header class="modal__header">
            <span class="modal__title">{title}</span>
            <button class="modal__close" onClick={onClose}>
              x
            </button>
          </header>

          <div class="modal__body">{children}</div>
        </div>
        <div class="modal__background" onClick={onClose}></div>
      </Fragment>
    );
  }
}
