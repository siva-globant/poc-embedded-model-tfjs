import * as tf_con from "@tensorflow/tfjs-converter";
import * as tf from "@tensorflow/tfjs";
import type { GraphModel } from "@tensorflow/tfjs-converter";
import { useRef } from "react";

const IMAGE_SIZE = 224,
  MODEL_URL = "https://tfhub.dev/sayakpaul/vit_s16_fe/1";

export default () => {
  const modelRef = useRef<GraphModel | null>(null);
  const loadModel = async () => {
    const model = await tf_con.loadGraphModel(MODEL_URL, { fromTFHub: true });

    //Warmup the model
    const result = tf.tidy(() =>
      model.predict(tf.zeros([1, IMAGE_SIZE, IMAGE_SIZE, 3]))
    ) as tf.Tensor;
    await result.data();
    result.dispose();

    modelRef.current = model;
  };
  const predict = (
    media:
      | tf.Tensor3D
      | ImageData
      | HTMLImageElement
      | HTMLCanvasElement
      | HTMLVideoElement
  ) => {
    if (!modelRef.current) throw "Model not found fst call load model";
    if (!(media instanceof tf.Tensor)) {
      media = tf.browser.fromPixels(media);
    }
    return modelRef.current.predictAsync(media);
  };

  return {
    loadModel,
    predict,
  };
};
