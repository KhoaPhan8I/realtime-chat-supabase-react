import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

const WebCamera = forwardRef(function WebCamera({ facingMode, torchEnabled, zoom, onError, onReady, onTorchSupport }, ref) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);

  useImperativeHandle(ref, () => ({
    async capture() {
      const video = videoRef.current;
      if (!video || !video.videoWidth || !video.videoHeight) {
        throw new Error("Camera chưa sẵn sàng.");
      }

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
      if (!blob) throw new Error("Không chụp được ảnh.");
      return new File([blob], `locket-${Date.now()}.jpg`, { type: "image/jpeg" });
    },
  }));

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        setReady(false);
        onReady?.(false);
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Trình duyệt không hỗ trợ camera trực tiếp.");
        }

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
          setReady(true);
          onReady?.(true);
        }

        const track = stream.getVideoTracks()[0];
        const canTorch = Boolean(track?.getCapabilities?.().torch);
        onTorchSupport?.(canTorch);
      } catch (err) {
        onReady?.(false);
        onTorchSupport?.(false);
        onError?.(err);
      }
    }

    start();
    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [facingMode, onError, onTorchSupport]);

  useEffect(() => {
    const track = streamRef.current?.getVideoTracks?.()[0];
    if (!track?.getCapabilities?.().torch) return;
    track.applyConstraints({ advanced: [{ torch: torchEnabled }] }).catch(() => {});
  }, [torchEnabled]);

  useEffect(() => {
    const track = streamRef.current?.getVideoTracks?.()[0];
    const capabilities = track?.getCapabilities?.();
    if (!capabilities?.zoom) return;
    const value = Math.min(Math.max(zoom, capabilities.zoom.min), capabilities.zoom.max);
    track.applyConstraints({ advanced: [{ zoom: value }] }).catch(() => {});
  }, [zoom]);

  return (
    <div className="locket-camera-preview">
      <video ref={videoRef} className="locket-camera-video" autoPlay playsInline muted />
      {!ready && <div className="locket-camera-loading">Đang mở camera...</div>}
    </div>
  );
});

export default WebCamera;
