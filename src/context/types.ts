import type { Transaction } from "@sentry/react";
/**
 * Monitoring config interface
 */
export interface MonitoringConfig {
  /**
   * DSN key for sentry.io application
   */
  dsn: string;
  /**
   * The current environment of your application (e.g. "production")
   */
  environment: string;
  /**
   * Enable debug functionality in the SDK itself
   */
  debug: boolean;
  /**
   * Release version of current application
   */
  release: string;
  /**
   * Sample rate to determine trace sampling.
   *
   * 0.0 = 0% chance of a given trace being sent (send no traces) 1.0 = 100% chance of a given trace being sent (send
   * all traces)
   *
   * Tracing is enabled if either this or `tracesSampler` is defined. If both are defined, `tracesSampleRate` is
   * ignored.
   */
  tracesSampleRate: number;
  /**
   * Array of all the origin to browser trace.
   */
  tracingOrigins: string[];
  /**
   * Custom tags to add in all transaction.
   */
  customTags?: { [tag: string]: string };
}

/**
 * Sentry transaction object interface
 */
export interface SentryTransactionObject
  extends Pick<Transaction, "setMeasurement"> {
  /**
   * Set tag in a transaction instance
   */
  setTag: (name: string, value: string) => void;

  /**
   * Create a span in a transaction instance to measure the performance for a sub event
   */
  startSpan: (
    op: string,
    data: { [key: string]: number | string } | null
  ) => void;

  /**
   * Finish a running span in a transaction instance and complete the measurement for a sub event
   */
  finishSpan: (op: string) => void;

  /**
   * Finish a running transaction instance and complete the measurement for a main event
   */
  finish: (status?: string) => void;
}

/**
 * Monitoring context interface
 */
export interface MonitoringContext {
  /**
   * Set current user for sentry.
   */
  setMonitoringUser: (id: string) => void;

  /**
   * Store the error in the monitoring application.
   */
  errorHandler: (error: Error | string) => string | null;

  /**
   * Start Measure Performance
   */
  measurePerformance: (
    name: string,
    op: string,
    data?: { [key: string]: number | string }
  ) => SentryTransactionObject;

  /**
   * Set custom measurement value
   */
  setMeasurement: (
    transactionName: string,
    name: string,
    value: number,
    unit: string
  ) => void;
}

/**
 * Monitoring configuration interface
 */
export interface MonitoringProps {
  /**
   * Configuration to initialize Sentry
   */
  config: MonitoringConfig;
}

/**
 * The status of an Transaction/Span.
 */
export enum MonitoringStatus {
  /** The operation completed successfully. */
  OK = "ok",
  /** Unknown. Any non-standard HTTP status code. */
  UNKNOWN_ERROR = "unknown_error",
  /** The operation was cancelled (typically by the user). */
  CANCELLED = "cancelled",
  /** The operation was aborted, typically due to a concurrency issue. */
  ABORTED = "aborted",
}

/**
 * The name of entities in Sentry
 */
export enum SentryTransaction {
  VIDEO_PROCESSING = "Video Processing",
  MOBILE_NET_MODEL = "EmbeddedModel-MobileNet",
  COCO_SSD_MODEL = "EmbeddedModel-CocoSSD",
}

export enum SentryOperation {
  VIDEO_CAPTURE = "video_capturing",
  MOBILE_NET_MODEL = "embedded_model_mobile_net",
  COCO_SSD_MODEL = "embedded_model_coco_ssd",
}

export enum SentrySpan {
  ASK_PERMISSION = "Asking Permission",
  TAKE_VIDEO = "Take Video",
  BLOB_MERGING = "Blob merging",
  MODEL_LOADING = "Model loading",
  MODEL_PREDICTION = "Model prediction",
  LOADING_MOBILE_NET_MODEL = "Loading Mobile Net Model",
  LOADING_DEEP_LAB_MODEL = "Loading Deep Lab Model",
  LOADING_MASK_RCNN_MODEL = "Loading Mask RCNN Model",
  LOADING_VIT_MODEL = "Loading VIT Model",
}

export enum SentryTag {
  RESOLUTION = "video_config.resolution",
  BIT_RATE = "video_config.bit_rate",
  FRAME_RATE = "video_config.frame_rate",
  VIDEO_WIDTH = "video_info.width",
  VIDEO_HEIGHT = "video_info.height",
  VIDEO_FPS = "video_info.fps",
  VIDEO_DURATION = "video_info.duration",
  VIDEO_SIZE = "video_info.size",
  AVG_MEMORY_USAGE = "measurements.average_memory_usage",
  MAX_CAPTURE_TIME = "measurements.max_capture_time",
  EMBEDDED_MODEL = "embeddedModel",
}
