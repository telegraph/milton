import { MSG_EVENTS, STAGES } from "constants";

export type FrameDataInterface = {
  name: string;
  width: number;
  height: number;
  id: string;
  uid: string;
  textNodes: textData[];
  fixedPositionNodes: string[];
};

export type MsgEventType =
  | MsgFramesType
  | MsgRenderType
  | MsgNoFramesType
  | MsgErrorType
  | MsgCompressImageType;

export type IFrameData = {
  frames: Omit<FrameDataInterface, "uid">[];
  headline: string | undefined;
  subhead: string | undefined;
  source: string | undefined;
};

export type MsgFramesType = IFrameData & {
  type: MSG_EVENTS.FOUND_FRAMES;
};

export type MsgRenderType = {
  type: MSG_EVENTS.RENDER;
  svg: Uint8Array;
  frameId: string;
};

export type MsgNoFramesType = {
  type: MSG_EVENTS.NO_FRAMES;
};

export type MsgErrorType = {
  type: MSG_EVENTS.ERROR;
  errorText: string;
};

export type MsgCompressImageType = {
  type: MSG_EVENTS.COMPRESS_IMAGE;
  image: Uint8Array;
  width: number;
  height: number;
  uid: string;
};

export interface FrameCollection {
  [id: string]: FrameDataInterface;
}

export type AppPropsInterface = {
  version: string;
};

export type AppState = {
  readonly error: string | undefined;
  readonly ready: boolean;
  readonly frames: FrameCollection;
  readonly stage: STAGES;
  readonly responsive: boolean;
  readonly headline: string | undefined;
  readonly subhead: string | undefined;
  readonly source: string | undefined;
  readonly selectedFrames: string[];
  readonly svgMarkup: string;
  readonly loading: boolean;
};

type textNodeSelectedProps = Pick<
  TextNode,
  | "x"
  | "y"
  | "width"
  | "height"
  | "textAlignHorizontal"
  | "textAlignVertical"
  | "constraints"
  | "strokeWeight"
>;

export type textData = textNodeSelectedProps & {
  rangeStyles: TextRange[];
  id: string;
  strokeColour: string;
};

export type setHeadlinesAndSourceProps = {
  pageNode: PageNode;
  headline: string | undefined;
  subhead: string | undefined;
  source: string | undefined;
};

export type HeadlinesInterface = {
  headline: string | undefined;
  subhead: string | undefined;
  source: string | undefined;
};

export interface UiPostMessageEvent extends MessageEvent {
  data: {
    pluginMessage: MsgEventType;
  };
}

export type IresizeImage = {
  imgData: Uint8Array;
  nodeDimensions: { width: number; height: number }[];
};

export type FontStyle = Pick<TextRange, "weight" | "family" | "italic">;

export type ITextStyle = {
  family: string | null;
  weight: number;
  colour: string;
  lineHeight: string | null;
  letterSpacing: string | null;
  size: number | null;
  italic: boolean;
};

export type TextRange = ITextStyle & { text: string };

export type imageNodeDimensions = {
  name: string;
  width: number;
  height: number;
};
export type FrameRender = {
  svgData: Uint8Array;
  imageNodeDimensions: imageNodeDimensions[];
};
