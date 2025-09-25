"use client";
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, X, SwitchCameraIcon, ArrowLeft, CheckCircle, Upload } from 'lucide-react';
import { ASSETS } from '../../lib/assets';

interface CameraCaptureStepProps {
  onNext: (imageData: string) => void;
  onBack: () => void;
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

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(true);
  const initializationInProgressRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    startCamera();
    
    return () => {
      isMountedRef.current = false;
      stopCamera();
    };
  }, []);

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
    setIsCameraActive(false);
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
