'use client';
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, X, Upload, QrCode, RotateCcw, Sun, Moon, CheckCircle, ArrowLeft, Smartphone, User, Move, Target } from 'lucide-react';
import QRCode from 'qrcode';

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  onClose: () => void;
  embedded?: boolean;
}

interface FacePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

const CameraCapture = ({ onCapture, onClose, embedded = false }: CameraCaptureProps) => {
  const [cameraState, setCameraState] = useState<'qr' | 'live' | 'preview'>('qr');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [currentCamera, setCurrentCamera] = useState<'front' | 'back'>('front');
  const [luminosity, setLuminosity] = useState<number>(0);
  const [showGuidance, setShowGuidance] = useState(false);
  const [facePosition, setFacePosition] = useState<FacePosition | null>(null);
  const [detectionInterval, setDetectionInterval] = useState<NodeJS.Timeout | null>(null);
  const [autoCaptureTimer, setAutoCaptureTimer] = useState<NodeJS.Timeout | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(true);
  const initializationInProgressRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (cameraState === 'live') {
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          startCamera();
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [cameraState]);

  const generateQRCode = async () => {
    setIsGeneratingQR(true);
    try {
      // Generate a unique session URL or data for the QR code
      const qrData = JSON.stringify({
        type: 'skin-analysis',
        sessionId: Date.now().toString(),
        timestamp: new Date().toISOString(),
        action: 'start-camera'
      });
      
      // Generate QR code as data URL
      const qrDataUrl = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      setQrCodeDataUrl(qrDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
      // Fallback to a simple pattern if QR generation fails
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 200;
      canvas.height = 200;

      // Simple fallback pattern
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, 200, 200);
      ctx.fillStyle = '#fff';
      ctx.fillRect(20, 20, 160, 160);
      ctx.fillStyle = '#000';
      ctx.fillRect(40, 40, 120, 120);
      ctx.fillStyle = '#fff';
      ctx.fillRect(60, 60, 80, 80);
      ctx.fillStyle = '#000';
      ctx.fillRect(80, 80, 40, 40);

      setQrCodeDataUrl(canvas.toDataURL());
    } finally {
      setIsGeneratingQR(false);
    }
  };

  const startCamera = async () => {
    if (initializationInProgressRef.current) {
      console.log('Camera initialization already in progress, skipping...');
      return;
    }
    
    if (!isMountedRef.current) {
      console.log('Component unmounted before initialization, skipping...');
      return;
    }
    
    initializationInProgressRef.current = true;
    
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Starting camera...');
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser');
      }
      
      if (stream) {
        console.log('Stopping existing stream...');
        stream.getTracks().forEach(track => track.stop());
      }
      
      console.log('Requesting camera access...');
      
      if (!isMountedRef.current) {
        console.log('Component unmounted before getUserMedia, stopping...');
        return;
      }
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: currentCamera,
          width: { ideal: 720 },
          height: { ideal: 1280 },
          aspectRatio: { ideal: 0.5625 } // 9:16 aspect ratio for portrait
        },
        audio: false,
      });
  
      if (!isMountedRef.current) {
        console.log('Component unmounted after getUserMedia, cleaning up...');
        mediaStream.getTracks().forEach(track => track.stop());
        return;
      }

      setStream(mediaStream);
      
      if (videoRef.current) {
        const video = videoRef.current;
        console.log('Setting video srcObject...');
        video.srcObject = mediaStream;
        
        // Add event listeners to debug video loading
        const onLoadedMetadata = () => {
          console.log('Video metadata loaded');
          console.log('Video ready state:', video.readyState);
          console.log('Video paused:', video.paused);
          console.log('Video current time:', video.currentTime);
        };
        
        const onCanPlay = () => {
          console.log('Video can play');
        };
        
        const onPlaying = () => {
          console.log('Video is playing');
        };
        
        video.addEventListener('loadedmetadata', onLoadedMetadata);
        video.addEventListener('canplay', onCanPlay);
        video.addEventListener('playing', onPlaying);
        
        // Simple video start with error handling
        try {
          await video.play();
          setIsCameraActive(true);
          setIsLoading(false);
          console.log('Camera started successfully');
          console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight);
          console.log('Video element dimensions:', video.offsetWidth, 'x', video.offsetHeight);
          
          // Start face detection
          startFaceDetection();
          
        } catch (playError) {
          console.log('Video play failed:', playError);
          
          // Handle AbortError specifically - this is normal when component unmounts
          if (playError instanceof Error && playError.name === 'AbortError') {
            console.log('Video play was aborted (component likely unmounted) - this is normal');
            return; // Don't show error for abort
          }
          
          // Try fallback approach
          try {
            console.log('Trying fallback video start...');
            // Wait a moment and try again
            await new Promise(resolve => setTimeout(resolve, 100));
            await video.play();
            setIsCameraActive(true);
            setIsLoading(false);
            console.log('Camera started successfully with fallback');
            
            // Start face detection
            startFaceDetection();
            
          } catch (fallbackError) {
            console.log('Fallback video start also failed:', fallbackError);
            setError('Could not start video. Please try again.');
            setIsLoading(false);
          }
        }
      }
      
    } catch (err) {
      console.error('Camera error:', err);
      
      // Handle AbortError specifically
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Camera initialization was aborted - this is normal');
        return; // Don't show error for abort
      }
      
      setError('Could not access camera. Please check permissions.');
      setIsLoading(false);
    } finally {
      initializationInProgressRef.current = false;
    }
  };

  const startFaceDetection = () => {
    if (!videoRef.current) return;
    
    // Add a small delay to ensure video is fully loaded
    setTimeout(() => {
      if (!videoRef.current || !isMountedRef.current) return;
      
      const interval = setInterval(() => {
        if (!videoRef.current || !isMountedRef.current) {
          clearInterval(interval);
          return;
        }
        
        detectFacePosition();
        getLuminosityStatus();
      }, 100);
      
      setDetectionInterval(interval);
    }, 500); // 500ms delay to ensure video is ready
  };

  const detectFacePosition = () => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Check if video has valid dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.log('Video dimensions not ready yet');
      return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Double-check canvas dimensions are valid
    if (canvas.width === 0 || canvas.height === 0) {
      console.log('Canvas dimensions are invalid');
      return;
    }
    
    try {
      ctx.drawImage(video, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Enhanced face detection simulation
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const faceSize = Math.min(canvas.width, canvas.height) * 0.4; // Slightly larger face area
      
      // Simulate face position with some variation
      const faceX = centerX - faceSize / 2 + (Math.random() - 0.5) * 50;
      const faceY = centerY - faceSize / 2 + (Math.random() - 0.5) * 30;
      
      setFacePosition({
        x: faceX,
        y: faceY,
        width: faceSize,
        height: faceSize * 1.3 // More realistic face proportions
      });
      
      // Auto-capture logic with better positioning
      if (facePosition && isFaceInPosition(facePosition)) {
        if (!autoCaptureTimer) {
          const timer = setTimeout(() => {
            if (isMountedRef.current) {
              capturePhoto();
            }
          }, 3000);
          setAutoCaptureTimer(timer);
          setCountdown(3);
          
          // Start countdown animation
          const countdownInterval = setInterval(() => {
            setCountdown(prev => {
              if (prev <= 1) {
                clearInterval(countdownInterval);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      } else {
        if (autoCaptureTimer) {
          clearTimeout(autoCaptureTimer);
          setAutoCaptureTimer(null);
          setCountdown(0);
        }
      }
    } catch (error) {
      console.error('Error in face detection:', error);
      // Don't update face position on error
    }
  };

  const isFaceInPosition = (face: FacePosition): boolean => {
    if (!videoRef.current) return false;
    
    const video = videoRef.current;
    const centerX = video.videoWidth / 2;
    const centerY = video.videoHeight / 2;
    const tolerance = 50;
    
    return Math.abs(face.x + face.width / 2 - centerX) < tolerance &&
           Math.abs(face.y + face.height / 2 - centerY) < tolerance;
  };

  const getLuminosityStatus = () => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Check if video has valid dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Double-check canvas dimensions are valid
    if (canvas.width === 0 || canvas.height === 0) {
      return;
    }
    
    try {
      ctx.drawImage(video, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      let totalLuminosity = 0;
      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        totalLuminosity += (r * 0.299 + g * 0.587 + b * 0.114);
      }
      
      const avgLuminosity = totalLuminosity / (imageData.data.length / 4);
      setLuminosity(avgLuminosity);
    } catch (error) {
      console.error('Error in luminosity detection:', error);
      // Don't update luminosity on error
    }
  };

  const isSkinTone = (r: number, g: number, b: number): boolean => {
    // Simple skin tone detection
    return r > 95 && g > 40 && b > 20 &&
           Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
           Math.abs(r - g) > 15 && r > g && r > b;
  };

  const getGuidanceMessage = (): string => {
    if (luminosity < 50) {
      return 'Move to a brighter area';
    } else if (luminosity > 200) {
      return 'Move to a less bright area';
    } else if (!facePosition) {
      return 'Place face inside frame';
    } else if (!isFaceInPosition(facePosition)) {
      return 'Turn face to camera';
    } else if (countdown > 0) {
      return 'Hold still...';
    } else {
      return 'Perfect! Hold still...';
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    if (detectionInterval) {
      clearInterval(detectionInterval);
      setDetectionInterval(null);
    }
    
    if (autoCaptureTimer) {
      clearTimeout(autoCaptureTimer);
      setAutoCaptureTimer(null);
      setCountdown(0);
    }
    
    setIsCameraActive(false);
    setFacePosition(null);
    initializationInProgressRef.current = false;
  };

  const switchCamera = () => {
    setCurrentCamera(currentCamera === 'front' ? 'back' : 'front');
    if (isCameraActive) {
      stopCamera();
      setTimeout(() => {
        if (isMountedRef.current) {
          startCamera();
        }
      }, 100);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    ctx.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    
    setCapturedImage(imageData);
    setCameraState('preview');
    stopCamera();
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setCameraState('live');
    setFacePosition(null);
  };

  const confirmPhoto = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setCapturedImage(result);
        setCameraState('preview');
      }
    };
    reader.readAsDataURL(file);
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  useEffect(() => {
    if (cameraState === 'qr') {
      generateQRCode();
    }
  }, [cameraState]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`${embedded ? 'absolute' : 'fixed'} inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4`}
      >
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-red-500 mb-4">
            <Camera size={48} className="mx-auto" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Camera Error</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg"
            >
              Close
            </button>
            <button
              onClick={() => {
                setError(null);
                startCamera();
              }}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg"
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`${embedded ? 'absolute' : 'fixed'} inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4`}
    >
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes slideIn {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes fadeInOut {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        
        .help {
          position: relative;
          z-index: 20;
        }
        
        .guidance {
          background: rgba(0, 0, 0, 0.9);
          border-radius: 1rem;
          padding: 0.75rem 1rem;
          backdrop-filter: blur(10px);
          animation: slideIn 0.3s ease-out;
          min-width: 200px;
          text-align: center;
        }
        
        .casing {
          position: relative;
          overflow: hidden;
          height: 1.25rem;
        }
        
        .placeholder, .reel {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 0.875rem;
          text-align: center;
        }
        
        .reel {
          animation: fadeInOut 2s infinite;
        }
        
        .countdown {
          animation: pulse 1s infinite;
        }
        
        .face-box {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
        }
      `}</style>
      
      <div 
        className={`bg-white w-full ${embedded ? 'h-full' : 'max-w-2xl h-full max-h-[90vh]'} rounded-2xl flex flex-col`}
        style={{ height: '100%' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {cameraState === 'qr' ? 'QR Code Scanner' : 'Skin Analysis Camera'}
            </h3>
            <p className="text-sm text-gray-600">
              {cameraState === 'qr' ? 'Take a photo with your smartphone' : 'Take a photo for analysis'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="relative bg-black flex-1 flex items-center justify-center p-4">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p>Starting camera...</p>
              </div>
            </div>
          )}
          
          {cameraState === 'qr' && (
            <div className="flex flex-col items-center justify-center gap-6 liqa-lg:gap-10">
              <div className="relative mb-10 flex size-[16rem] items-center justify-center overflow-hidden rounded-[2.5rem] bg-[rgb(var(--color))] text-[rgb(var(--background-color))] qr-code">
                {isGeneratingQR ? (
                  <div className="text-white text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p>Generating QR code...</p>
                  </div>
                ) : (
                  qrCodeDataUrl ? (
                    <img 
                      src={qrCodeDataUrl} 
                      alt="Scan this QR code to take a photo with your smartphone" 
                      className="size-full p-2"
                    />
                  ) : (
                    <QrCode size={120} className="text-gray-600" />
                  )
                )}
              </div>
              
              <div className="flex flex-col gap-2 text-center">
                <h2 className="!text-3xl text-xl tracking-tight">
                  Scan this QR code to take a photo with your smartphone
                </h2>
                <p className="!text-2xl mx-auto max-w-[22ch] text-base font-normal -tracking-[0.02rem] text-opacity-60 liqa-md:max-w-[30ch] liqa-lg:max-w-[35ch]">
                  The results will be shown here
                </p>
              </div>
            </div>
          )}
          
          {cameraState === 'live' && (
            <div className="relative w-full max-w-sm h-96 rounded-2xl border-2 border-gray-300 bg-gray-100">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover rounded-2xl -scale-x-100"
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#000',
                  display: 'block',
                  objectPosition: 'center'
                }}
              />
              
              {/* Face detection frame overlay */}
              {facePosition && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div 
                    className="relative flex h-full w-full items-center justify-center"
                    style={{
                      width: `${(facePosition.width / (videoRef.current?.videoWidth || 1)) * 100}%`,
                      height: `${(facePosition.height / (videoRef.current?.videoHeight || 1)) * 100}%`,
                    }}
                  >
                    {/* Face frame with animated border */}
                    <svg 
                      className="absolute inset-0 h-full w-full drop-shadow-[0px_0px_6px_currentColor]"
                      viewBox="0 0 240 317"
                    >
                      <rect 
                        x="8" 
                        y="8" 
                        width="224" 
                        height="301" 
                        rx="40" 
                        fill="none" 
                        strokeWidth="3" 
                        strokeLinecap="round" 
                        strokeDasharray="100, 173, 110, 96" 
                        vectorEffect="non-scaling-stroke" 
                        className="drop-shadow-[0px_0px_1px_rgba(0,0,0,0.4)] stroke-white"
                        style={{
                          animation: isFaceInPosition(facePosition) ? 'pulse 2s infinite' : 'none'
                        }}
                      />
                    </svg>
                  </div>
                </div>
              )}
              
              {/* Guidance overlay */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
                <div className="help">
                  <div className="guidance">
                    <div className="casing">
                      <div className="placeholder">
                        {getGuidanceMessage()}
                      </div>
                      <div className="reel">
                        {getGuidanceMessage()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Countdown overlay */}
              {countdown > 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="countdown absolute top-1/2 transform -translate-y-1/2 text-[3.5rem] leading-none text-white [text-shadow:0px_0px_1px_rgba(0,0,0,0.4)]">
                    {countdown}
                  </p>
                </div>
              )}
              
              {/* Luminosity indicator */}
              <div className="absolute top-2 right-2 flex items-center gap-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                {luminosity < 50 ? <Moon size={12} /> : <Sun size={12} />}
                <span>{Math.round(luminosity)}</span>
              </div>
              
              {/* Camera status indicator */}
              {isCameraActive && (
                <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-xs z-20">
                  Camera Active
                </div>
              )}
              
              {/* Debug info */}
              {isCameraActive && videoRef.current && (
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs z-20">
                  {videoRef.current.videoWidth} x {videoRef.current.videoHeight}
                </div>
              )}
            </div>
          )}

          {cameraState === 'preview' && (
            <div className="relative w-full max-w-sm h-96 rounded-2xl border-2 border-gray-300">
              <img
                src={capturedImage!}
                alt="Captured photo"
                className="w-full h-full object-cover rounded-2xl"
              />
            </div>
          )}
          
          {/* Upload button overlay */}
          <div className="absolute top-4 right-4">
            <button
              onClick={triggerFileUpload}
              className="p-3 bg-black bg-opacity-50 text-white rounded-full backdrop-blur-sm"
            >
              <Upload size={20} />
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 bg-gray-50">
          {cameraState === 'qr' && (
            <div className="flex w-full flex-col items-center justify-center gap-2 liqa-lg:flex-row">
              <button
                onClick={() => setCameraState('live')}
                className="w-full liqa-lg:max-w-[16rem] relative overflow-hidden before:absolute before:inset-0 before:opacity-0 before:transition-opacity enabled:active:before:opacity-15 medium button secondary before:bg-white flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 text-gray-800 hover:bg-gray-300 rounded-lg font-medium"
                type="button"
                aria-label="Continue on desktop"
              >
                <Camera size={20} className="shrink-0" />
                Continue on desktop
              </button>
              
              <label
                className="w-full liqa-lg:max-w-[16rem] relative overflow-hidden before:absolute before:inset-0 before:opacity-0 before:transition-opacity enabled:active:before:opacity-15 medium button secondary before:bg-white flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 text-gray-800 hover:bg-gray-300 rounded-lg font-medium cursor-pointer"
                aria-label="Upload from device"
                role="button"
                tabIndex={0}
              >
                <Upload size={20} className="shrink-0" />
                Upload from device
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="absolute hidden"
                />
              </label>
            </div>
          )}

          {cameraState === 'live' && (
            <div className="flex flex-col items-center gap-4">
              {/* Camera controls */}
              <div className="flex items-center gap-4">
                <button
                  onClick={switchCamera}
                  className="p-3 bg-gray-200 text-gray-800 rounded-full hover:bg-gray-300"
                >
                  <RotateCcw size={20} />
                </button>
                
                <button
                  onClick={capturePhoto}
                  disabled={!isCameraActive || isLoading}
                  className="w-16 h-16 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all flex items-center justify-center rounded-full shadow-lg"
                >
                  <Camera size={24} />
                </button>
                
                <button
                  onClick={() => setShowGuidance(!showGuidance)}
                  className="p-3 bg-gray-200 text-gray-800 rounded-full hover:bg-gray-300"
                >
                  <User size={20} />
                </button>
              </div>
              
              {/* Tips */}
              <div className="text-center text-sm text-gray-600">
                <p className="flex items-center justify-center gap-2 mb-2">
                  <Move size={16} />
                  Position your face in the center
                </p>
                <p className="flex items-center justify-center gap-2">
                  <CheckCircle size={16} />
                  Good lighting for best results
                </p>
              </div>
              
              <button
                onClick={triggerFileUpload}
                className="px-6 py-3 bg-gray-200 text-gray-800 hover:bg-gray-300 transition-all rounded-xl font-semibold flex items-center gap-2"
              >
                <Upload size={20} />
                Upload Photo
              </button>
            </div>
          )}

          {cameraState === 'preview' && (
            <div className="flex gap-4">
              <button
                onClick={retakePhoto}
                className="flex-1 px-6 py-4 bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors rounded-xl font-semibold"
              >
                Retake
              </button>
              <button
                onClick={confirmPhoto}
                className="flex-1 px-6 py-4 bg-blue-600 text-white hover:bg-blue-700 transition-colors rounded-xl font-semibold"
              >
                Use Photo
              </button>
            </div>
          )}
        </div>

        {/* Hidden elements */}
        <canvas ref={canvasRef} className="hidden" />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>
    </motion.div>
  );
};

export default CameraCapture; 