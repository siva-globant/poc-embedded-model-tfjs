import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, PropsWithChildren } from "react";
import "./App.css";
import useCameraHelper from "./useCameraHelper";
import {
  useMonitoring,
  SentryOperation,
  SentryTransaction,
  SentryTag,
  SentrySpan,
  type SentryTransactionObject,
} from "./context";

import {
  average,
  msToTime,
  getCurrentMemoryUsage,
  getHighlighterStyle,
} from "./helper";
import {
  ResolutionValueUnions,
  BitRateValueUnions,
  FrameRateValueUnions,
  ISelectRecord,
  ICameraProps,
} from "./types";
const RESOLUTIONS: Array<ISelectRecord<ResolutionValueUnions>> = [
  {
    label: "4K Ultra HD (3840x2160)",
    value: "3840x2160",
  },
  {
    label: "1080p",
    value: "1920x1080",
  },
  {
    label: "720p",
    value: "1280x720",
  },
  {
    label: "480p",
    value: "640x480",
  },
];
const BIT_RATES: Array<ISelectRecord<BitRateValueUnions>> = [
  {
    label: "1 GB bps",
    value: "8000000000",
  },
  {
    label: "100 MB bps",
    value: "800000000",
  },
  {
    label: "1 MB bps",
    value: "8000000",
  },
  {
    label: "100 KB bps",
    value: "800000",
  },
  {
    label: "1 KB bps",
    value: "8000",
  },
  {
    label: "100 Bytes bps",
    value: "800",
  },
];
const FRAME_RATES: Array<ISelectRecord<FrameRateValueUnions>> = [
  {
    label: "15 FPS",
    value: "15",
  },
  {
    label: "24 FPS",
    value: "24",
  },
  {
    label: "30 FPS",
    value: "30",
  },
  {
    label: "60 FPS",
    value: "60",
  },
];

const isPortrait = true,
  COMPRESSION_RATIO = 0.8,
  IS_SAFARI = /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
  MIME_TYPE = IS_SAFARI ? "video/mp4;codecs=avc1" : "video/webm;codecs=vp8";

function Camera(props: PropsWithChildren<ICameraProps>) {
  // useProfiler("Camera");
  const { onVideoElementLoadedMeta, onVideoStop, boundingBox, children } =
    props;
  const { measurePerformance } = useMonitoring();
  let memoryUsageInterval: NodeJS.Timeout | null = null,
    memoryUsages: number[] = [],
    record_start_at = 0;
  const { cameraCapability, getCameraStream, loadCameraCapability, loading } =
    useCameraHelper();

  const mediaRecordRef = useRef<MediaRecorder | null>(null);
  const videoEleRef = useRef<HTMLVideoElement>(null);
  // const mediaChunks = useRef<Blob[]>([]);
  const mediaStream = useRef<MediaStream | null>(null);
  const transaction = useRef<SentryTransactionObject | null>(null);

  const [isRecording, setIsRecording] = useState<boolean>(false);

  const [currentResolution, setCurrentResolution] =
    useState<ResolutionValueUnions>();
  const [currentBitRate, setCurrentBitRate] = useState<BitRateValueUnions>();
  const [currentFrameRate, setCurrentFrameRate] =
    useState<FrameRateValueUnions>();
  // const [recordedVideo, setRecordedVideo] = useState<IRecordedVideoState[]>([]);

  const startCamera = async () => {
    try {
      const [mediaWidth, mediaHeight] = currentResolution
        ? currentResolution.split("x")
        : [];
      const videoStream = await getCameraStream({
        audio: false,
        video: {
          width: isPortrait ? Number(mediaHeight) : Number(mediaWidth),
          height: isPortrait ? Number(mediaWidth) : Number(mediaHeight),
          facingMode: "environment",
          frameRate: currentFrameRate ? Number(currentFrameRate) : undefined,
        },
      });
      if (!videoStream) return;

      // const tracks = videoStream.getVideoTracks();
      mediaStream.current = new MediaStream(videoStream);

      if (videoEleRef.current) {
        videoEleRef.current.srcObject = videoStream;
        videoEleRef.current.onloadeddata = () =>
          onVideoElementLoadedMeta(videoEleRef.current);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const startMemoryRecorder = () => {
    if (!memoryUsageInterval) {
      memoryUsageInterval = setInterval(() => {
        memoryUsages.push(getCurrentMemoryUsage());
      }, 1000);
    }
  };
  const stopMemoryRecorder = () => {
    if (memoryUsageInterval) {
      clearInterval(memoryUsageInterval);
      memoryUsageInterval = null;
    }
  };
  const getAverageMemoryUsed = (clearMemoryUsage = true) => {
    console.log({ memoryUsages });
    const avgMemUsage = average(memoryUsages);
    if (clearMemoryUsage) memoryUsages = [];
    return avgMemUsage;
  };

  useEffect(() => {
    loadCameraCapability();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cameraCapability) {
      const {
        frameRate,
        width: { max: supportedMaxWidth } = {},
        height: { max: supportedMinHeight } = {},
      } = cameraCapability;
      if (frameRate?.max) {
        const matchedFrameRateIndex = FRAME_RATES.findIndex(
          (e) => e.value === String(frameRate.max)
        );
        setCurrentFrameRate(FRAME_RATES[matchedFrameRateIndex]?.value);
      }
      if (supportedMaxWidth && supportedMinHeight) {
        const matchedResIndex = RESOLUTIONS.findIndex((e) => {
          const [w, h] = e.value.split("x"); //1920x1080
          return (
            supportedMaxWidth >= Number(w) && supportedMinHeight >= Number(h)
          );
        });

        setCurrentResolution(RESOLUTIONS[matchedResIndex]?.value);
      }
    }
  }, [cameraCapability]);

  useEffect(() => {
    if (currentResolution && currentFrameRate) {
      const [w, h] = currentResolution.split("x");
      const bitRate =
        Number(w) * Number(h) * Number(currentFrameRate) * COMPRESSION_RATIO;
      const matchedBitRateIndex = BIT_RATES.findIndex(
        (e) => Number(e.value) <= bitRate
      );
      setCurrentBitRate(BIT_RATES[matchedBitRateIndex]?.value);
    }
  }, [currentFrameRate, currentResolution]);

  const startRecording = async () => {
    startMemoryRecorder();
    record_start_at = new Date().getTime();
    transaction.current = measurePerformance(
      SentryTransaction.VIDEO_PROCESSING,
      SentryOperation.VIDEO_CAPTURE
    );
    const { setTag, setMeasurement, startSpan, finishSpan, finish } =
      transaction.current;

    startSpan(SentrySpan.ASK_PERMISSION, null);
    await startCamera();
    finishSpan(SentrySpan.ASK_PERMISSION);

    startSpan(SentrySpan.TAKE_VIDEO, null);
    setIsRecording(true);
    if (!mediaStream.current) return alert("Cannot record Now");
    const media = new MediaRecorder(mediaStream.current, {
      mimeType: MIME_TYPE,
      bitsPerSecond: Number(currentBitRate),
    });
    mediaRecordRef.current = media;
    mediaRecordRef.current.start();
    mediaRecordRef.current.onerror = (event) => {
      console.log("OnError", event);
    };
    mediaRecordRef.current.onstop = async () => {
      finishSpan(SentrySpan.TAKE_VIDEO);
      setTag(SentryTag.RESOLUTION, currentResolution as string);
      setTag(SentryTag.BIT_RATE, currentBitRate as string);
      setTag(SentryTag.FRAME_RATE, currentFrameRate as string);

      //measure the Memory usage

      stopMemoryRecorder();
      const averageMemoryUsage = getAverageMemoryUsed();
      setTag(SentryTag.AVG_MEMORY_USAGE, `${averageMemoryUsage} MB`);
      setMeasurement("avg_memory_used", averageMemoryUsage, "megabyte");

      //measure the total duration of prediction
      const max_capture_time = new Date().getTime() - record_start_at;
      record_start_at = 0;
      setTag(SentryTag.MAX_CAPTURE_TIME, msToTime(max_capture_time));

      finish();
    };
  };
  const stopRecording = () => {
    setIsRecording(false);
    if (!mediaRecordRef.current) return;
    mediaRecordRef.current.stop();
    onVideoStop?.();
    if (mediaStream.current)
      mediaStream.current.getTracks().forEach((track) => track.stop());
    if (videoEleRef.current) videoEleRef.current.srcObject = null;
  };
  const onResolutionChange = (
    event: ChangeEvent<HTMLSelectElement> & {
      target: { value: ResolutionValueUnions };
    }
  ) => {
    setCurrentResolution(event.target.value);
  };
  const onBitRateChange = (
    event: ChangeEvent<HTMLSelectElement> & {
      target: { value: BitRateValueUnions };
    }
  ) => {
    setCurrentBitRate(event.target.value);
  };
  const onFrameRateChange = (
    event: ChangeEvent<HTMLSelectElement> & {
      target: { value: FrameRateValueUnions };
    }
  ) => {
    setCurrentFrameRate(event.target.value);
  };
  const { frameRate, height, width } = cameraCapability ?? {};
  const highlighterStyle = getHighlighterStyle(
    boundingBox,
    videoEleRef.current
  );
  if (loading.fetchingCameraCapability) {
    return (
      <div
        style={{
          height: "90vh",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div className="loader" />
        <div>
          Fetching Camera info <br />
          Press "Allow" to get Camera Info
        </div>
      </div>
    );
  }
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "36px",
        }}
      >
        <div style={{ flex: 4 }}>
          <div
            style={{
              height: "80vh",
              backgroundColor: "greenyellow",
            }}
          >
            <video
              style={{ width: "100%", height: "100%", aspectRatio: 9 / 16 }}
              ref={videoEleRef}
              autoPlay
              muted
              playsInline
            />
            {isRecording ? (
              <div className="highlighter" style={highlighterStyle} />
            ) : null}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-around",
              alignItems: "center",
              padding: "10px 0px",
            }}
          >
            <div>
              <span>Resolution: </span>
              <select value={currentResolution} onChange={onResolutionChange}>
                {RESOLUTIONS.map(({ label, value }) => (
                  <option key={`resolutions#${value}`} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span>FPS: </span>
              <select value={currentFrameRate} onChange={onFrameRateChange}>
                {FRAME_RATES.map(({ label, value }) => (
                  <option
                    disabled={Number(value) > Number(frameRate?.max)}
                    key={`frame_rates#${value}`}
                    value={value}
                  >
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span>BitRate: </span>
              <select
                disabled
                value={currentBitRate}
                onChange={onBitRateChange}
              >
                {BIT_RATES.map(({ label, value }) => (
                  <option key={`bit_rates#${value}`} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <br />
            <button onClick={isRecording ? stopRecording : startRecording}>
              {isRecording ? "Stop Analyzing" : "Analyze"}
            </button>
          </div>
        </div>
        <div
          style={{
            flex: 5,
            maxHeight: "80vh",
            overflowY: "scroll",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              backgroundColor: "grey",
              padding: "8px",
              margin: "8px 0px",
            }}
          >
            Camera Info
            <br />
            <span>Max FPS : {frameRate?.max || "N/A"}</span>
            <span>
              Max Resolution(WxH) : {`${width?.max}x${height?.max}` || "N/A"}
            </span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export default Camera;
