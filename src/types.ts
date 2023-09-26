export type { MobileNet } from "@tensorflow-models/mobilenet";
import type { DetectedObject } from "@tensorflow-models/coco-ssd";
export type ResolutionValueUnions =
  | "1920x1080"
  | "1280x720"
  | "640x480"
  | "3840x2160";
export type BitRateValueUnions =
  | "8000000000"
  | "800000000"
  | "8000000"
  | "800000"
  | "8000"
  | "800";
export type FrameRateValueUnions = "15" | "24" | "30" | "60";

export interface ISelectRecord<T = string> {
  label: string;
  value: T;
}
export interface ICameraProps {
  onVideoStop?: () => void;
  boundingBox?: DetectedObject["bbox"];
  onVideoElementLoadedMeta: (eleRef: HTMLVideoElement | null) => void;
}
export interface IObjectDetectionModelInfo<T> {
  model?: T;
  loading?: boolean;
  load_start_at?: number;
  load_end_at?: number;
}
export interface IPrediction {
  className: string;
  probability: number;
}
export interface IHighlighterStyle {
  left?: string;
  top?: string;
  width?: string;
  height?: string;
}
