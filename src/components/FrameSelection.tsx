import { h, Fragment, Component, createRef, RefObject } from "preact";
import { AppState, HeadlinesInterface, FrameCollection } from "types";

interface InputFieldProps {
  refTarget: RefObject<HTMLInputElement>;
  label: string;
  value: string | undefined;
  handleChange: () => void;
}
function InputField(props: InputFieldProps) {
  const { label, value, refTarget, handleChange } = props;

  return (
    <p className="f2h__info_form__item f2h__info_form__item--headline">
      <label className="f2h__info_form__label">{label}</label>
      <input
        className="f2h__info_form__input f2h__info_form__input--headline"
        type="text"
        value={value}
        ref={refTarget}
        onChange={handleChange}
      />
    </p>
  );
}

interface FrameSelectionProps
  extends Pick<AppState, "source" | "headline" | "subhead"> {
  frames: FrameCollection;
  selectedFrames: string[];
  handleClick: (id: string) => void;
  toggleSelectAll: () => void;
  handleFormUpdate: (props: HeadlinesInterface) => void;
}

export class FrameSelection extends Component<FrameSelectionProps> {
  private headlineInput: RefObject<HTMLInputElement> = createRef();
  private subheadInput: RefObject<HTMLInputElement> = createRef();
  private sourceInput: RefObject<HTMLInputElement> = createRef();

  sendFormValues = (): void => {
    const { handleFormUpdate } = this.props;
    const headline = this.headlineInput.current?.value;
    const subhead = this.subheadInput.current?.value;
    const source = this.sourceInput.current?.value;

    handleFormUpdate({ headline, subhead, source });
  };

  render(): h.JSX.Element {
    const {
      frames,
      handleClick,
      toggleSelectAll,
      headline,
      subhead,
      source,
      selectedFrames,
    } = this.props;

    const frameCount = Object.values(frames).length;
    const selectCount = selectedFrames.length;
    const someFramesSelected = selectCount > 0 && selectCount < frameCount;
    const allSelected = selectCount === frameCount;

    return (
      <div className="f2h__choose_frames">
        <div className="f2h__info_form">
          <InputField
            refTarget={this.headlineInput}
            handleChange={this.sendFormValues}
            label="Headline"
            value={headline}
          />

          <InputField
            refTarget={this.subheadInput}
            handleChange={this.sendFormValues}
            label="Subhead"
            value={subhead}
          />

          <InputField
            refTarget={this.sourceInput}
            handleChange={this.sendFormValues}
            label="Source"
            value={source}
          />
        </div>

        <div className="f2h__frame_selection">
          <label className="f2h__sel_header f2h__sel_header--name">
            <input
              name="selectAll"
              id="selectAll"
              type="checkbox"
              onClick={toggleSelectAll}
              checked={allSelected}
              ref={(el) => el && (el.indeterminate = someFramesSelected)}
            />{" "}
            Frames
          </label>
          {/* <label className="f2h__sel_header f2h__sel_header--responsive">
            <input
              type="checkbox"
              id="responsiveAll"
              name="responsiveAll"
              onClick={toggleResponsiveAll}
              checked={false}
            />{" "}
            Responsive
          </label> */}

          {Object.values(frames)
            .sort((a, b) => (a.width < b.width ? -1 : 1))
            .map(({ name, id, width, height }) => (
              <Fragment key={id}>
                <p className="f2h__label f2h__label--name">
                  <input
                    className="f2h__checkbox"
                    type="checkbox"
                    checked={selectedFrames.includes(id)}
                    onClick={() => handleClick(id)}
                    id={name}
                    name={name}
                  />
                  <label className="f2h__label--name-text" htmlFor={name}>
                    {name}
                  </label>
                  <span className="f2h__sel_width">
                    {width} x {height}
                  </span>
                </p>
              </Fragment>
            ))}
        </div>
      </div>
    );
  }
}
