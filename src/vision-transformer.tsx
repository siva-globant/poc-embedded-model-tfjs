import { useEffect, useRef, useState } from "react";
import "@tensorflow/tfjs-backend-cpu";
import "@tensorflow/tfjs-backend-webgl";
import useVisionTransformerModel from "./hooks/useVisionTransformerModel";
import Camera from "./camera";
import "./App.css";
import {
  useMonitoring,
  SentryOperation,
  SentryTransaction,
  SentrySpan,
  type SentryTransactionObject,
} from "./context";

interface IObjectDetectionModelInfo {
  loading?: boolean;
  load_start_at?: number;
  load_end_at?: number;
}
interface IPrediction {
  className: string;
  probability: number;
}

function msToTime(duration: number): string {
  const milliseconds = Math.floor((duration % 1000) / 100);
  let seconds: string | number = Math.floor((duration / 1000) % 60),
    minutes: string | number = Math.floor((duration / (1000 * 60)) % 60),
    hours: string | number = Math.floor((duration / (1000 * 60 * 60)) % 24);

  hours = hours < 10 ? "0" + hours : hours;
  minutes = minutes < 10 ? "0" + minutes : minutes;
  seconds = seconds < 10 ? "0" + seconds : seconds;

  return hours + ":" + minutes + ":" + seconds + "." + milliseconds;
}
function VisionTransformer() {
  // useProfiler("MainApp");
  const { measurePerformance } = useMonitoring();
  const { loadModel, predict } = useVisionTransformerModel();

  const [modelInfo, setModelInfo] = useState<IObjectDetectionModelInfo>({
    loading: false,
  });
  const [predictions, setPredictions] = useState<IPrediction[]>([]);

  const transaction = useRef<SentryTransactionObject | null>(null);

  const initiateModel = async () => {
    try {
      setModelInfo({
        ...modelInfo,
        loading: true,
      });
      if (!transaction.current) {
        console.log("Transaction not initiated", transaction.current);
        return;
      }
      const { finish, startSpan, finishSpan } = transaction.current;
      startSpan(SentrySpan.LOADING_VIT_MODEL, null);
      const load_start_at = new Date().getTime();
      await loadModel();
      finishSpan(SentrySpan.LOADING_VIT_MODEL);
      finish();
      setModelInfo({
        load_start_at,
        load_end_at: new Date().getTime(),
        loading: false,
      });
    } catch (e) {
      console.log(e);
    }
  };

  const predictModelOutput = (videoElement: HTMLVideoElement) => {
    predict(videoElement).then((modelPredictions) => {
      console.log(modelPredictions);
      setPredictions([]);
      requestAnimationFrame(() => predictModelOutput(videoElement));
    });
  };

  const onVideoElementLoadedMeta = (videoElement: HTMLVideoElement | null) => {
    if (videoElement) predictModelOutput(videoElement);
  };
  useEffect(() => {
    transaction.current = measurePerformance(
      SentryTransaction.MOBILE_NET_MODEL,
      SentryOperation.MOBILE_NET_MODEL
    );

    initiateModel();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { load_end_at, load_start_at, loading } = modelInfo;
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
      <Camera onVideoElementLoadedMeta={onVideoElementLoadedMeta}>
        <div>
          <h3>Model Info</h3>
          <div>
            <span>Model Name: Vision Transform</span>
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

export default VisionTransformer;
