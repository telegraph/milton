import { MSG_EVENTS, STAGES } from "./constants";

export type FrameDataType = {
  name: string;
  width: number;
  height: number;
  id: string;
  uid: string;
  textNodes: textData[];
  responsive: boolean;
  selected: boolean;
  svg: string | undefined;
  svgCompressed: string | undefined;
  svgOptimised: boolean;
};

export type MsgEventType =
  | MsgFramesType
  | MsgRenderType
  | MsgNoFramesType
  | MsgErrorType
  | MsgCompressImageType;

export interface MsgFramesType {
  type: MSG_EVENTS.FOUND_FRAMES;
  frames: Omit<FrameDataType, "uid">[];
  windowWidth: number;
  windowHeight: number;
  headline: string | undefined;
  subhead: string | undefined;
  source: string | undefined;
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
  quality: number;
  uid: string;
}

export interface MsgCompressedImageType {
  type: MSG_EVENTS.COMPRESSED_IMAGE;
  image: Uint8Array;
  uid: string;
}

export interface FrameCollection {
  [id: string]: FrameDataType;
}

export type AppState = {
  error: undefined | string;
  ready: boolean;
  frames: FrameCollection;
  stage: STAGES;
  previewIndex: number;
  isResizing: boolean;
  mouseStartX: number;
  mouseStartY: number;
  windowWidth: number;
  windowHeight: number;
  responsive: boolean;
  headline: string | undefined;
  subhead: string | undefined;
  source: string | undefined;
  loading: boolean;
};

type textNodeSelectedProps = Pick<
  TextNode,
  | "x"
  | "y"
  | "width"
  | "height"
  | "characters"
  | "lineHeight"
  | "letterSpacing"
  | "textAlignHorizontal"
  | "textAlignVertical"
>;

export interface textData extends textNodeSelectedProps {
  colour: { r: number; g: number; b: number; a: number };
  fontSize: number;
  fontFamily: string;
  fontStyle: string;
}

interface MsgCloseInterface {
  type: MSG_EVENTS.CLOSE;
}
interface MsgDomReadyInterface {
  type: MSG_EVENTS.DOM_READY;
}

interface MsgRenderInterface {
  type: MSG_EVENTS.RENDER;
  frameId: string;
}

interface MsgErrorInterface {
  type: MSG_EVENTS.ERROR;
}

interface MsgResizeInterface {
  type: MSG_EVENTS.RESIZE;
  width: number;
  height: number;
}

interface MsgHeadlinesInterface {
  type: MSG_EVENTS.UPDATE_HEADLINES;
  headline: string | undefined;
  subhead: string | undefined;
  source: string | undefined;
}

export type PostMsg =
  | MsgCompressedImageType
  | MsgErrorInterface
  | MsgCloseInterface
  | MsgDomReadyInterface
  | MsgResizeInterface
  | MsgRenderInterface
  | MsgHeadlinesInterface;

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
