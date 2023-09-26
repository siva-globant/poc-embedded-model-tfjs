import { useEffect, useRef, useState } from "react";
import "@tensorflow/tfjs-backend-cpu";
import "@tensorflow/tfjs-backend-webgl";
import * as mobilenet from "@tensorflow-models/mobilenet";
import type { MobileNet } from "@tensorflow-models/mobilenet";

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

const mobileNetModelURL =
  import.meta.env.BASE_URL + "/mobilenet-model/model.json";
interface IObjectDetectionModelInfo<T> {
  model?: T;
  loading?: boolean;
  load_start_at?: number;
  load_end_at?: number;
}
interface IPrediction {
  className: string;
  probability: number;
}
function MobileNetModel() {
  const { measurePerformance } = useMonitoring();

  const [mobileNetModelInfo, setMobileNetModelInfo] = useState<
    IObjectDetectionModelInfo<MobileNet>
  >({
    loading: false,
  });
  const [predictions, setPredictions] = useState<IPrediction[]>([]);

  const requestIDRef = useRef<number | null>(null);
  const transaction = useRef<SentryTransactionObject | null>(null);
  const pps = useRef<number[]>([]);
  const accurate_pps = useRef<number[]>([]);

  const startMobileNetModelTransaction = () => {
    if (!transaction.current) {
      transaction.current = measurePerformance(
        SentryTransaction.MOBILE_NET_MODEL,
        SentryOperation.MOBILE_NET_MODEL
      );
    }
  };

  const loadMobileNetModel = async () => {
    setMobileNetModelInfo({
      ...mobileNetModelInfo,
      loading: true,
    });
    if (!transaction.current) {
      console.log("Transaction not initiated", transaction.current);
      return;
    }
    const { startSpan, finishSpan, setMeasurement } = transaction.current;
    startSpan(SentrySpan.MODEL_LOADING, null);
    const load_start_at = new Date().getTime();
    const model = await mobilenet.load({
      modelUrl: mobileNetModelURL,
      version: 2,
      alpha: 1,
    });
    const load_end_at = new Date().getTime();
    finishSpan(SentrySpan.MODEL_LOADING);
    setMeasurement(
      "model_loading_time",
      (load_end_at - load_start_at) / 1000,
      "second"
    );
    // finish();
    setMobileNetModelInfo({
      load_start_at,
      load_end_at,
      loading: false,
      model,
    });
  };

  const predictMobileNet = (videoElement: HTMLVideoElement) => {
    const { model } = mobileNetModelInfo;
    if (!model) return;

    model.classify(videoElement, 2).then((modelPredictions) => {
      const current_time = new Date().getTime();
      pps.current.push(current_time);
      const accuratePrediction = modelPredictions.some(
        (e) => e.probability >= 0.5
      );
      if (accuratePrediction) {
        accurate_pps.current.push(current_time);
        setPredictions(modelPredictions);
      }

      // Call this function again to keep predicting when the browser is ready.
      requestIDRef.current = requestAnimationFrame(() =>
        predictMobileNet(videoElement)
      );
    });
  };

  const onVideoElementLoadedMeta = (videoElement: HTMLVideoElement | null) => {
    if (!transaction.current) startMobileNetModelTransaction();
    transaction.current?.startSpan(SentrySpan.MODEL_PREDICTION, null);
    if (videoElement) predictMobileNet(videoElement);
  };

  const onVideStopHandler = () => {
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
    pps.current = [];
    accurate_pps.current = [];
  };

  useEffect(() => {
    startMobileNetModelTransaction();
    if (!mobileNetModelInfo.loading) {
      loadMobileNetModel();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { load_end_at, load_start_at, loading } = mobileNetModelInfo;
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
        onVideoStop={onVideStopHandler}
        onVideoElementLoadedMeta={onVideoElementLoadedMeta}
      >
        <div>
          <h3>Model Info</h3>
          <div>
            <span>Model Name: MobileNet</span>
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
                </tr>
              </thead>
              <tbody>
                {predictions.map(({ className, probability }, index) => (
                  <tr key={`prediction#${index}`}>
                    <th
                      style={{ textAlign: "left", overflow: "hidden" }}
                      scope="row"
                    >
                      {className}
                    </th>
                    <td>{probability.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      </Camera>
    </div>
  );
}

export default MobileNetModel;
