import { useCallback, useRef, useState } from "react";
import { Button, HStack, Image, Text } from "@chakra-ui/react";
import WebCamera from "./WebCamera";

export default function CameraComposer({ onClose, onSend, onFallbackAlbum, uploading }) {
  const cameraRef = useRef(null);
  const fallbackInputRef = useRef(null);
  const [facingMode, setFacingMode] = useState("environment");
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [lastTap, setLastTap] = useState(0);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");

  const setPreview = (file) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError("");
  };

  const handleCameraError = useCallback((err) => {
    setError(err.message || "Không mở được camera.");
  }, []);

  const switchCamera = () => setFacingMode((mode) => (mode === "environment" ? "user" : "environment"));

  const handlePreviewTap = () => {
    const now = Date.now();
    if (now - lastTap < 280) {
      switchCamera();
      setLastTap(0);
      return;
    }
    setLastTap(now);
  };

  const capture = async () => {
    try {
      const file = await cameraRef.current.capture();
      setPreview(file);
      navigator.vibrate?.(10);
    } catch (err) {
      setError(err.message);
    }
  };

  const retake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewFile(null);
    setPreviewUrl("");
  };

  const send = async () => {
    if (!previewFile) return;
    await onSend(previewFile);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewFile(null);
    setPreviewUrl("");
  };

  const handleFallback = (files) => {
    const file = files?.[0];
    if (file) setPreview(file);
    if (fallbackInputRef.current) fallbackInputRef.current.value = "";
  };

  return (
    <div className="locket-camera-panel">
      <input
        ref={fallbackInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(event) => handleFallback(event.target.files)}
      />

      <HStack className="locket-camera-top" justify="space-between">
        <Button className="locket-icon-button" onClick={onClose}>Đóng</Button>
        <HStack>
          <Button className="locket-icon-button" onClick={() => setTorchEnabled((value) => !value)} disabled={!torchSupported}>
            {torchEnabled ? "Flash on" : "Flash"}
          </Button>
          <Button className="locket-icon-button" onClick={switchCamera}>
            Xoay
          </Button>
        </HStack>
      </HStack>

      {previewUrl ? (
        <div className="locket-camera-preview">
          <Image src={previewUrl} alt="Ảnh vừa chụp" className="locket-camera-video" />
        </div>
      ) : (
        <div onClick={handlePreviewTap}>
          <WebCamera
            ref={cameraRef}
            facingMode={facingMode}
            torchEnabled={torchEnabled}
            zoom={zoom}
            onError={handleCameraError}
            onReady={setCameraReady}
            onTorchSupport={setTorchSupported}
          />
        </div>
      )}

      {!previewUrl && !error && (
        <div className="locket-zoom-row">
          <span>1x</span>
          <input type="range" min="1" max="4" step="0.1" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
          <span>{zoom.toFixed(1)}x</span>
        </div>
      )}

      {error && (
        <div className="locket-camera-error">
          <Text>{error}</Text>
          <Button size="sm" colorPalette="orange" onClick={() => fallbackInputRef.current?.click()}>
            Chụp bằng trình duyệt
          </Button>
        </div>
      )}

      <HStack className="locket-camera-actions" justify="space-around">
        {previewUrl ? (
          <>
            <Button className="locket-icon-button" onClick={retake} disabled={uploading}>Chụp lại</Button>
            <Button className="locket-send-button" colorPalette="orange" onClick={send} loading={uploading}>Gửi</Button>
            <Button className="locket-icon-button" onClick={onFallbackAlbum} disabled={uploading}>Album</Button>
          </>
        ) : (
          <>
            <Button className="locket-icon-button" onClick={onFallbackAlbum}>Album</Button>
            <button className="locket-shutter" onClick={capture} disabled={uploading || !cameraReady} aria-label="Chụp ảnh" />
            <Button className="locket-icon-button" onClick={() => fallbackInputRef.current?.click()}>Fallback</Button>
          </>
        )}
      </HStack>
    </div>
  );
}
