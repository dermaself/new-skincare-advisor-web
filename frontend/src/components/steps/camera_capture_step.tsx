"use client";
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, X, SwitchCameraIcon, ArrowLeft, CheckCircle, Upload, Target, MoveHorizontal, Sun, Check, Move, RotateCcw } from 'lucide-react';
import { ASSETS } from '../../lib/assets';

// Dynamic import to avoid SSR issues
let faceapi: any = null;
if (typeof window !== 'undefined') {
  // Only import on client side
  import('face-api.js').then(module => {
    faceapi = module;
  });
}

interface CameraCaptureStepProps {
  onNext: (imageData: string) => void;
  onBack: () => void;
}

interface FacePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Device detection function
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
         window.innerWidth <= 768;
};

export default function CameraCaptureStep({ onNext, onBack }: CameraCaptureStepProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [currentCamera, setCurrentCamera] = useState<'front' | 'back'>('front');
  const [cameraState, setCameraState] = useState<'live' | 'preview'>('live');
  const [luminosity, setLuminosity] = useState<number>(0);
  const [facePosition, setFacePosition] = useState<FacePosition | null>(null);
  const [detectionInterval, setDetectionInterval] = useState<NodeJS.Timeout | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceAngle, setFaceAngle] = useState<{x: number, y: number, z: number} | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceApiAvailable, setFaceApiAvailable] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState<any[]>([]);
  const detectedFacesRef = useRef<any[]>([]);
  const [guidanceMessage, setGuidanceMessage] = useState<string>('Posiziona il tuo viso al centro');
  const [guidanceType, setGuidanceType] = useState<'default' | 'position' | 'distance' | 'angle' | 'lighting'>('default');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(true);
  const initializationInProgressRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    
    // Load face-api.js models
    const loadModels = async () => {
      try {
        console.log('Loading face-api.js models...');
        
        // Try to load face-api.js dynamically
        try {
          const module = await import('face-api.js');
          faceapi = module;
          setFaceApiAvailable(true);
          
          // Load models from the correct CDN URL
          const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
          
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
          ]);
          
          setModelsLoaded(true);
          console.log('face-api.js models loaded successfully');
        } catch (faceApiError) {
          console.warn('face-api.js not available, continuing without face detection:', faceApiError);
          setModelsLoaded(true); // Mark as loaded so we can continue without face detection
        }
      } catch (error) {
        console.error('Error in loadModels:', error);
        setModelsLoaded(true); // Mark as loaded so we can continue
      }
    };

    // Only load models if we're not in SSR
    if (typeof window !== 'undefined') {
      loadModels();
    }
    
    startCamera();
    
    return () => {
      isMountedRef.current = false;
      stopCamera();
    };
  }, []);

  // Restart face detection when models are loaded
  useEffect(() => {
    if (modelsLoaded && isCameraActive && !detectionInterval) {
      console.log('Models loaded, restarting face detection...');
      startFaceDetection();
    }
  }, [modelsLoaded, isCameraActive]);

  const startCamera = async (desiredFacing?: 'front' | 'back') => {
    if (initializationInProgressRef.current || !isMountedRef.current) {
      return;
    }
    
    initializationInProgressRef.current = true;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      const facingMode = desiredFacing || currentCamera;
      
      // Get camera constraints based on device
      const constraints = {
        video: {
          facingMode: facingMode === 'front' ? 'user' : 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };
      
      console.log('Requesting camera with constraints:', constraints);
      
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (!isMountedRef.current) {
        newStream.getTracks().forEach(track => track.stop());
        return;
      }
      
      setStream(newStream);
      
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = null;
        video.srcObject = newStream;
        
        // Wait for video to be ready
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Video timeout')), 5000);
          
          const onLoadedMetadata = () => {
            clearTimeout(timeout);
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('error', onError);
            resolve();
          };
          
          const onError = (e: Event) => {
            clearTimeout(timeout);
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('error', onError);
            reject(e);
          };
          
          video.addEventListener('loadedmetadata', onLoadedMetadata);
          video.addEventListener('error', onError);
        });
        
        await video.play();
        setIsCameraActive(true);
        setIsLoading(false);
        
        // Start face detection after a delay
        setTimeout(() => {
          if (modelsLoaded && isMountedRef.current) {
            startFaceDetection();
          }
        }, 1000);
        
      }
      
    } catch (err) {
      console.error('Camera error:', err);
      
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      
      // Try fallback with minimal constraints
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: false 
        });
        
        if (!isMountedRef.current) {
          fallbackStream.getTracks().forEach(track => track.stop());
          return;
        }
        
        setStream(fallbackStream);
        
        if (videoRef.current) {
          const video = videoRef.current;
          video.srcObject = null;
          video.srcObject = fallbackStream;
          
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Fallback timeout')), 5000);
            
            const onLoadedMetadata = () => {
              clearTimeout(timeout);
              video.removeEventListener('loadedmetadata', onLoadedMetadata);
              video.removeEventListener('error', onError);
              resolve();
            };
            
            const onError = (e: Event) => {
              clearTimeout(timeout);
              video.removeEventListener('loadedmetadata', onLoadedMetadata);
              video.removeEventListener('error', onError);
              reject(e);
            };
            
            video.addEventListener('loadedmetadata', onLoadedMetadata);
            video.addEventListener('error', onError);
          });
          
          await video.play();
          setIsCameraActive(true);
          setIsLoading(false);
          
          // Start face detection after a delay
          setTimeout(() => {
            if (modelsLoaded && isMountedRef.current) {
              startFaceDetection();
            }
          }, 1000);
        }
        
      } catch (fallbackErr) {
        console.error('Fallback camera error:', fallbackErr);
        setError('Could not access camera. Please check permissions and try again.');
        setIsLoading(false);
      }
    } finally {
      initializationInProgressRef.current = false;
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
    
    setIsCameraActive(false);
    setFacePosition(null);
    initializationInProgressRef.current = false;
  };

  const switchCamera = () => {
    const newCamera = currentCamera === 'front' ? 'back' : 'front';
    setCurrentCamera(newCamera);
    
    if (isCameraActive) {
      stopCamera();
      setTimeout(() => {
        if (isMountedRef.current) {
          startCamera(newCamera);
        }
      }, 100);
    }
  };

  const startFaceDetection = () => {
    if (!videoRef.current) {
      console.log('Cannot start face detection - no video element');
      return;
    }
    
    console.log('Starting face detection (face-api.js:', !!modelsLoaded, ')');
    
    // Wait for models to be loaded before starting detection
    if (!modelsLoaded) {
      console.log('Waiting for models to load before starting face detection...');
      return;
    }
    
    // Add a small delay to ensure video is fully loaded
    setTimeout(() => {
      if (!videoRef.current || !isMountedRef.current) return;
      
      const interval = setInterval(async () => {
        if (!videoRef.current || !isMountedRef.current) {
          clearInterval(interval);
          return;
        }
        
        await detectFacePosition();
        getLuminosityStatus();
      }, 200); // Faster detection for better responsiveness
      
      setDetectionInterval(interval);
    }, 1000); // Increased delay to ensure video is ready
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
    // Luminosity detection disabled for now
    console.log('Luminosity detection disabled');
  };

  const calculateFaceAngle = (landmarks: any) => {
    if (!landmarks || !landmarks.positions) {
      return { yaw: 0, pitch: 0, roll: 0 };
    }

    const points = landmarks.positions;
    
    // Key landmark points for angle calculation
    const noseTip = points[30];        // Nose tip
    const leftEye = points[36];        // Left eye outer corner
    const rightEye = points[45];       // Right eye outer corner
    const leftMouth = points[48];      // Left mouth corner
    const rightMouth = points[54];     // Right mouth corner
    const chin = points[8];            // Chin center
    const leftCheek = points[1];       // Left face contour
    const rightCheek = points[15];     // Right face contour

    // Calculate yaw (left-right rotation)
    const eyeVector = {
      x: rightEye.x - leftEye.x,
      y: rightEye.y - leftEye.y
    };
    const mouthVector = {
      x: rightMouth.x - leftMouth.x,
      y: rightMouth.y - leftMouth.y
    };
    
    // Average the vectors for more stable yaw calculation
    const avgHorizontalVector = {
      x: (eyeVector.x + mouthVector.x) / 2,
      y: (eyeVector.y + mouthVector.y) / 2
    };
    
    const yaw = Math.atan2(avgHorizontalVector.y, avgHorizontalVector.x) * (180 / Math.PI);

    // Calculate pitch (up-down rotation)
    const faceHeight = Math.abs(chin.y - ((leftEye.y + rightEye.y) / 2));
    const noseToEyeDistance = Math.abs(noseTip.y - ((leftEye.y + rightEye.y) / 2));
    const pitchRatio = noseToEyeDistance / faceHeight;
    const pitch = (pitchRatio - 0.3) * 90; // Normalize to degrees

    // Calculate roll (tilt rotation)
    const roll = Math.atan2(eyeVector.y, eyeVector.x) * (180 / Math.PI);

    return {
      yaw: Math.max(-45, Math.min(45, yaw)),      // Clamp between -45 and 45 degrees
      pitch: Math.max(-30, Math.min(30, pitch)), // Clamp between -30 and 30 degrees
      roll: Math.max(-30, Math.min(30, roll))    // Clamp between -30 and 30 degrees
    };
  };

  const detectFacePosition = async () => {
    if (!videoRef.current) {
      console.log('Face detection skipped - no video element');
      return;
    }
    
    try {
      const video = videoRef.current;
      
      // Only process if video is ready
      if (video.readyState < 2) {
        console.log('Video not ready, skipping face detection');
        return;
      }
      
      // If models are loaded and face-api.js is available, use it
      if (modelsLoaded && faceApiAvailable && faceapi) {
        try {
          // Detect faces with landmarks for angle calculation
          const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({
            inputSize: 224,
            scoreThreshold: 0.5
          })).withFaceLandmarks();
          
          console.log('Face detection results:', detections.length, 'faces detected');
          if (detections.length > 0) {
            console.log('First face detection with landmarks:', detections[0]);
          }
          
          detectedFacesRef.current = detections;
          setDetectedFaces(detections);
          setFaceDetected(detections.length > 0);
          
          if (detections.length > 0) {
            const detection = detections[0];
            const { detection: box, landmarks } = detection;
            
            console.log('Face detected:', box);
            console.log('Landmarks detected:', landmarks ? 'Yes' : 'No');
            
            const facePos = {
              x: box.x,
              y: box.y,
              width: box.width,
              height: box.height
            };
            
            setFacePosition(facePos);
            
            // Calculate face angles from landmarks
            if (landmarks) {
              const angles = calculateFaceAngle(landmarks);
              console.log('Calculated face angles:', angles);
              setFaceAngle(angles as any);
            } else {
              setFaceAngle({ x: 0, y: 0, z: 0 });
            }
            
            // Update guidance based on detection results (including angles)
            updateGuidance(detections, facePos, 0.5);
          } else {
            console.log('No face detected');
            setFaceDetected(false);
            setFacePosition(null);
            setFaceAngle(null);
            
            // Update guidance for no face detected
            updateGuidance([], null, 0.5);
          }
        } catch (faceApiError) {
          console.error('face-api.js face detection error:', faceApiError);
        }
      } else {
        console.log('face-api.js models not loaded yet');
      }
      
    } catch (error) {
      console.error('Face detection error:', error);
    }
  };

  const updateGuidance = (detections: any[], facePosition: any, luminosity: number) => {
    // If face detection is not available, show default guidance
    if (!faceApiAvailable) {
      setGuidanceMessage('Place your face in the center');
      setGuidanceType('position');
      return;
    }
    
    if (detections.length === 0) {
      setGuidanceMessage('Place the face inside the box');
      setGuidanceType('position');
      return;
    }

    const detection = detections[0];
    const { detection: box, landmarks } = detection;
    
    // Check if face is too far (too small)
    const faceArea = box.width * box.height;
    const videoArea = videoRef.current ? videoRef.current.videoWidth * videoRef.current.videoHeight : 0;
    const faceRatio = videoArea > 0 ? faceArea / videoArea : 0;
    
    if (faceRatio < 0.1) { // Face is too small (too far)
      setGuidanceMessage('Move the camera closer');
      setGuidanceType('distance');
      return;
    }
    
    // Check if face is too close (too large)
    if (faceRatio > 0.6) {
      setGuidanceMessage('Move the camera away');
      setGuidanceType('distance');
      return;
    }
    
    // Check if face is centered
    const videoWidth = videoRef.current?.videoWidth || 640;
    const videoHeight = videoRef.current?.videoHeight || 480;
    const centerX = videoWidth / 2;
    const centerY = videoHeight / 2;
    const faceCenterX = box.x + box.width / 2;
    const faceCenterY = box.y + box.height / 2;
    
    const xOffset = Math.abs(faceCenterX - centerX) / centerX;
    const yOffset = Math.abs(faceCenterY - centerY) / centerY;
    
    if (xOffset > 0.3 || yOffset > 0.3) {
      setGuidanceMessage('Center your face in the box');
      setGuidanceType('position');
      return;
    }
    
    // Check face angle if landmarks are available
    if (landmarks && faceAngle) {
      const { yaw, pitch, roll } = faceAngle as any;
      
      // Check yaw (left-right rotation)
      if (Math.abs(yaw) > 20) {
        if (yaw > 0) {
          setGuidanceMessage('Turn your head slightly left');
        } else {
          setGuidanceMessage('Turn your head slightly right');
        }
        setGuidanceType('angle');
        return;
      }
      
      // Check pitch (up-down rotation)
      if (Math.abs(pitch) > 15) {
        if (pitch > 0) {
          setGuidanceMessage('Tilt your head down slightly');
        } else {
          setGuidanceMessage('Tilt your head up slightly');
        }
        setGuidanceType('angle');
        return;
      }
      
      // Check roll (tilt rotation)
      if (Math.abs(roll) > 15) {
        if (roll > 0) {
          setGuidanceMessage('Straighten your head (tilt left)');
        } else {
          setGuidanceMessage('Straighten your head (tilt right)');
        }
        setGuidanceType('angle');
        return;
      }
    }
    
    // Check lighting (if we had luminosity detection)
    if (luminosity < 0.3) {
      setGuidanceMessage('Turn towards the light source');
      setGuidanceType('lighting');
      return;
    }
    
    // All good!
    setGuidanceMessage('Perfect! Stay still.');
    setGuidanceType('default');
  };


  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;
    
    // Get the original video dimensions (full resolution)
    const originalWidth = video.videoWidth;
    const originalHeight = video.videoHeight;
    
    // Log video element dimensions and styling
    console.log('=== CAMERA CAPTURE STEP DEBUG ===');
    console.log('1. Video natural dimensions:', video.videoWidth, 'x', video.videoHeight);
    console.log('2. Video display dimensions (client):', video.clientWidth, 'x', video.clientHeight);
    console.log('3. Video offset dimensions:', video.offsetWidth, 'x', video.offsetHeight);
    console.log('4. Video aspect ratio:', (originalWidth / originalHeight).toFixed(3));
    console.log('5. Video CSS class:', video.className);
    console.log('6. Video style transform:', video.style.transform);
    console.log('7. Video scale:', currentCamera === 'front' ? 'scaleX(-1)' : 'none');
    console.log('8. Video object-fit: object-contain');
    
    // Set canvas to original video dimensions for full resolution capture
    canvas.width = originalWidth;
    canvas.height = originalHeight;
    
    console.log('9. Canvas dimensions set to original video size:', canvas.width, 'x', canvas.height);
    
    // Clear canvas with white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, originalWidth, originalHeight);
    
    // Handle mirroring for front-facing camera
    if (currentCamera === 'front') {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(
        video, 
        0, 0, originalWidth, originalHeight,  // Source rectangle (full video)
        -originalWidth, 0, originalWidth, originalHeight  // Destination rectangle (mirrored)
      );
      ctx.restore();
      console.log('10. Applied horizontal flip for front camera');
    } else {
      ctx.drawImage(
        video,
        0, 0, originalWidth, originalHeight,  // Source rectangle (full video)
        0, 0, originalWidth, originalHeight  // Destination rectangle (full resolution)
      );
      console.log('10. No flip applied for back camera');
    }
    
    const imageData = canvas.toDataURL('image/jpeg', 1.0);
    
    // Log the captured image data
    console.log('11. Captured image data URL length:', imageData.length);
    console.log('12. Estimated image size in KB:', Math.round(imageData.length * 0.75 / 1024));
    console.log('13. Image quality: 1.0 (maximum)');
    console.log('14. Captured full resolution image:', originalWidth, 'x', originalHeight);
    console.log('=== END CAMERA CAPTURE STEP DEBUG ===');
    
    setCapturedImage(imageData);
    setCameraState('preview');
    stopCamera();
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setCameraState('live');
    startCamera();
  };

  const confirmPhoto = () => {
    if (capturedImage) {
      console.log('=== CONFIRM PHOTO DEBUG ===');
      console.log('1. Image data URL length:', capturedImage.length);
      console.log('2. Image data URL preview (first 100 chars):', capturedImage.substring(0, 100));
      console.log('3. Image data URL preview (last 100 chars):', capturedImage.substring(capturedImage.length - 100));
      console.log('4. Calling onNext with captured image...');
      console.log('=== END CONFIRM PHOTO DEBUG ===');
      
      onNext(capturedImage);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        if (imageData) {
          setCapturedImage(imageData);
          setCameraState('preview');
          stopCamera();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <motion.div
      key="camera-capture"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="bg-main bg-cover bg-center h-full flex flex-col"
    >
      {/* Camera Content */}
      <div className="flex-1 relative bg-black overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p>Avvio fotocamera...</p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
            <div className="text-white text-center p-4">
              <p className="mb-4">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  startCamera();
                }}
                className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
              >
                Riprova
              </button>
            </div>
          </div>
        )}
        
        {cameraState === 'live' && (
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`max-w-full max-h-full object-contain ${currentCamera === 'front' ? 'scale-x-[-1]' : ''}`}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                width: 'auto',
                height: 'auto',
                display: 'block',
                transform: currentCamera === 'front' ? 'scaleX(-1)' : 'none'
              }}
            />
            
            {/* Face guide overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-60 border-2 border-white border-dashed rounded-lg opacity-50"></div>
            </div>
            
            {/* Dynamic Guidance Text */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
              <div className={`px-6 py-3 rounded-lg text-sm text-center max-w-xs transition-all duration-300 ${
                guidanceType === 'default' ? 'bg-green-500 bg-opacity-90 text-white' :
                guidanceType === 'position' ? 'bg-blue-500 bg-opacity-90 text-white' :
                guidanceType === 'distance' ? 'bg-yellow-500 bg-opacity-90 text-black' :
                guidanceType === 'angle' ? 'bg-purple-500 bg-opacity-90 text-white' :
                guidanceType === 'lighting' ? 'bg-orange-500 bg-opacity-90 text-white' :
                'bg-black bg-opacity-75 text-white'
              }`}>
                <div className="font-medium flex items-center justify-center gap-2">
                  {guidanceType === 'default' && <Check size={16} />}
                  {guidanceType === 'position' && <Target size={16} />}
                  {guidanceType === 'distance' && <MoveHorizontal size={16} />}
                  {guidanceType === 'angle' && <RotateCcw size={16} />}
                  {guidanceType === 'lighting' && <Sun size={16} />}
                  {guidanceMessage}
                </div>
              </div>
            </div>
            
            {/* Camera indicator */}
            <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
              <span className="text-white text-sm font-medium">
                {currentCamera === 'front' ? 'Fotocamera Anteriore' : 'Fotocamera Posteriore'}
              </span>
            </div>
          </div>
        )}
        
        {cameraState === 'preview' && capturedImage && (
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            <img
              src={capturedImage}
              alt="Captured photo"
              className="max-w-full max-h-full object-contain"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                width: 'auto',
                height: 'auto'
              }}
              onLoad={(e) => {
                const img = e.target as HTMLImageElement;
                console.log('=== PREVIEW DEBUG (camera_capture_step) ===');
                console.log('1. Image natural dimensions:', img.naturalWidth, 'x', img.naturalHeight);
                console.log('2. Image display dimensions:', img.offsetWidth, 'x', img.offsetHeight);
                console.log('3. Image client dimensions:', img.clientWidth, 'x', img.clientHeight);
                console.log('4. Image aspect ratio:', (img.naturalWidth / img.naturalHeight).toFixed(3));
                console.log('5. Image display aspect ratio:', (img.offsetWidth / img.offsetHeight).toFixed(3));
                console.log('6. Image CSS class:', img.className);
                console.log('7. Container dimensions:', img.parentElement?.offsetWidth, 'x', img.parentElement?.offsetHeight);
                console.log('=== END PREVIEW DEBUG ===');
              }}
            />
          </div>
        )}
        
        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Hidden file input for photo upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
          aria-label="Seleziona file immagine"
        />
      </div>

      {/* Controls */}
      <div className="bg-white/50 backdrop-blur-sm border-t border-white/30 p-4">
        {cameraState === 'live' && (
          <>
            <div className="flex items-center justify-center gap-4 sm:gap-6">
              {/* Switch Camera Button - Mobile optimized */}
              <button
                onClick={switchCamera}
                className="p-3 sm:p-4 bg-white/20 hover:bg-white/30 rounded-full transition-colors touch-manipulation"
                title="Cambia Fotocamera"
                aria-label="Cambia tra fotocamera anteriore e posteriore"
              >
                <SwitchCameraIcon size={24} className="text-white" />
              </button>
              
              {/* Capture Button - Mobile optimized */}
              <button
                onClick={capturePhoto}
                className="p-4 sm:p-5 bg-pink-600 hover:bg-pink-700 active:bg-pink-800 rounded-full transition-colors shadow-lg touch-manipulation min-w-[60px] min-h-[60px] sm:min-w-[70px] sm:min-h-[70px]"
                title="Scatta Foto"
                aria-label="Scatta foto"
              >
                <Camera size={28} className="text-white" />
              </button>
              
              {/* Upload Button - Mobile optimized */}
              <button
                onClick={openFileDialog}
                className="p-3 sm:p-4 bg-white/20 hover:bg-white/30 rounded-full transition-colors touch-manipulation"
                title="Carica Foto"
                aria-label="Carica foto dalla galleria"
              >
                <Upload size={24} className="text-white" />
              </button>
            </div>
            
            {/* Tips */}
            <div className="text-center text-xs text-white mt-4">
              <p className="flex items-center justify-center gap-1 mb-1">
                <Move className="w-3 h-3" />
                <span>Posiziona il tuo viso al centro</span>
              </p>
              <p className="flex items-center justify-center gap-1">
                <CheckCircle className="w-3 h-3" />
                <span>Buona illuminazione per i migliori risultati</span>
              </p>
            </div>
          </>
        )}
        
        {cameraState === 'preview' && (
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={retakePhoto}
              className="px-6 py-3 sm:px-8 sm:py-4 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-700 rounded-lg transition-colors touch-manipulation font-semibold"
              title="Scatta di nuovo"
              aria-label="Scatta di nuovo"
            >
              Scatta di nuovo
            </button>
            
            <button
              onClick={confirmPhoto}
              className="px-6 py-3 sm:px-8 sm:py-4 bg-pink-600 hover:bg-pink-700 active:bg-pink-800 text-white rounded-lg transition-colors flex items-center gap-2 touch-manipulation font-semibold"
              title="Usa Foto"
              aria-label="Usa questa foto per l'analisi"
            >
              <CheckCircle size={20} />
              Usa Foto
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
