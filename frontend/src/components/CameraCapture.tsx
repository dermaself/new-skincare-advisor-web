'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, RotateCcw, ArrowLeft, Check } from 'lucide-react';

interface CameraCaptureProps {
  onImageCapture: (imageUrl: string) => void;
  onBack: () => void;
}

export default function CameraCapture({ onImageCapture, onBack }: CameraCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError('Unable to access camera. Please check permissions and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to data URL
    const imageUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(imageUrl);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
  };

  const usePhoto = () => {
    if (capturedImage) {
      onImageCapture(capturedImage);
    }
  };

  const switchCamera = async () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: stream?.getVideoTracks()[0]?.getSettings().facingMode === 'user' ? 'environment' : 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError('Unable to switch camera.');
    }
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="card text-center"
      >
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
            <Camera className="w-8 h-8 text-primary-600 animate-pulse" />
          </div>
          <p className="text-gray-600">Initializing camera...</p>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="card text-center"
      >
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <Camera className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-red-600">{error}</p>
          <div className="flex space-x-4">
            <button onClick={onBack} className="btn-secondary">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </button>
            <button onClick={startCamera} className="btn-primary">
              <RotateCcw className="w-4 h-4 mr-2" />
              Retry
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card"
    >
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        
        <h2 className="text-xl font-semibold text-gray-900">Take Photo</h2>
        
        <button
          onClick={switchCamera}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <RotateCcw className="w-5 h-5" />
          <span className="hidden sm:inline">Switch</span>
        </button>
      </div>

      <div className="relative">
        {!capturedImage ? (
          <div className="camera-overlay">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-64 md:h-96 object-cover rounded-lg"
            />
            
            {/* Camera guide overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-white border-dashed rounded-full opacity-50"></div>
            </div>
            
            {/* Instructions */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center text-white bg-black bg-opacity-50 px-4 py-2 rounded-lg">
              <p className="text-sm">Position your face within the circle</p>
            </div>
          </div>
        ) : (
          <div className="relative">
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-64 md:h-96 object-cover rounded-lg"
            />
            
            {/* Overlay for captured image */}
            <div className="absolute inset-0 bg-black bg-opacity-20 rounded-lg"></div>
          </div>
        )}

        {/* Hidden canvas for capturing */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="mt-6 flex justify-center space-x-4">
        {!capturedImage ? (
          <button
            onClick={captureImage}
            className="btn-primary px-8"
          >
            <Camera className="w-5 h-5 mr-2" />
            Capture Photo
          </button>
        ) : (
          <>
            <button
              onClick={retakePhoto}
              className="btn-secondary px-8"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Retake
            </button>
            <button
              onClick={usePhoto}
              className="btn-primary px-8"
            >
              <Check className="w-5 h-5 mr-2" />
              Use Photo
            </button>
          </>
        )}
      </div>

      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          For best results, ensure good lighting and a clear view of your face
        </p>
      </div>
    </motion.div>
  );
} 