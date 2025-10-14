"use client";
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, SwitchCameraIcon, CheckCircle, Upload, Move } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { QRCodeSVG } from 'qrcode.react';
import DesktopPhotoReceiver from './DesktopPhotoReceiver';

interface CameraCaptureStepProps {
  onNext: (imageData: string) => void;
  onBack: () => void;
  faceDetection?: {
    modelsLoaded: boolean;
    faceApiAvailable: boolean;
    isLoading: boolean;
    error: string | null;
    faceapi: any;
  };
}

interface FacePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         window.innerWidth <= 768;
};

export default function CameraCaptureStep({ onNext, onBack, faceDetection }: CameraCaptureStepProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [currentCamera, setCurrentCamera] = useState<'front' | 'back'>('front');
  const [cameraState, setCameraState] = useState<'live' | 'preview'>('live');
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [showDesktopGate, setShowDesktopGate] = useState<boolean>(false);
  const [facePosition, setFacePosition] = useState<FacePosition | null>(null);
  const [detectionInterval, setDetectionInterval] = useState<NodeJS.Timeout | null>(null);
  const [faceAngle, setFaceAngle] = useState<{x: number, y: number, z: number} | null>(null);
  const [detectedFaces, setDetectedFaces] = useState<any[]>([]);
  const detectedFacesRef = useRef<any[]>([]);
  const [guidanceMessage, setGuidanceMessage] = useState<string>(
    faceDetection?.isLoading ? 'Loading face detection...' : ''
  );
  const [guidanceType, setGuidanceType] = useState<'loading' | 'detecting' | 'positioning' | 'ready'>(
    faceDetection?.isLoading ? 'loading' : 'detecting'
  );
  const [lastFaceDetectionTime, setLastFaceDetectionTime] = useState<number>(0);
  const [session, setSession] = useState<string>('');

  // Use face detection state from props or fallback to local state
  const modelsLoaded = faceDetection?.modelsLoaded ?? false;
  const faceApiAvailable = faceDetection?.faceApiAvailable ?? false;
  const faceapi = faceDetection?.faceapi ?? null;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null); // Add overlay canvas ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(true);
  const initializationInProgressRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    const mobile = isMobileDevice();
    setIsMobile(mobile);
    if (typeof window !== 'undefined' && !mobile) {
      setShowDesktopGate(true);
      // Generate unique session and QR code for desktop
      const newSession = uuidv4();
      setSession(newSession);
    } else {
      startCamera();
    }
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
      }, 100); // Faster detection for better responsiveness
      
      setDetectionInterval(interval);
    }, 1000); // Increased delay to ensure video is ready
  };


  // removed unused isFaceInPosition and getLuminosityStatus

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
      
      // --- Brightness Guidance First ---
      // Analyze overall frame brightness before face detection
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = video.videoWidth;
      tempCanvas.height = video.videoHeight;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
        const frameData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        let totalLuminance = 0;
        let pixelCount = 0;
        const data = frameData.data;
        for (let i = 0; i < data.length; i += 16) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          totalLuminance += luminance;
          pixelCount++;
        }
        const avgLuminance = pixelCount > 0 ? totalLuminance / pixelCount : 0;
        // Always update guidance message and type
        let brightnessMsg = '';
        if (avgLuminance < 0.20) {
          brightnessMsg = 'Face toward a light source - lighting is too dark';
        } else if (avgLuminance > 0.80) {
          brightnessMsg = 'Move away from bright light - lighting is too bright';
        } else if (avgLuminance < 0.35) {
          brightnessMsg = 'Turn toward more light for better visibility';
        } else {
          brightnessMsg = '';
        }
        if (brightnessMsg) {
          setGuidanceMessage(brightnessMsg);
          return;
        } else {
          setGuidanceType('positioning');
          clearOverlayCanvas();
          setDetectedFaces([]);
          setFaceAngle(null);

          clearOverlayCanvas();
          

          try {
            // Detect faces with landmarks for angle calculation
            const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({
              inputSize: 224,
              scoreThreshold: 0.5
            })).withFaceLandmarks();
            
            console.log('Face detection results:', detections.length, 'faces detected');
            if (detections.length > 0) {
              console.log('First face detection with landmarks:', detections[0]);
            } else {
              console.log('No faces detected - this is the issue!');
              // Let's try with more relaxed settings
              console.log('Trying with more relaxed detection settings...');
              const relaxedDetections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({
                inputSize: 320,
                scoreThreshold: 0.3
              })).withFaceLandmarks();
              console.log('Relaxed detection results:', relaxedDetections.length, 'faces detected');
            }
            
            detectedFacesRef.current = detections;
            setDetectedFaces(detections);
            
            // Draw detection results on overlay
            drawDetectionResults(detections);
            
            if (detections.length > 0) {
              const detection = detections[0];
              const { detection: box, landmarks } = detection;
              
              const normalized = normalizeFaceBox(box);
              const facePos = normalized ? {
                x: normalized.x,
                y: normalized.y,
                width: normalized.width,
                height: normalized.height
              } : null;
              
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
              updateGuidance(detections);
            } else {
              console.log('- No face detected -');
              setFaceAngle(null);
              
              // Update guidance for no face detected
              updateGuidance([]);
            }
          } catch (faceApiError) {
            console.error('face-api.js face detection error:', faceApiError);
          }
          return;
        }
      }

      // Clear overlay canvas first
      
      // If models are loaded and face-api.js is available, use it
      if (modelsLoaded && faceApiAvailable && faceapi) {
        console.log('=== FACE DETECTION DEBUG ===');
        console.log('Models loaded:', modelsLoaded);
        console.log('Face API available:', faceApiAvailable);
        console.log('Face API object:', !!faceapi);
        console.log('Video ready state:', video.readyState);
        console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight);
        console.log('Video client dimensions:', video.clientWidth, 'x', video.clientHeight);
        
        
      } else {
        console.log('face-api.js not ready - Models loaded:', modelsLoaded, 'API available:', faceApiAvailable);
      }
      
    } catch (error) {
      console.error('Face detection error:', error);
    }
  };

  // Add visualization functions
  const clearOverlayCanvas = () => {
    if (!overlayCanvasRef.current) return;
    const ctx = overlayCanvasRef.current.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
  };

  const drawDetectionResults = (detections: any[]) => {
    if (!overlayCanvasRef.current || !videoRef.current) return;
    
    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const video = videoRef.current;
    
    if (!ctx) return;
    
    // Update canvas size to match container (video element's parent)
    const container = video.parentElement;
    if (!container) return;
    
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    // Get the exact video element position and size within the container
    const videoRect = video.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    // Calculate offset of video within the container
    const videoOffsetX = videoRect.left - containerRect.left;
    const videoOffsetY = videoRect.top - containerRect.top;
    const videoDisplayWidth = videoRect.width;
    const videoDisplayHeight = videoRect.height;
    
    // Calculate scale factors from video natural size to actual display size
    const scaleX = videoDisplayWidth / video.videoWidth;
    const scaleY = videoDisplayHeight / video.videoHeight;
    
    console.log('=== OVERLAY DEBUG ===');
    console.log('Container dimensions:', containerRect.width, 'x', containerRect.height);
    console.log('Video natural size:', video.videoWidth, 'x', video.videoHeight);
    console.log('Video display size:', videoDisplayWidth, 'x', videoDisplayHeight);
    console.log('Video offset in container:', videoOffsetX.toFixed(1), videoOffsetY.toFixed(1));
    console.log('Scale factors:', scaleX.toFixed(3), scaleY.toFixed(3));
    console.log('Canvas size:', canvas.width, 'x', canvas.height);
    
    ctx.strokeStyle = '#00ff00';
    ctx.fillStyle = '#00ff00';
    ctx.lineWidth = 2;
    
    detections.forEach((detection, faceIndex) => {
      const { detection: box, landmarks } = detection;
      const n = normalizeFaceBox(box);
      if (!n) return;
      
      // Draw bounding box with proper offset
      ctx.strokeStyle = faceIndex === 0 ? '#00ff00' : '#ff0000';
      ctx.lineWidth = 3;
      
      const scaledBox = {
        x: (n.x * scaleX) + videoOffsetX,
        y: (n.y * scaleY) + videoOffsetY,
        width: n.width * scaleX,
        height: n.height * scaleY
      };
      
      ctx.strokeRect(scaledBox.x, scaledBox.y, scaledBox.width, scaledBox.height);
      
      // Draw face confidence score
      ctx.fillStyle = ctx.strokeStyle;
      ctx.font = '14px Arial';
      ctx.fillText(`Face ${faceIndex + 1}: ${(detection.detection.score * 100).toFixed(1)}%`, 
                   scaledBox.x, scaledBox.y - 10);
      
      // Draw landmarks if available
      if (landmarks && landmarks.positions) {
        ctx.fillStyle = '#ffff00';
        ctx.strokeStyle = '#ffff00';
        
        landmarks.positions.forEach((point: any, index: number) => {
          // Scale landmark coordinates with proper offset
          const scaledX = (point.x * scaleX) + videoOffsetX;
          const scaledY = (point.y * scaleY) + videoOffsetY;
          
          // Draw landmark point
          ctx.beginPath();
          ctx.arc(scaledX, scaledY, 2, 0, 2 * Math.PI);
          ctx.fill();
          
          // Draw landmark number every 10th point to avoid clutter
          if (index % 10 === 0) {
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px Arial';
            ctx.fillText(index.toString(), scaledX + 3, scaledY - 3);
            ctx.fillStyle = '#ffff00';
          }
        });
        
        // Draw key facial features connections
        drawFacialFeatureLines(ctx, landmarks.positions, scaleX, scaleY, videoOffsetX, videoOffsetY);
      }
      
      // Draw face angle information
      if (faceAngle && faceIndex === 0) {
        const angleX = scaledBox.x + scaledBox.width + 10;
        const angleY = scaledBox.y + 20;
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.fillText(`Yaw: ${(faceAngle as any).yaw?.toFixed(1) || 'N/A'}°`, angleX, angleY);
        ctx.fillText(`Pitch: ${(faceAngle as any).pitch?.toFixed(1) || 'N/A'}°`, angleX, angleY + 15);
        ctx.fillText(`Roll: ${(faceAngle as any).roll?.toFixed(1) || 'N/A'}°`, angleX, angleY + 30);
      }
    });
    
    console.log('=== DRAWN', detections.length, 'faces on overlay ===');
  };

  const drawFacialFeatureLines = (ctx: CanvasRenderingContext2D, positions: any[], scaleX: number, scaleY: number, videoOffsetX: number, videoOffsetY: number) => {
    // Draw eye connections
    drawEyeLines(ctx, positions, scaleX, scaleY, videoOffsetX, videoOffsetY);
    
    // Draw eyebrow connections
    drawEyebrowLines(ctx, positions, scaleX, scaleY, videoOffsetX, videoOffsetY);
    
    // Draw nose connections
    drawNoseLines(ctx, positions, scaleX, scaleY, videoOffsetX, videoOffsetY);
    
    // Draw mouth connections
    drawMouthLines(ctx, positions, scaleX, scaleY, videoOffsetX, videoOffsetY);
    
    // Draw jawline
    drawJawline(ctx, positions, scaleX, scaleY, videoOffsetX, videoOffsetY);
  };

  const drawEyeLines = (ctx: CanvasRenderingContext2D, positions: any[], scaleX: number, scaleY: number, videoOffsetX: number, videoOffsetY: number) => {
    // Left eye outline (indices 36-47)
    const leftEyePoints = positions.slice(36, 47);
    if (leftEyePoints.length > 0) {
      ctx.beginPath();
      ctx.moveTo(leftEyePoints[0][0] * scaleX + videoOffsetX, leftEyePoints[0][1] * scaleY + videoOffsetY);
      for (let i = 1; i < leftEyePoints.length; i++) {
        ctx.lineTo(leftEyePoints[i][0] * scaleX + videoOffsetX, leftEyePoints[i][1] * scaleY + videoOffsetY);
      }
      ctx.closePath();
      ctx.strokeStyle = '#00ffff';
      ctx.stroke();
    }
    
    // Right eye outline (indices 42-47, but use 39-47 for right eye)
    const rightEyePoints = positions.slice(42, 48);
    if (rightEyePoints.length > 0) {
      ctx.beginPath();
      ctx.moveTo(rightEyePoints[0][0] * scaleX + videoOffsetX, rightEyePoints[0][1] * scaleY + videoOffsetY);
      for (let i = 1; i < rightEyePoints.length; i++) {
        ctx.lineTo(rightEyePoints[i][0] * scaleX + videoOffsetX, rightEyePoints[i][1] * scaleY + videoOffsetY);
      }
      ctx.closePath();
      ctx.strokeStyle = '#00ffff';
      ctx.stroke();
    }
  };

  const drawEyebrowLines = (ctx: CanvasRenderingContext2D, positions: any[], scaleX: number, scaleY: number, videoOffsetX: number, videoOffsetY: number) => {
    // Left eyebrow (indices 17-21)
    const leftEyebrow = positions.slice(17, 22);
    drawPolyline(ctx, leftEyebrow, scaleX, scaleY, '#ff00ff', videoOffsetX, videoOffsetY);
    
    // Right eyebrow (indices 22-26)
    const rightEyebrow = positions.slice(22, 27);
    drawPolyline(ctx, rightEyebrow, scaleX, scaleY, '#ff00ff', videoOffsetX, videoOffsetY);
  };

  const drawNoseLines = (ctx: CanvasRenderingContext2D, positions: any[], scaleX: number, scaleY: number, videoOffsetX: number, videoOffsetY: number) => {
    // Nose outline (indices 27-35)
    const nosePoints = positions.slice(27, 36);
    drawPolyline(ctx, nosePoints, scaleX, scaleY, '#ffff00', videoOffsetX, videoOffsetY);
  };

  const drawMouthLines = (ctx: CanvasRenderingContext2D, positions: any[], scaleX: number, scaleY: number, videoOffsetX: number, videoOffsetY: number) => {
    // Outer mouth (indices 48-58)
    const outerMouth = positions.slice(48, 59);
    drawPolyline(ctx, outerMouth, scaleX, scaleY, '#ff8800', videoOffsetX, videoOffsetY);
    
    // Inner mouth (indices 60-67)
    const innerMouth = positions.slice(60, 68);
    drawPolyline(ctx, innerMouth, scaleX, scaleY, '#ff8800', videoOffsetX, videoOffsetY);
  };

  const drawJawline = (ctx: CanvasRenderingContext2D, positions: any[], scaleX: number, scaleY: number, videoOffsetX: number, videoOffsetY: number) => {
    // Jawline (indices 0-16)
    const jawlinePoints = positions.slice(0, 17);
    drawPolyline(ctx, jawlinePoints, scaleX, scaleY, '#34e7d3', videoOffsetX, videoOffsetY);
  };

  const drawPolyline = (ctx: CanvasRenderingContext2D, points: any[], scaleX: number, scaleY: number, color: string, videoOffsetX: number, videoOffsetY: number) => {
    if (points.length === 0) return;
    
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(points[0][0] * scaleX + videoOffsetX, points[0][1] * scaleY + videoOffsetY);
    
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0] * scaleX + videoOffsetX, points[i][1] * scaleY + videoOffsetY);
    }
    
    ctx.stroke();
  };

  const updateGuidance = (detections: any[]) => {
    // If face detection is not available, show loading
    if (!faceApiAvailable) {
      const newMessage = 'Loading recognition models...';
      if (guidanceMessage !== newMessage) {
        setGuidanceMessage(newMessage);
        setGuidanceType('loading');
      }
      return;
    }
    
    // Update last detection time
    const now = Date.now();
    setLastFaceDetectionTime(now);
    
    // If no faces detected
    if (detections.length === 0) {
      const newMessage = '';
      if (guidanceMessage !== newMessage) {
        setGuidanceMessage(newMessage);
        setGuidanceType('detecting');
      }
      return;
    }

    const detection = detections[0];
    const { detection: box, landmarks } = detection;
    const normalizedBox = normalizeFaceBox(box);
    if (!normalizedBox) {
      console.log('Normalized box invalid, skipping guidance');
      return;
    }

    // 2) Position in guide box
    if (landmarks && landmarks.positions.length > 0) {
      const allLandmarksInBox = areLandmarksInGuideBox(landmarks.positions, normalizedBox);
      if (!allLandmarksInBox) {
        const newMessage = 'Center your face in the guide box';
        if (guidanceMessage !== newMessage) {
          setGuidanceMessage(newMessage);
          setGuidanceType('positioning');
        }
        return;
      }
    }

    // 3) Distance from camera
    const distanceGuidance = getDistanceGuidance(normalizedBox);
    if (distanceGuidance.needsAdjustment) {
      if (guidanceMessage !== distanceGuidance.message) {
        setGuidanceMessage(distanceGuidance.message);
        setGuidanceType('positioning');
      }
      return;
    }

    // 4) Face angle
    if (landmarks && landmarks.positions.length > 0) {
      const angleGuidance = getAngleGuidance(landmarks.positions, normalizedBox);
      if (angleGuidance.shouldCorrect) {
        if (guidanceMessage !== angleGuidance.message) {
          setGuidanceMessage(angleGuidance.message);
          setGuidanceType('positioning');
        }
        return;
      }
    }

    // All checks passed
    const newMessage = 'Perfect! Keep this position';
    if (guidanceMessage !== newMessage) {
      setGuidanceMessage(newMessage);
      setGuidanceType('ready');
    }
  };

  const normalizeFaceBox = (rawBox: any): { x: number; y: number; width: number; height: number } | null => {
    if (!rawBox || typeof rawBox !== 'object') return null;
    const candidate = (rawBox.box && typeof rawBox.box === 'object') ? rawBox.box : rawBox;
    const x = Number((candidate as any).x);
    const y = Number((candidate as any).y);
    const width = Number((candidate as any).width);
    const height = Number((candidate as any).height);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) {
      return null;
    }
    return { x, y, width, height };
  };

  const getDistanceGuidance = (faceBox: any): { needsAdjustment: boolean; message: string } => {
    if (!videoRef.current || !faceBox) {
      return { needsAdjustment: false, message: '' };
    }

    const video = videoRef.current;

    // Use video natural size; fallback to client size if unavailable
    const frameWidth = video.videoWidth || video.clientWidth || 0;
    const frameHeight = video.videoHeight || video.clientHeight || 0;
    if (!frameWidth || !frameHeight) {
      return { needsAdjustment: false, message: '' };
    }

    const faceArea = Math.max(1, Number(faceBox.width)) * Math.max(1, Number(faceBox.height));
    const frameArea = frameWidth * frameHeight;
    const faceAreaRatio = faceArea / frameArea; // 0..1

    // Heuristics:
    // - Too far: face occupies less than ~6% of frame
    // - Too close: face occupies more than ~25% of frame
    if (faceAreaRatio < 0.06) {
      return { needsAdjustment: true, message: 'Move closer to the camera' };
    }
    if (faceAreaRatio > 0.25) {
      return { needsAdjustment: true, message: 'Move a bit farther from the camera' };
    }

    return { needsAdjustment: false, message: '' };
  };

  const getAngleGuidance = (landmarks: any[], faceBox: any): { shouldCorrect: boolean; message: string } => {
    if (!landmarks || landmarks.length < 68) {
      return { shouldCorrect: false, message: '' };
    }

    // Get key landmarks
    const leftCheek = landmarks[0];    // Left face contour (leftmost point)
    const rightCheek = landmarks[16]; // Right face contour (rightmost point)
    const noseTip = landmarks[30];    // Nose tip
    const noseBridge = landmarks[27]; // Nose bridge

    // Check if landmarks are valid
    if (!leftCheek || !rightCheek || !noseTip || !noseBridge) {
      return { shouldCorrect: false, message: '' };
    }

    // Calculate distances from nose tip to each cheek
    const leftDistance = Math.sqrt(
      Math.pow(leftCheek.x - noseTip.x, 2) + Math.pow(leftCheek.y - noseTip.y, 2)
    );
    
    const rightDistance = Math.sqrt(
      Math.pow(rightCheek.x - noseTip.x, 2) + Math.pow(rightCheek.y - noseTip.y, 2)
    );

    // Calculate asymmetry (difference in distances)
    const asymmetry = Math.abs(leftDistance - rightDistance);
    const avgDistance = (leftDistance + rightDistance) / 2;
    const asymmetryRatio = avgDistance > 0 ? asymmetry / avgDistance : 0;

    // If asymmetry is significant (more than 15% difference), guide user to turn
    if (asymmetryRatio > 0.15) {
      if (leftDistance > rightDistance) {
        // Left cheek is farther than right, user needs to turn right
        return { 
          shouldCorrect: true, 
          message: 'Turn your head slightly right' 
        };
      } else {
        // Right cheek is farther than left, user needs to turn left
        return { 
          shouldCorrect: true, 
          message: 'Turn your head slightly left' 
        };
      }
    }

    return { shouldCorrect: false, message: '' };
  };

  const areLandmarksInGuideBox = (landmarks: any[], faceBox: any): boolean => {
    if (!videoRef.current) return false;
    
    const video = videoRef.current;
    
    // Calculate guide box dimensions (the white dashed rectangle)
    const guideBoxWidth = 192; // 12rem = 48 * 4 = 192px
    const guideBoxHeight = 240; // 15rem = 60 * 4 = 240px
    
    // Calculate guide box center position in video coordinates
    const videoCenterX = video.clientWidth / 2;
    const videoCenterY = video.clientHeight / 2;
    
    // Calculate scale factors
    const scaleX = video.clientWidth / video.videoWidth;
    const scaleY = video.clientHeight / video.videoHeight;
    
    // Map guide box to video coordinates
    const guideBoxLeft = (videoCenterX - 96) / scaleX; // Half guide box width
    const guideBoxRight = (videoCenterX + 96) / scaleX;
    const guideBoxTop = (videoCenterY - 120) / scaleY; // Half guide box height
    const guideBoxBottom = (videoCenterY + 120) / scaleY;
    
    // Check if key landmarks are within the guide box
    const keyLandmarks = [
      0, 16,    // Chin corners
      8,        // Chin center
      36, 45,   // Eye outer corners
      48, 54,   // Mouth corners
      27, 30,   // Nose bridge, tip
    ];
    
    let landmarksInBox = 0;
    const requiredLandmarks = 5; // At least 5 key landmarks must be in box
    
    for (const index of keyLandmarks.slice(0, requiredLandmarks)) {
      const landmark = landmarks[index];
      if (landmark && 
          landmark.x >= guideBoxLeft && 
          landmark.x <= guideBoxRight &&
          landmark.y >= guideBoxTop && 
          landmark.y <= guideBoxBottom) {
        landmarksInBox++;
      }
    }
    
    return landmarksInBox >= requiredLandmarks;
  };

  // Effect to handle guidance timeout
  useEffect(() => {
    const timeout = setTimeout(() => {
      const timeSinceDetection = Date.now() - lastFaceDetectionTime;
      if (timeSinceDetection > 3000 && guidanceType !== 'loading') { // 3 seconds timeout
        setGuidanceMessage('');
        setGuidanceType('detecting');
      }
    }, 1000);
    
    return () => clearTimeout(timeout);
  }, [lastFaceDetectionTime, guidanceType]);


  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;
    
    // Get the original video dimensions (full resolution)
    const originalWidth = video.videoWidth;
    const originalHeight = video.videoHeight;
    
    // Set canvas to original video dimensions for full resolution capture
    canvas.width = originalWidth;
    canvas.height = originalHeight;
    
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
    } else {
      ctx.drawImage(
        video,
        0, 0, originalWidth, originalHeight,  // Source rectangle (full video)
        0, 0, originalWidth, originalHeight  // Destination rectangle (full resolution)
      );
    }
    
    const imageData = canvas.toDataURL('image/jpeg', 1.0);
    
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
          setShowDesktopGate(false);
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
      {/* Desktop Gate (desktop only) */}
      {showDesktopGate && !isMobile && (
        <div className="flex-1 relative bg-black/60 overflow-hidden flex items-center justify-center p-6">
          <div className="flex size-full flex-col items-center p-4 max-w-full">
            <div className="my-auto flex flex-col items-center justify-center gap-6">
              <div className="relative mb-10 flex w-64 h-64 items-center justify-center overflow-hidden rounded-2xl bg-white/5 text-white">
                {session && (
                  <QRCodeSVG
                    value={`${window.location.origin}/mobile-capture?session=${session}`}
                    size={256}
                  />
                )}
              </div>
              <div className="flex flex-col gap-2 text-center text-white">
                <h2 className="text-xl sm:text-2xl">Scan this QR code to take a photo with your smartphone</h2>
              </div>
            </div>
            <div className="mt-8 w-full flex flex-col items-center justify-center">
              {session && (
                <DesktopPhotoReceiver
                  session={session}
                  onPhotoReceived={(image) => {
                    setCapturedImage(image);
                    setCameraState('preview');
                    setShowDesktopGate(false); // Optional: hide desktop gate
                    console.log('Photo received, switching to preview step');
                  }}
                />
              )}
            </div>
            <div className="flex w-full flex-col items-center justify-center gap-2 sm:flex-row mt-6">
              <button
                onClick={() => {
                  setShowDesktopGate(false);
                  startCamera();
                }}
                className="w-full sm:max-w-xs relative rounded-md bg-white/20 hover:bg-white/30 text-white px-4 py-3 transition"
                aria-label="Continue on desktop"
              >
                Continue on desktop
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                aria-label="Seleziona file immagine"
              />
              <label
                className="w-full sm:max-w-xs relative rounded-md bg-white/20 hover:bg-white/30 text-white px-4 py-3 text-center transition cursor-pointer"
                aria-label="Upload from device"
                role="button"
                tabIndex={0}
                onClick={openFileDialog}
              >
                Upload from device
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Camera Content */}
      {!showDesktopGate && (
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
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
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
            
            {/* Face Detection Overlay Canvas */}
            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0 pointer-events-none z-10"
              style={{
                transform: currentCamera === 'front' ? 'scaleX(-1)' : 'none'
              }}
            />
            
            {/* Face guide overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-5">
              <div className="w-48 h-60 border-2 border-white border-dashed rounded-lg opacity-50"></div>
            </div>
            
            {/* Dynamic Guidance Text */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
              <div className="px-6 py-3 text-sm text-center max-w-xs text-white footer-medium">
                <AnimatePresence mode="wait" initial={false}>
                  {guidanceType === 'loading' ? (
                    <motion.div
                      key={`loading-${guidanceMessage}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className="flex items-center justify-center gap-2"
                    >
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>{guidanceMessage}</span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key={`msg-${guidanceMessage}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className="flex items-center justify-center"
                    >
                      {guidanceMessage}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            
            {/* Camera indicator */}
            <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
              <span className="text-white text-sm font-medium">
                {currentCamera === 'front' ? 'Fotocamera Anteriore' : 'Fotocamera Posteriore'}
              </span>
            </div>
            
            {/* Face Detection Debug Info */}
            {faceApiAvailable && (
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 z-20">
                <div className="text-white text-xs">
                  <div>Faces: {detectedFaces.length}</div>
                  <div>Model: {modelsLoaded ? '✓' : '✗'}</div>
                  <div>API: {faceApiAvailable ? '✓' : '✗'}</div>
                </div>
              </div>
            )}
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
      )}

      {/* Controls */}
      {!showDesktopGate && (
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
                className="p-4 sm:p-5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded-full transition-colors shadow-lg touch-manipulation min-w-[60px] min-h-[60px] sm:min-w-[70px] sm:min-h-[70px]"
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
              className="px-6 py-3 sm:px-8 sm:py-4 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-lg transition-colors flex items-center gap-2 touch-manipulation font-semibold"
              title="Usa Foto"
              aria-label="Usa questa foto per l'analisi"
            >
              <CheckCircle size={20} />
              Usa Foto
            </button>
          </div>
        )}
      </div>
      )}
    </motion.div>
  );
}
