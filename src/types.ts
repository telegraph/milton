import { MSG_EVENTS, STAGES } from "./constants";

export interface FrameDataInterface {
  name: string;
  width: number;
  height: number;
  id: string;
  uid: string;
  textNodes: textData[];
}

export type MsgEventType =
  | MsgFramesType
  | MsgRenderType
  | MsgNoFramesType
  | MsgErrorType
  | MsgCompressImageType;

export interface IFrameData {
  frames: Omit<FrameDataInterface, "uid">[];
  headline: string | undefined;
  subhead: string | undefined;
  source: string | undefined;
}

export interface MsgFramesType extends IFrameData {
  type: MSG_EVENTS.FOUND_FRAMES;
}

export interface MsgRenderType {
  type: MSG_EVENTS.RENDER;
  svg: Uint8Array;
  frameId: string;
}

export interface MsgNoFramesType {
  type: MSG_EVENTS.NO_FRAMES;
}

export interface MsgErrorType {
  type: MSG_EVENTS.ERROR;
  errorText: string;
}

export interface MsgCompressImageType {
  type: MSG_EVENTS.COMPRESS_IMAGE;
  image: Uint8Array;
  width: number;
  height: number;
  uid: string;
}

export interface FrameCollection {
  [id: string]: FrameDataInterface;
}

export interface AppPropsInterface {
  version: string;
}

export interface AppState {
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
}

type textNodeSelectedProps = Pick<
  TextNode,
  | "x"
  | "y"
  | "width"
  | "height"
  | "characters"
  | "textAlignHorizontal"
  | "textAlignVertical"
  | "constraints"
>;

export interface textData extends textNodeSelectedProps {
  rangeStyles: ITextStyle[];
}

export interface setHeadlinesAndSourceProps {
  pageNode: PageNode;
  headline: string | undefined;
  subhead: string | undefined;
  source: string | undefined;
}

export interface HeadlinesInterface {
  headline: string | undefined;
  subhead: string | undefined;
  source: string | undefined;
}

export interface UiPostMessageEvent extends MessageEvent {
  data: {
    pluginMessage: MsgEventType;
  };
}

export interface IresizeImage {
  img: HTMLImageElement;
  imgData: Uint8Array;
  nodeDimensions: { width: number; height: number }[];
  resolve: (data: Uint8Array) => void;
  reject: (e: Error) => void;
}

export interface ITextProp {
  start: number;
  end: number;

  value: PluginAPI["mixed"] | string | number | FontName | RGB | undefined;
}

export interface ITextStyle {
  start: number;
  end: number;
  chars: string;
  font: FontName;
  colour: RGB;
  size: number;
  letterSpace: string;
  lineHeight: string;
}
