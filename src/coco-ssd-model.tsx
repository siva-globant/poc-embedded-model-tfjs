import { useEffect, useRef, useState } from "react";
import "@tensorflow/tfjs-backend-cpu";
import "@tensorflow/tfjs-backend-webgl";
import * as cocoSSD from "@tensorflow-models/coco-ssd";
import type {
  DetectedObject,
  ObjectDetection,
} from "@tensorflow-models/coco-ssd";

import Camera from "./camera";
import "./App.css";
import {
  useMonitoring,
  SentryOperation,
  SentryTransaction,
  SentrySpan,
  type SentryTransactionObject,
} from "./context";
import { getMetrics, msToTime } from "./helper";
interface IObjectDetectionModelInfo<T> {
  model?: T;
  loading?: boolean;
  load_start_at?: number;
  load_end_at?: number;
}

function CocoSSD() {
  const { measurePerformance } = useMonitoring();

  const [objectDetectionModelInfo, setObjectDetectionModelInfo] = useState<
    IObjectDetectionModelInfo<ObjectDetection>
  >({
    loading: false,
  });
  const [predictions, setPredictions] = useState<DetectedObject[]>([]);
  const [boundingBox, setBoundingBox] = useState<DetectedObject["bbox"]>([
    0, 0, 0, 0,
  ]);

  const requestIDRef = useRef<number | null>(null);
  const transaction = useRef<SentryTransactionObject | null>(null);
  const pps = useRef<number[]>([]);
  const accurate_pps = useRef<number[]>([]);

  const startModelTransaction = () => {
    if (!transaction.current) {
      transaction.current = measurePerformance(
        SentryTransaction.COCO_SSD_MODEL,
        SentryOperation.COCO_SSD_MODEL
      );
    }
  };

  const loadCocoSSDModel = async () => {
    setObjectDetectionModelInfo({
      ...objectDetectionModelInfo,
      loading: true,
    });
    startModelTransaction();
    if (transaction.current === null) {
      console.log("Transaction not initiated", transaction.current);
      return;
    }
    const { startSpan, finishSpan, setMeasurement } = transaction.current;
    startSpan(SentrySpan.MODEL_LOADING, null);
    const load_start_at = new Date().getTime();
    const model = await cocoSSD.load({
      modelUrl: "/coco-ssd-model/model.json",
    });
    const load_end_at = new Date().getTime();
    finishSpan(SentrySpan.MODEL_LOADING);
    setMeasurement(
      "model_loading_time",
      (load_end_at - load_start_at) / 1000,
      "second"
    );
    //finish();
    setObjectDetectionModelInfo({
      load_start_at,
      load_end_at,
      loading: false,
      model,
    });
  };

  const predictCocoSSD = (videoElement: HTMLVideoElement) => {
    const { model } = objectDetectionModelInfo;
    if (!model) return;

    model.detect(videoElement).then(function (predictions) {
      const current_time = new Date().getTime();
      pps.current.push(current_time);
      const accuratePredictionIndex = predictions.findIndex(
        (e) => e.score >= 0.6
      );
      if (accuratePredictionIndex !== -1) {
        accurate_pps.current.push(current_time);
        setPredictions(predictions.slice(accuratePredictionIndex, 1));
        setBoundingBox(predictions[accuratePredictionIndex].bbox);
      }

      // Call this function again to keep predicting when the browser is ready.
      requestIDRef.current = requestAnimationFrame(() =>
        predictCocoSSD(videoElement)
      );
    });
  };

  const onVideoElementLoadedMeta = (videoElement: HTMLVideoElement | null) => {
    console.log("onVideoElementLoadedMeta Called");

    if (!transaction.current) startModelTransaction();
    transaction.current?.startSpan(SentrySpan.MODEL_PREDICTION, null);
    if (videoElement) predictCocoSSD(videoElement);
  };

  const onVideoStopHandler = () => {
    if (requestIDRef.current) cancelAnimationFrame(requestIDRef.current);
    if (transaction.current) {
      transaction.current.finishSpan(SentrySpan.MODEL_PREDICTION);
      const { setMeasurement, finish } = transaction.current;
      const {
        avg_count_ps: pps_avg_count,
        avg_interval_ps: pps_avg_interval_ps,
        avg_interval: pps_avg_interval,
      } = getMetrics(pps.current);
      const {
        avg_count_ps: accurate_pps_avg_count,
        avg_interval_ps: accurate_pps_avg_interval_ps,
        avg_interval: accurate_pps_avg_interval,
      } = getMetrics(accurate_pps.current);
      console.log({
        pps_avg_count,
        pps_avg_interval_ps,
        pps_avg_interval,
        accurate_pps_avg_count,
        accurate_pps_avg_interval_ps,
        accurate_pps_avg_interval,
      });
      setMeasurement("avg_pps_count", pps_avg_count, "none");
      setMeasurement("avg_pps_interval", pps_avg_interval_ps, "millisecond");
      setMeasurement(
        "avg_prediction_interval",
        pps_avg_interval,
        "millisecond"
      );

      setMeasurement("avg_accurate_pps_count", accurate_pps_avg_count, "none");
      setMeasurement(
        "avg_accurate_pps_interval",
        accurate_pps_avg_interval_ps,
        "none"
      );

      setMeasurement(
        "avg_accurate_prediction_interval",
        accurate_pps_avg_interval,
        "none"
      );

      finish();
      transaction.current = null;
    }
    setPredictions([]);
    setBoundingBox([0, 0, 0, 0]);
    pps.current = [];
    accurate_pps.current = [];
  };

  useEffect(() => {
    // startModelTransaction();
    if (!objectDetectionModelInfo.loading) loadCocoSSDModel();
    return () => {
      transaction.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { load_end_at, load_start_at, loading } = objectDetectionModelInfo;
  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div className="loader" />
        <div>
          Please Wait <br />
          Loading the model
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      <Camera
        boundingBox={boundingBox}
        onVideoStop={onVideoStopHandler}
        onVideoElementLoadedMeta={onVideoElementLoadedMeta}
      >
        <div>
          <h3>Model Info</h3>
          <div>
            <span>Model Name: Coco SSD</span>
            <br />
            {load_end_at && load_start_at ? (
              <span>
                Loading Time(H:M:S.MS): {msToTime(load_end_at - load_start_at)}
              </span>
            ) : null}
            <br />
          </div>
          <br />
          {predictions.length > 0 ? (
            <table style={{ width: "100%", tableLayout: "fixed" }}>
              <caption>
                <h3>Model Output</h3>
              </caption>
              <thead>
                <tr>
                  <th scope="col">Object Name</th>
                  <th scope="col">Probability</th>
                  <th scope="col">Boundaries</th>
                </tr>
              </thead>
              <tbody>
                {predictions
                  .slice(0, 1)
                  .map(
                    (
                      {
                        class: className,
                        score: probability,
                        bbox: [x, y, width, height],
                      },
                      index
                    ) => (
                      <tr key={`prediction#${index}`}>
                        <th
                          style={{ textAlign: "left", overflow: "hidden" }}
                          scope="row"
                        >
                          {className}
                        </th>
                        <td>{probability.toFixed(2)}</td>

                        <td>
                          <span>x:{x.toFixed(2)}</span>
                          <br />
                          <span>y:{y.toFixed(2)}</span>
                          <br />
                          <span>width:{width.toFixed(2)}</span>
                          <br />
                          <span>height:{height.toFixed(2)}</span>
                          <br />
                        </td>
                      </tr>
                    )
                  )}
              </tbody>
            </table>
          ) : null}
        </div>
      </Camera>
    </div>
  );
}

export default CocoSSD;
