'use client';
import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, RotateCcw, Download, X } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  onClose: () => void;
}

const CameraCapture = ({ onCapture, onClose }: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Start camera when component mounts
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user', // Use front camera
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(mediaStream);
      setIsCameraActive(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please check permissions and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      setStream(null);
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw the current video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to base64 image data
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageData);
      }
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
  };

  const confirmPhoto = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  const switchCamera = async () => {
    stopCamera();
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay
    await startCamera();
  };

  if (error) {
    return (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
      >
        <div className="bg-white p-8 max-w-md mx-4 text-center">
          <div className="text-red-500 mb-4">
            <Camera size={48} className="mx-auto" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Camera Access Error</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
            <button
              onClick={startCamera}
              className="flex-1 px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
    >
      <div className="bg-white max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-xl font-semibold">Take a Photo</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 transition-colors"
            aria-label="Close camera"
            title="Close camera"
          >
            <X size={24} />
          </button>
        </div>

        {/* Camera View */}
        <div className="relative bg-black">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p>Starting camera...</p>
              </div>
            </div>
          )}

          {!capturedImage ? (
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-auto max-h-[60vh] object-cover"
              />
              
              {/* Camera Overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
                  <button
                    onClick={switchCamera}
                    className="p-2 bg-black bg-opacity-50 text-white hover:bg-opacity-70 transition-all pointer-events-auto"
                    aria-label="Switch camera"
                    title="Switch camera"
                  >
                    <RotateCcw size={20} />
                  </button>
                </div>
                
                {/* Capture Guide */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="border-2 border-white border-opacity-50 w-64 h-64 max-w-[80%] max-h-[60%]"></div>
                </div>
                
                <div className="absolute bottom-4 left-4 right-4 text-center text-white">
                  <p className="text-sm opacity-75">Position your face within the frame</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative">
              <img
                src={capturedImage}
                alt="Captured photo"
                className="w-full h-auto max-h-[60vh] object-cover"
              />
              
              {/* Photo Overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-25 flex items-center justify-center">
                <div className="text-center text-white">
                  <Download size={48} className="mx-auto mb-2 opacity-75" />
                  <p className="text-sm">Photo captured</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-4 bg-gray-50">
          {!capturedImage ? (
            <div className="flex justify-center">
              <button
                onClick={capturePhoto}
                disabled={!isCameraActive || isLoading}
                className="w-16 h-16 bg-primary-600 text-white hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                aria-label="Capture photo"
                title="Capture photo"
              >
                <Camera size={24} />
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={retakePhoto}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors"
              >
                Retake
              </button>
              <button
                onClick={confirmPhoto}
                className="flex-1 px-4 py-3 bg-primary-600 text-white hover:bg-primary-700 transition-colors"
              >
                Use Photo
              </button>
            </div>
          )}
        </div>

        {/* Hidden canvas for capturing */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </motion.div>
  );
};

export default CameraCapture; 