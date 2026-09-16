import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, X, Check, Upload } from 'lucide-react';
import { compressImageToTarget } from '../utils/helpers';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string, sizeKb: number) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setPreviewUrl(null);
      setCompressedSize(null);
      setCameraError(null);
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('உங்கள் உலாவியில் கேமரா வசதி ஆதரிக்கப்படவில்லை.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment',
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: unknown) {
      console.error('Camera access error:', err);
      setCameraActive(false);
      const msg = err instanceof Error ? err.message : 'கேமராவை இயக்க முடியவில்லை';
      setCameraError(
        `${msg}. தயவுசெய்து கேமரா அனுமதியை சரிபார்க்கவும் அல்லது கோப்பைப் பதிவேற்றவும்.`
      );
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    setIsProcessing(true);
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not available');

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Compress to ~124 KB target as specified in requirement
      const { dataUrl, sizeKb } = await compressImageToTarget(canvas, 124);
      setPreviewUrl(dataUrl);
      setCompressedSize(sizeKb);
      stopCamera();
    } catch (err) {
      console.error('Capture error:', err);
      alert('புகைப்படம் எடுப்பதில் சிக்கல் ஏற்பட்டது.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const { dataUrl, sizeKb } = await compressImageToTarget(file, 124);
      setPreviewUrl(dataUrl);
      setCompressedSize(sizeKb);
      stopCamera();
    } catch (err) {
      console.error('File upload error:', err);
      alert('படத்தை சுருக்குவதில் சிக்கல் ஏற்பட்டது.');
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmPhoto = () => {
    if (previewUrl && compressedSize !== null) {
      onCapture(previewUrl, compressedSize);
      onClose();
    }
  };

  const retakePhoto = () => {
    setPreviewUrl(null);
    setCompressedSize(null);
    startCamera();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-5 py-3">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-blue-700" />
            <h3 className="font-semibold text-gray-900">
              கடிதப் புகைப்படம் எடுத்தல் (இலக்கு: ~124 KB)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5">
          {previewUrl ? (
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-lg border border-gray-300 bg-black text-center">
                <img
                  src={previewUrl}
                  alt="Captured"
                  className="max-h-80 w-full object-contain mx-auto"
                />
                <span className="absolute top-2 right-2 rounded-md bg-black/75 px-2.5 py-1 text-xs font-bold text-white">
                  அளவு: {compressedSize} KB (124 KB இணக்கம்)
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={retakePhoto}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  <RefreshCw className="h-4 w-4" />
                  மீண்டும் எடுக்க
                </button>
                <button
                  type="button"
                  onClick={confirmPhoto}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  <Check className="h-4 w-4" />
                  இணைக்க (Use Photo)
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {cameraError ? (
                <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800 border border-amber-200">
                  <p className="font-medium">{cameraError}</p>
                  <div className="mt-3">
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white p-4 text-center font-medium text-blue-700 hover:bg-blue-50">
                      <Upload className="h-5 w-5" />
                      <span>சாதனத்திலிருந்து படத்தைத் தெரிவு செய்க (~124 KB ஆக சுருக்கப்படும்)</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative overflow-hidden rounded-lg bg-black">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="h-72 w-full object-cover"
                    />
                    {!cameraActive && (
                      <div className="absolute inset-0 flex items-center justify-center text-sm text-white">
                        கேமரா தொடங்குகிறது...
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      disabled={!cameraActive || isProcessing}
                      onClick={capturePhoto}
                      className="flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50"
                    >
                      <Camera className="h-5 w-5" />
                      <span>{isProcessing ? 'சுருக்கப்படுகிறது...' : 'புகைப்படம் எடுக்க (Capture ~124KB)'}</span>
                    </button>

                    <div className="text-center text-xs text-gray-500">அல்லது</div>

                    <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100">
                      <Upload className="h-4 w-4" />
                      <span>கோப்பிலிருந்து பதிவேற்றுக (Upload Image)</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
