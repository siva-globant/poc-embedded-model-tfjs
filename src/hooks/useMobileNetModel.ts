import { useRef, useState } from "react";
import * as mobilenet from "@tensorflow-models/mobilenet";
import type { IObjectDetectionModelInfo, MobileNet } from "./../types";
import {
  useMonitoring,
  SentryOperation,
  SentryTransaction,
  SentrySpan,
  type SentryTransactionObject,
} from "./../context";

export default () => {
  const { measurePerformance } = useMonitoring();
  const transaction = useRef<SentryTransactionObject>(
    measurePerformance(
      SentryTransaction.MOBILE_NET_MODEL,
      SentryOperation.VIDEO_CAPTURE
    )
  );
  const [mobileNetModelInfo, setMobileNetModelInfo] = useState<
    IObjectDetectionModelInfo<MobileNet>
  >({
    loading: false,
  });

  const loadMobileNetModel = async () => {
    setMobileNetModelInfo({
      ...mobileNetModelInfo,
      loading: false,
    });
    if (!transaction.current) {
      console.log("Transaction not initiated", transaction.current);
      return;
    }
    const { finish, startSpan, finishSpan } = transaction.current;
    startSpan(SentrySpan.LOADING_MOBILE_NET_MODEL, null);
    const load_start_at = new Date().getTime();
    const model = await mobilenet.load({
      version: 2,
      alpha: 1,
    });
    finishSpan(SentrySpan.LOADING_MOBILE_NET_MODEL);
    finish();
    setMobileNetModelInfo({
      load_start_at,
      load_end_at: new Date().getTime(),
      loading: false,
      model,
    });
  };
  return {
    loadMobileNetModel,
  };
};
