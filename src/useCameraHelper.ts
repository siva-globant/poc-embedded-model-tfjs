import { useState } from "react";
type ILoadingState = Record<
  "fetchingCameraCapability" | "fetchingCameraInfo" | "fetchingCameraStream",
  boolean
>;

const useCameraHelper = () => {
  const [loading, setLoading] = useState<ILoadingState>({
    fetchingCameraCapability: false,
    fetchingCameraInfo: false,
    fetchingCameraStream: false,
  });
  const [cameraCapability, setCameraCapability] =
    useState<MediaTrackCapabilities | null>(null);

  const getCameraStream = async (config: MediaStreamConstraints) => {
    if (!("MediaRecorder" in window)) {
      alert("MediaRecorder not supported");
      return null;
    }
    try {
      return navigator.mediaDevices.getUserMedia(config);
    } catch (e) {
      console.log(e);
    }
    return null;
  };

  const loadCameraCapability = async () => {
    setLoading({ ...loading, fetchingCameraCapability: true });
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );

      const device = videoDevices[0];
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: device.deviceId, facingMode: "environment" },
      });
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities();
      setCameraCapability(capabilities);
      stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      console.error("Error:", error);
    }
    setLoading({ ...loading, fetchingCameraCapability: false });
  };

  return {
    loading,
    cameraCapability,
    loadCameraCapability,
    getCameraStream,
  };
};
export default useCameraHelper;
