'use client';
import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, RotateCcw, X, Upload, Sun, Moon, CheckCircle, ArrowLeft, Smartphone, User, Move, Target } from 'lucide-react';
import QRCode from 'qrcode';

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  onClose: () => void;
}

type CameraState = 'qr' | 'live' | 'preview';

interface FacePosition {
  x: number; // 0-1, where 0.5 is center
  y: number; // 0-1, where 0.5 is center
  size: number; // 0-1, relative to frame size
  confidence: number; // 0-1
}

const CameraCapture = ({ onCapture, onClose }: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentCamera, setCurrentCamera] = useState<'front' | 'back'>('front');
  const [luminosity, setLuminosity] = useState<number>(0);
  const [showGuidance, setShowGuidance] = useState(true);
  const [cameraState, setCameraState] = useState<CameraState>('qr');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [facePosition, setFacePosition] = useState<FacePosition | null>(null);
  const [detectionInterval, setDetectionInterval] = useState<NodeJS.Timeout | null>(null);
  const [autoCaptureTimer, setAutoCaptureTimer] = useState<NodeJS.Timeout | null>(null);
  const [countdown, setCountdown] = useState<number>(0);

  // Generate QR code when component mounts
  useEffect(() => {
    if (cameraState === 'qr') {
      generateQRCode();
    }
  }, [cameraState]);

  // Start camera when switching to live state
  useEffect(() => {
    console.log('Camera state changed to:', cameraState);
    if (cameraState === 'live') {
      console.log('Starting camera...');
      // Start camera immediately, video element will be set up when available
      startCamera();
    } else {
      console.log('Stopping camera...');
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [cameraState]);

  // Monitor luminosity and face position
  useEffect(() => {
    if (!videoRef.current || !isCameraActive) return;

    const checkFrame = () => {
      if (videoRef.current) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (context) {
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          context.drawImage(videoRef.current, 0, 0);
          
          // Check luminosity
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          let totalLuminance = 0;
          
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
            totalLuminance += luminance;
          }
          
          const avgLuminance = totalLuminance / (data.length / 4);
          setLuminosity(avgLuminance);

          // Face detection
          detectFacePosition(context, canvas.width, canvas.height);
        }
      }
    };

    const interval = setInterval(checkFrame, 1000); // Check every 1 second for debugging
    setDetectionInterval(interval);
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCameraActive]);

  // Handle auto-capture timer
  useEffect(() => {
    if (!facePosition || !isCameraActive) {
      // Clear timer if no face detected or camera not active
      if (autoCaptureTimer) {
        clearTimeout(autoCaptureTimer);
        setAutoCaptureTimer(null);
      }
      setCountdown(0);
      return;
    }

    const { x, y, size } = facePosition;
    
    // Define the frame boundaries (same as in getGuidanceMessage)
    const frameLeft = 0.0;
    const frameRight = 1.0;
    const frameTop = 0.0;
    const frameBottom = 1.0;
    const frameCenterX = 0.5;
    const frameCenterY = 0.5;
    const tolerance = 0.08;
    const targetSize = 0.25;

    // Check if face is in perfect position
    const isInFrame = x >= frameLeft && x <= frameRight && y >= frameTop && y <= frameBottom;
    const isCentered = Math.abs(x - frameCenterX) < tolerance && Math.abs(y - frameCenterY) < tolerance;
    const isGoodSize = Math.abs(size - targetSize) < targetSize * 0.25;

    if (isInFrame && isCentered && isGoodSize) {
      // Start auto-capture timer if not already started
      if (!autoCaptureTimer) {
        setCountdown(3);
        const timer = setTimeout(() => {
          console.log('Auto-capturing photo...');
          capturePhoto();
          setCountdown(0);
        }, 3000); // 3 seconds
        setAutoCaptureTimer(timer);
      }
    } else {
      // Clear timer if face is not in perfect position
      if (autoCaptureTimer) {
        clearTimeout(autoCaptureTimer);
        setAutoCaptureTimer(null);
      }
      setCountdown(0);
    }
  }, [facePosition, isCameraActive, autoCaptureTimer]);

  // Handle countdown display
  useEffect(() => {
    if (countdown > 0) {
      const countdownTimer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(countdownTimer);
    }
  }, [countdown]);

  const detectFacePosition = (context: CanvasRenderingContext2D, width: number, height: number) => {
    // Simplified and more reliable face detection
    const imageData = context.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    let faceX = 0;
    let faceY = 0;
    let skinPixels = 0;
    let totalPixels = 0;

    // Sample every 4th pixel for performance
    for (let y = 0; y < height; y += 4) {
      for (let x = 0; x < width; x += 4) {
        const index = (y * width + x) * 4;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        
        if (isSkinTone(r, g, b)) {
          faceX += x;
          faceY += y;
          skinPixels++;
        }
        totalPixels++;
      }
    }

    if (skinPixels > 0) {
      const avgX = faceX / skinPixels / width;
      const avgY = faceY / skinPixels / height;
      const size = Math.sqrt(skinPixels / totalPixels);
      const confidence = Math.min(skinPixels / (totalPixels * 0.02), 1); // Lower threshold for better detection

      console.log('Face detected:', { x: avgX, y: avgY, size, confidence, skinPixels, totalPixels });
      
      setFacePosition({
        x: avgX,
        y: avgY,
        size: size,
        confidence: confidence
      });
    } else {
      console.log('No face detected');
      setFacePosition(null);
    }
  };

  const isSkinTone = (r: number, g: number, b: number): boolean => {
    // Simplified and more reliable skin tone detection
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    
    // Basic skin tone range
    const isInSkinRange = (
      r > 60 && r < 250 &&
      g > 20 && g < 230 &&
      b > 10 && b < 200 &&
      luminance > 40 && luminance < 240
    );

    // Simple ratio check
    const rgRatio = r / g;
    const rbRatio = r / b;

    const hasGoodRatios = (
      rgRatio > 0.8 && rgRatio < 3.5 &&
      rbRatio > 0.8 && rbRatio < 4.5
    );

    return isInSkinRange && hasGoodRatios;
  };

  const getGuidanceMessage = () => {
    console.log('Getting guidance for face position:', facePosition);
    
    if (!facePosition || facePosition.confidence < 0.05) {
      return {
        title: "No Face Detected",
        message: "Position your face in the camera view",
        icon: User,
        color: "text-red-400",
        priority: 1
      };
    }

    const { x, y, size } = facePosition;
    
    // Define the frame boundaries (now relative to the cropped video area)
    // Since the video is cropped to the frame, the boundaries are the full area
    const frameLeft = 0.0;   // 0% from left (full width)
    const frameRight = 1.0;  // 100% from left (full width)
    const frameTop = 0.0;    // 0% from top (full height)
    const frameBottom = 1.0; // 100% from top (full height)
    
    const frameCenterX = 0.5; // Center of the frame
    const frameCenterY = 0.5; // Center of the frame
    
    // Check if face is within the frame boundaries
    const isInFrame = x >= frameLeft && x <= frameRight && y >= frameTop && y <= frameBottom;
    
    if (!isInFrame) {
      // Face is outside the frame
      if (x < frameLeft) {
        return {
          title: "Move Left",
          message: "Move your face into the frame",
          icon: Move,
          color: "text-red-400",
          priority: 1
        };
      } else if (x > frameRight) {
        return {
          title: "Move Right",
          message: "Move your face into the frame",
          icon: Move,
          color: "text-red-400",
          priority: 1
        };
      } else if (y < frameTop) {
        return {
          title: "Move Back",
          message: "Move further from the camera",
          icon: Move,
          color: "text-red-400",
          priority: 1
        };
      } else if (y > frameBottom) {
        return {
          title: "Get Closer",
          message: "Move closer to the camera",
          icon: Move,
          color: "text-red-400",
          priority: 1
        };
      }
    }

    // Face is in frame, now check positioning within the frame
    const targetSize = 0.25; // Ideal face size relative to frame (smaller for better fit)
    const tolerance = 0.08; // Tighter tolerance for positioning

    // Check horizontal position within frame
    if (x < frameCenterX - tolerance) {
      return {
        title: "Move Left",
        message: "Center your face in the frame",
        icon: Move,
        color: "text-blue-400",
        priority: 2
      };
    } else if (x > frameCenterX + tolerance) {
      return {
        title: "Move Right",
        message: "Center your face in the frame",
        icon: Move,
        color: "text-blue-400",
        priority: 2
      };
    }

    // Check vertical position within frame (distance, not up/down)
    if (y < frameCenterY - tolerance) {
      return {
        title: "Move Back",
        message: "Move further from the camera",
        icon: Move,
        color: "text-blue-400",
        priority: 2
      };
    } else if (y > frameCenterY + tolerance) {
      return {
        title: "Get Closer",
        message: "Move closer to the camera",
        icon: Move,
        color: "text-blue-400",
        priority: 2
      };
    }

    // Check distance/size
    if (size < targetSize * 0.6) {
      return {
        title: "Get Closer",
        message: "Move closer to the camera",
        icon: Move,
        color: "text-green-400",
        priority: 3
      };
    } else if (size > targetSize * 1.4) {
      return {
        title: "Move Back",
        message: "Move further from the camera",
        icon: Move,
        color: "text-green-400",
        priority: 3
      };
    }

    // Check if face is well-centered and sized within the frame
    const isCentered = Math.abs(x - frameCenterX) < tolerance && Math.abs(y - frameCenterY) < tolerance;
    const isGoodSize = Math.abs(size - targetSize) < targetSize * 0.25;

    if (isCentered && isGoodSize) {
      return {
        title: "Perfect!",
        message: countdown > 0 ? `Hold still - capturing in ${countdown}...` : "Hold still - capturing in 3 seconds...",
        icon: CheckCircle,
        color: "text-green-400",
        priority: 4
      };
    }

    // Default guidance for fine-tuning within frame
    return {
      title: "Adjust Position",
      message: "Fine-tune your face position in the frame",
      icon: Target,
      color: "text-yellow-400",
      priority: 2
    };
  };

  const startCamera = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: currentCamera,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(mediaStream);
      
      // Wait for video element to be available
      let retryCount = 0;
      const maxRetries = 50; // Maximum 50 retries (about 2.5 seconds)
      
      const setupVideo = () => {
        if (videoRef.current) {
          console.log('Video element found, setting up...');
          const video = videoRef.current;
          video.srcObject = mediaStream;
          
          // Wait for video to be ready
          const onLoadedMetadata = () => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('error', onError);
            console.log('Video loaded successfully');
            setIsCameraActive(true);
          };
          
          const onError = (e: Event) => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('error', onError);
            console.error('Video failed to load:', e);
            setError('Video failed to load. Please try again.');
          };
          
          video.addEventListener('loadedmetadata', onLoadedMetadata);
          video.addEventListener('error', onError);
          
          // Fallback timeout
          setTimeout(() => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('error', onError);
            if (video.readyState >= 1) {
              console.log('Video ready via timeout fallback');
              setIsCameraActive(true);
            } else {
              console.error('Video loading timeout');
              setError('Video loading timeout. Please try again.');
            }
          }, 5000);
        } else if (retryCount < maxRetries) {
          retryCount++;
          console.log(`Video element not found, retrying... (${retryCount}/${maxRetries})`);
          setTimeout(setupVideo, 50);
        } else {
          console.error('Video element not found after maximum retries');
          setError('Failed to initialize camera. Please try again.');
        }
      };
      
      // Start the setup process
      setupVideo();
      
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
    if (detectionInterval) {
      clearInterval(detectionInterval);
      setDetectionInterval(null);
    }
    if (autoCaptureTimer) {
      clearTimeout(autoCaptureTimer);
      setAutoCaptureTimer(null);
    }
    setCountdown(0);
  };

  const generateQRCode = async () => {
    try {
      // Generate a unique URL for mobile photo capture
      const captureUrl = `${window.location.origin}/capture?session=${Date.now()}`;
      const qrDataUrl = await QRCode.toDataURL(captureUrl, {
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
      // Fallback to live camera if QR generation fails
      setCameraState('live');
    }
  };

  const switchCamera = async () => {
    const newCamera = currentCamera === 'front' ? 'back' : 'front';
    setCurrentCamera(newCamera);
    stopCamera();
    await new Promise(resolve => setTimeout(resolve, 500));
    await startCamera();
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageData);
        setCameraState('preview');
      }
    }
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
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setCapturedImage(result);
        setCameraState('preview');
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const getLuminosityStatus = () => {
    if (luminosity < 50) return { status: 'too-dark', color: 'text-red-500', message: 'Too dark' };
    if (luminosity > 200) return { status: 'too-bright', color: 'text-yellow-500', message: 'Too bright' };
    return { status: 'good', color: 'text-green-500', message: 'Good lighting' };
  };

  const luminosityStatus = getLuminosityStatus();
  const currentGuidance = getGuidanceMessage();
  const GuidanceIcon = currentGuidance.icon;

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm"
      >
        <div className="bg-white p-8 max-w-md mx-4 text-center rounded-2xl shadow-2xl">
          <div className="text-red-500 mb-4">
            <Camera size={48} className="mx-auto" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Camera Access Error</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors rounded-lg"
            >
              Close
            </button>
            <button
              onClick={() => {
                setError(null);
                startCamera();
              }}
              className="flex-1 px-4 py-3 bg-primary-600 text-white hover:bg-primary-700 transition-colors rounded-lg"
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm p-4"
    >
      <div className="bg-white w-full max-w-4xl h-full max-h-[95vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 flex-shrink-0">
          <div>
            <h3 className="text-lg md:text-2xl font-bold text-gray-900">Skin Analysis Photo</h3>
            <p className="text-sm md:text-base text-gray-600 mt-1">Take a clear photo of your skin for analysis</p>
          </div>
          <button
            onClick={onClose}
            className="p-3 hover:bg-gray-100 transition-colors rounded-full"
            aria-label="Close camera"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="relative bg-black flex-1 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {/* QR Code State */}
            {cameraState === 'qr' && (
              <motion.div
                key="qr"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center p-4 md:p-8 h-full"
              >
                <div className="text-center mb-8">
                  <div className="mb-6">
                    <Smartphone size={48} className="mx-auto text-white mb-4" />
                    <h3 className="text-2xl font-bold text-white mb-2">Take Photo with Your Phone</h3>
                    <p className="text-gray-300">Scan the QR code with your phone's camera to take a photo</p>
                  </div>
                  
                  {qrCodeDataUrl && (
                    <div className="bg-white p-4 rounded-2xl inline-block">
                      <img src={qrCodeDataUrl} alt="QR Code" className="w-48 h-48 md:w-64 md:h-64" />
                    </div>
                  )}
                </div>
                
                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      console.log('Use Camera button clicked, setting state to live');
                      setCameraState('live');
                    }}
                    className="px-6 py-3 bg-white text-black hover:bg-gray-100 transition-colors rounded-xl font-semibold flex items-center gap-2"
                  >
                    <Camera size={20} />
                    Use Camera
                  </button>
                  
                  <button
                    onClick={triggerFileUpload}
                    className="px-6 py-3 bg-gray-700 text-white hover:bg-gray-600 transition-colors rounded-xl font-semibold flex items-center gap-2"
                  >
                    <Upload size={20} />
                    Upload Photo
                  </button>
                </div>
              </motion.div>
            )}

            {/* Live Video State */}
            {cameraState === 'live' && (
              <motion.div
                key="live"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative"
              >
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
                    <div className="text-white text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                      <p>Starting camera...</p>
                    </div>
                  </div>
                )}

                <div className="relative flex items-center justify-center">
                  <div className="relative w-96 h-[28rem] max-w-[95%] max-h-[80%] overflow-hidden rounded-3xl">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover -scale-x-100"
                      style={{
                        objectPosition: 'center center'
                      }}
                    />
                  </div>
                  
                  {/* Camera Overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Top Controls */}
                    <div className="absolute top-6 left-6 right-6 flex justify-between items-center">
                      <button
                        onClick={switchCamera}
                        className="p-3 bg-black bg-opacity-50 text-white hover:bg-opacity-70 transition-all pointer-events-auto rounded-full backdrop-blur-sm"
                        aria-label="Switch camera"
                      >
                        <RotateCcw size={20} />
                      </button>
                      
                      <button
                        onClick={triggerFileUpload}
                        className="p-3 bg-black bg-opacity-50 text-white hover:bg-opacity-70 transition-all pointer-events-auto rounded-full backdrop-blur-sm"
                        aria-label="Upload photo"
                      >
                        <Upload size={20} />
                      </button>
                    </div>

                    {/* Luminosity Indicator */}
                    <div className="absolute top-6 left-1/2 transform -translate-x-1/2 pointer-events-auto">
                      <div className={`flex items-center gap-2 px-4 py-2 bg-black bg-opacity-50 rounded-full backdrop-blur-sm ${luminosityStatus.color}`}>
                        {luminosityStatus.status === 'too-dark' && <Moon size={16} />}
                        {luminosityStatus.status === 'too-bright' && <Sun size={16} />}
                        {luminosityStatus.status === 'good' && <CheckCircle size={16} />}
                        <span className="text-sm font-medium">{luminosityStatus.message}</span>
                      </div>
                    </div>
                    
                    {/* Face position indicator */}
                    {facePosition && facePosition.confidence > 0.1 && (
                      <div 
                        className="absolute w-4 h-4 bg-green-400 rounded-full opacity-80 animate-pulse z-10"
                        style={{
                          left: `${facePosition.x * 100}%`,
                          top: `${facePosition.y * 100}%`,
                          transform: 'translate(-50%, -50%)'
                        }}
                      />
                    )}
                    
                    {/* Compact Guidance Text - Top Right */}
                    <div className="absolute top-20 right-6 text-white">
                      <motion.div 
                        key={currentGuidance.title}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="bg-black bg-opacity-70 rounded-xl p-3 backdrop-blur-sm border border-white border-opacity-20 max-w-48"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <GuidanceIcon size={16} className={currentGuidance.color} />
                          <span className="text-sm font-semibold">{currentGuidance.title}</span>
                        </div>
                        <p className="text-xs opacity-90">{currentGuidance.message}</p>
                      </motion.div>
                    </div>

                    {/* Tips - Bottom Left */}
                    <div className="absolute bottom-6 left-6 text-white">
                      <div className="bg-black bg-opacity-50 rounded-xl p-3 backdrop-blur-sm border border-white border-opacity-20 max-w-48">
                        <div className="text-xs opacity-75 space-y-1">
                          <p>• Remove makeup and skincare products</p>
                          <p>• Ensure even lighting on your face</p>
                          <p>• Keep your face steady and relaxed</p>
                        </div>
                        {facePosition && (
                          <div className="mt-2 text-xs opacity-60">
                            <p>Face detected: {Math.round(facePosition.confidence * 100)}%</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Preview State */}
            {cameraState === 'preview' && (
              <motion.div
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative"
              >
                <div className="relative flex items-center justify-center">
                  <div className="relative w-96 h-[28rem] max-w-[95%] max-h-[80%] overflow-hidden rounded-3xl">
                    <img
                      src={capturedImage!}
                      alt="Captured photo"
                      className="w-full h-full object-cover -scale-x-100"
                      style={{
                        objectPosition: 'center center'
                      }}
                    />
                  </div>
                  
                  {/* Preview Overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-25 flex items-center justify-center">
                    <div className="text-center text-white">
                      <CheckCircle size={48} className="mx-auto mb-2 opacity-75" />
                      <p className="text-lg font-semibold">Well done</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="p-4 md:p-6 bg-gray-50 flex-shrink-0">
          {cameraState === 'live' && (
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={capturePhoto}
                disabled={!isCameraActive || isLoading}
                className="w-20 h-20 bg-primary-600 text-white hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all flex items-center justify-center rounded-full shadow-lg hover:shadow-xl transform hover:scale-105"
                aria-label="Capture photo"
              >
                <Camera size={32} />
              </button>
              
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
                className="flex-1 px-6 py-4 bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                <ArrowLeft size={20} />
                Retake
              </button>
              <button
                onClick={confirmPhoto}
                className="flex-1 px-6 py-4 bg-black text-white hover:bg-gray-800 transition-colors rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                <CheckCircle size={20} />
                Send
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