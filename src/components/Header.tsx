import { h } from "preact";
import { deflate } from "pako";
import { STAGES, UI_TEXT, FRAME_WARNING_SIZE } from "../constants";

export function SvgInformation(props: { svgMarkup: string }): h.JSX.Element {
  const { svgMarkup } = props;

  const fileKbSize = svgMarkup.length / 1000;
  const isFileLarge = fileKbSize > FRAME_WARNING_SIZE;
  let fileSizeClassName = "f2h__file_size";
  if (isFileLarge) {
    fileSizeClassName += " f2h__file_size f2h__notice--error";
  }

  const gzipSize = (deflate(svgMarkup).buffer.byteLength / 1024).toFixed(2);

  return (
    <p className="f2h__info">
      <span className="f2h__info_meta">
        Filesize
        <span
          className={fileSizeClassName}
          title={`Uncompressed ${fileKbSize.toFixed(2)}KB`}
        >
          {gzipSize}KB
        </span>
      </span>
    </p>
  );
}

export function HeaderTitle(props: { stage: STAGES }): h.JSX.Element {
  const { stage } = props;

  let title = "";

  switch (stage) {
    case STAGES.CHOOSE_FRAMES:
      title = UI_TEXT.TITLE_CHOOSE_FRAME;
      break;

    case STAGES.RESPONSIVE_PREVIEW:
      title = UI_TEXT.TITLE_RESPONSIVE_PREVIEW;
      break;

    case STAGES.SAVE_OUTPUT:
      title = UI_TEXT.TILE_OUTPUT;
      break;
  }

  return <h1 className="f2h__title">{title}</h1>;
}
