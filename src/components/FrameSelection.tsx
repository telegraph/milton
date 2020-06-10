import { h, Fragment, Component, createRef, RefObject } from "preact";
import type { App, FrameDataType, AppState } from "../ui";

interface InputFieldProps {
  refTarget: RefObject<HTMLInputElement>;
  label: string;
  value: string | undefined;
  handleChange: () => void;
}
function InputField(props: InputFieldProps) {
  const { label, value, refTarget, handleChange } = props;

  return (
    <p class="f2h__info_form__item f2h__info_form__item--headline">
      <label class="f2h__info_form__label">{label}</label>
      <input
        class="f2h__info_form__input f2h__info_form__input--headline"
        type="text"
        spellcheck={true}
        value={value}
        ref={refTarget}
        onChange={handleChange}
      />
    </p>
  );
}

interface FrameSelectionProps
  extends Pick<AppState, "source" | "headline" | "subhead"> {
  frames: FrameDataType[];
  handleClick: App["handleFrameSelectionChange"];
  toggleResonsive: App["toggleResonsive"];
  toggleSelectAll: App["toggleSelectAll"];
  toggleResponsiveAll: App["toggleResponsiveAll"];
  handleFormUpdate: App["handleFormUpdate"];
}

export class FrameSelection extends Component<FrameSelectionProps> {
  private headlineInput: RefObject<HTMLInputElement> = createRef();
  private subheadInput: RefObject<HTMLInputElement> = createRef();
  private sourceInput: RefObject<HTMLInputElement> = createRef();

  sendFormValues = () => {
    const { handleFormUpdate } = this.props;
    const headline = this.headlineInput.current?.value;
    const subhead = this.subheadInput.current?.value;
    const source = this.sourceInput.current?.value;

    handleFormUpdate(headline, subhead, source);
  };

  render() {
    const {
      frames,
      handleClick,
      toggleResonsive,
      toggleSelectAll,
      toggleResponsiveAll,
      headline,
      subhead,
      source,
    } = this.props;

    const selectCount = frames.filter((frame) => frame.selected).length;
    const someFramesSelected = selectCount > 0 && selectCount < frames.length;
    const allSelected = selectCount === frames.length;

    const responseCount = frames.filter((frame) => frame.responsive).length;
    const someResponsiveSelected =
      responseCount > 0 && responseCount < frames.length;
    const allResponsiveSelected = responseCount === frames.length;

    return (
      <div class="f2h__choose_frames">
        <div class="f2h__info_form">
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

        <div class="f2h__frame_selection">
          <label class="f2h__sel_header f2h__sel_header--name">
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
          <label class="f2h__sel_header f2h__sel_header--responsive">
            <input
              type="checkbox"
              id="responsiveAll"
              name="responsiveAll"
              onClick={toggleResponsiveAll}
              checked={allResponsiveSelected}
              ref={(el) => el && (el.indeterminate = someResponsiveSelected)}
            />{" "}
            Responsive
          </label>

          {frames.map(({ name, id, width, height, selected, responsive }) => (
            <Fragment>
              <p class="f2h__label f2h__label--name">
                <input
                  class="f2h__checkbox"
                  type="checkbox"
                  checked={selected}
                  onClick={() => handleClick(id)}
                  id={name}
                  name={name}
                />
                <label class="f2h__label--name-text" for={name}>
                  {name}
                </label>
                <span class="f2h__sel_width">
                  {width} x {height}
                </span>
              </p>

              <input
                class="f2h__checkbox f2h__input--responsive"
                type="checkbox"
                checked={responsive}
                onClick={() => toggleResonsive(id)}
                id={name}
                name={name}
              />
            </Fragment>
          ))}
        </div>
      </div>
    );
  }
}
