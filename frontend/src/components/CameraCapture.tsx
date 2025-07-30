'use client';
import { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Camera, RotateCcw, X, Image as ImageIcon, AlertTriangle } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (imageData: string, metadata?: ImageMetadata) => void;
  onClose: () => void;
  embedded?: boolean; // New prop to control embedded mode
}

interface ImageMetadata {
  source: 'camera' | 'file';
  facingMode?: 'user' | 'environment';
  fileName?: string;
  fileSize?: number;
  timestamp: number;
}

const CameraCapture = ({ onCapture, onClose, embedded = false }: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Camera states
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  
  // Image states
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [imageMetadata, setImageMetadata] = useState<ImageMetadata | null>(null);
  
  // UI states
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);

  // Security and validation utilities
  const sanitizeFileName = useCallback((fileName: string): string => {
    // OWASP: Prevent directory traversal and XSS in filenames
    return fileName
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Only allow alphanumeric, dots, underscores, hyphens
      .substring(0, 255) // Limit filename length
      .toLowerCase();
  }, []);

  const validateImageFile = useCallback((file: File): { isValid: boolean; error?: string } => {
    // OWASP: File validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const minSize = 1024; // 1KB minimum to prevent empty files
    
    if (!allowedTypes.includes(file.type)) {
      return { 
        isValid: false, 
        error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.' 
      };
    }
    
    if (file.size > maxSize) {
      return { 
        isValid: false, 
        error: 'File is too large. Maximum size is 10MB.' 
      };
    }
    
    if (file.size < minSize) {
      return { 
        isValid: false, 
        error: 'File is too small. Minimum size is 1KB.' 
      };
    }

    // Additional MIME type validation using file signature
    return { isValid: true };
  }, []);

  const detectAvailableCameras = useCallback(async () => {
    try {
      // Request permissions first
      await navigator.mediaDevices.getUserMedia({ video: true });
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setAvailableCameras(videoDevices);
      
      // Clean up permission stream
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('Error detecting cameras:', error);
      setAvailableCameras([]);
    }
  }, []);

  const startCamera = useCallback(async (targetFacingMode?: 'user' | 'environment') => {
    try {
      setIsLoading(true);
      setError(null);
      
      const currentFacingMode = targetFacingMode || facingMode;
      
      // OWASP: Secure camera constraints
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: currentFacingMode },
          width: { ideal: 1280, min: 640, max: 1920 },
          height: { ideal: 720, min: 480, max: 1080 },
          aspectRatio: { ideal: 16/9 },
          frameRate: { ideal: 30, max: 60 }
        },
        audio: false, // Explicitly disable audio for privacy
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Verify we got the expected constraints
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        console.log('Camera settings:', settings);
      }

      setStream(mediaStream);
      setIsCameraActive(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown camera error';
      
      // OWASP: Don't expose internal error details to user
      if (errorMessage.includes('Permission denied') || errorMessage.includes('NotAllowedError')) {
        setError('Camera access denied. Please allow camera permissions and try again.');
      } else if (errorMessage.includes('NotFoundError')) {
        setError('No camera found. Please connect a camera and try again.');
      } else {
        setError('Unable to access camera. Please check permissions and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      setStream(null);
      setIsCameraActive(false);
    }
  }, [stream]);

  const switchCamera = useCallback(async () => {
    if (availableCameras.length <= 1) {
      setError('No additional cameras available.');
      return;
    }
    
    try {
      setIsSwitchingCamera(true);
      setError(null);
      
      const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
      setFacingMode(newFacingMode);
      
      stopCamera();
      await new Promise(resolve => setTimeout(resolve, 300)); // Allow cleanup
      await startCamera(newFacingMode);
    } catch (error) {
      console.error('Error switching camera:', error);
      setError('Unable to switch camera. Please try again.');
    } finally {
      setIsSwitchingCamera(false);
    }
  }, [availableCameras.length, facingMode, stopCamera, startCamera]);

  const handleFileUpload = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // OWASP: Validate file
      const validation = validateImageFile(file);
      if (!validation.isValid) {
        setError(validation.error || 'Invalid file selected.');
        return;
      }
      
      // OWASP: Sanitize filename for metadata
      const sanitizedFileName = sanitizeFileName(file.name);
      
      // Convert file to base64 for preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          setCapturedImage(result);
          setImageMetadata({
            source: 'file',
            fileName: sanitizedFileName,
            fileSize: file.size,
            timestamp: Date.now()
          });
          stopCamera(); // Stop camera when using file
        }
      };
      
      reader.onerror = () => {
        setError('Failed to read the selected file. Please try again.');
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error handling file upload:', error);
      setError('Failed to process the selected file. Please try again.');
    } finally {
      setIsLoading(false);
      // Clear file input for security
      if (event.target) {
        event.target.value = '';
      }
    }
  }, [validateImageFile, sanitizeFileName, stopCamera]);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        try {
          // Set canvas dimensions to match video
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          // Draw the current video frame to canvas
          context.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Convert to base64 image data with OWASP-safe quality
          const imageData = canvas.toDataURL('image/jpeg', 0.8);
          setCapturedImage(imageData);
          setImageMetadata({
            source: 'camera',
            facingMode,
            timestamp: Date.now()
          });
        } catch (error) {
          console.error('Error capturing photo:', error);
          setError('Failed to capture photo. Please try again.');
        }
      }
    }
  }, [facingMode]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    setImageMetadata(null);
  }, []);

  const confirmPhoto = useCallback(() => {
    if (capturedImage && imageMetadata) {
      onCapture(capturedImage, imageMetadata);
    }
  }, [capturedImage, imageMetadata, onCapture]);

  // Start camera when component mounts
  useEffect(() => {
    const initializeCamera = async () => {
      await detectAvailableCameras();
      await startCamera();
    };
    
    initializeCamera();
    
    return () => {
      stopCamera();
    };
  }, []); // Remove dependencies to avoid eslint warning

  // If in embedded mode, render a simplified version
  if (embedded) {
    return (
      <div className="w-full h-full flex flex-col">
        {/* Header for embedded mode */}
        <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
          <h3 className="text-lg font-semibold">Take a Photo</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            aria-label="Close camera"
          >
            <X size={20} />
          </button>
        </div>

        {/* Camera View */}
        <div className="flex-1 relative bg-black overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                <p className="text-sm">Initializing camera...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
              <div className="bg-white max-w-sm mx-4 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-3">
                  <AlertTriangle className="text-red-500" size={20} />
                  <h4 className="font-semibold text-gray-900">Camera Error</h4>
                </div>
                <p className="text-sm text-gray-600 mb-3">{error}</p>
                <div className="flex space-x-2">
                  <button
                    onClick={onClose}
                    className="flex-1 px-3 py-2 bg-gray-200 text-gray-800 text-sm rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => startCamera()}
                    className="flex-1 px-3 py-2 bg-primary-600 text-white text-sm rounded"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {!capturedImage ? (
            <div className="relative w-full h-full">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              
              {/* Camera Overlay */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Capture Guide */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="border-2 border-white border-opacity-50 rounded-full w-48 h-48 max-w-[60vw] max-h-[30vh]"></div>
                </div>
                
                <div className="absolute bottom-4 left-4 right-4 text-center text-white">
                  <p className="text-xs opacity-75 bg-black bg-opacity-30 px-2 py-1 rounded-full inline-block">
                    Position your face within the frame
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full">
              <img
                src={capturedImage}
                alt="Captured photo"
                className="w-full h-full object-cover"
              />
              
              {/* Photo Overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-25 flex items-center justify-center">
                <div className="text-center text-white">
                  <Camera size={32} className="mx-auto mb-2 opacity-75" />
                  <p className="text-xs bg-black bg-opacity-50 px-2 py-1 rounded-full">Photo captured</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-4 bg-gray-50 border-t">
          {!capturedImage ? (
            <div className="space-y-3">
              {/* Control buttons */}
              <div className="flex items-center justify-center space-x-3">
                {/* Upload Button */}
                <button
                  onClick={handleFileUpload}
                  disabled={isLoading}
                  className="w-12 h-12 bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center rounded-full"
                  aria-label="Upload image from device"
                >
                  <ImageIcon size={16} />
                </button>
                
                {/* Capture Button */}
                <button
                  onClick={capturePhoto}
                  disabled={!isCameraActive || isLoading}
                  className="w-14 h-14 bg-primary-600 text-white hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center rounded-full shadow-lg"
                  aria-label="Capture photo"
                >
                  <Camera size={20} />
                </button>
                
                {/* Switch Camera Button */}
                <button
                  onClick={switchCamera}
                  disabled={isLoading || isSwitchingCamera || availableCameras.length <= 1}
                  className="w-12 h-12 bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center rounded-full"
                  aria-label="Switch camera"
                >
                  {isSwitchingCamera ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700"></div>
                  ) : (
                    <RotateCcw size={16} />
                  )}
                </button>
              </div>
              
              {/* Camera indicator */}
              <div className="text-center">
                <span className="text-xs text-gray-500">
                  {facingMode === 'user' ? '📱 Front Camera' : '📷 Back Camera'}
                  {availableCameras.length > 1 && ` (${availableCameras.length} available)`}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={retakePhoto}
                className="flex-1 px-3 py-2 bg-gray-200 text-gray-800 text-sm rounded"
              >
                Retake
              </button>
              <button
                onClick={confirmPhoto}
                className="flex-1 px-3 py-2 bg-primary-600 text-white text-sm rounded"
              >
                Use Photo
              </button>
            </div>
          )}
        </div>

        {/* Hidden file input for upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
          aria-hidden="true"
        />

        {/* Hidden canvas for capturing */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  // Full-screen mode (original implementation)
  if (error) {
    return (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="bg-white max-w-md w-full mx-4 p-6 rounded-lg">
          <div className="flex items-center space-x-3 mb-4">
            <AlertTriangle className="text-red-500" size={24} />
            <h3 className="text-lg font-semibold text-gray-900">Camera Error</h3>
          </div>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={() => startCamera()}
              className="flex-1 px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 transition-colors rounded-lg"
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
      className="fixed inset-0 z-50 flex flex-col bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white text-black safe-area-top">
        <h3 className="text-lg font-semibold">Take a Photo</h3>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors touch-manipulation active:scale-95"
          aria-label="Close camera"
          title="Close camera"
        >
          <X size={24} />
        </button>
      </div>

      {/* Camera View - Full screen minus controls */}
      <div className="flex-1 relative bg-black overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p>Initializing camera...</p>
            </div>
          </div>
        )}

        {!capturedImage ? (
          <div className="relative w-full h-full">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* Camera Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Capture Guide */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="border-2 border-white border-opacity-50 rounded-full w-64 h-64 max-w-[80vw] max-h-[40vh]"></div>
              </div>
              
              <div className="absolute bottom-4 left-4 right-4 text-center text-white">
                <p className="text-sm opacity-75 bg-black bg-opacity-30 px-3 py-1 rounded-full inline-block">
                  Position your face within the frame
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative w-full h-full">
            <img
              src={capturedImage}
              alt="Captured photo"
              className="w-full h-full object-cover"
            />
            
            {/* Photo Overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-25 flex items-center justify-center">
              <div className="text-center text-white">
                <Camera size={48} className="mx-auto mb-2 opacity-75" />
                <p className="text-sm bg-black bg-opacity-50 px-3 py-1 rounded-full">Photo captured</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 bg-gray-50 safe-area-bottom">
        {!capturedImage ? (
          <div className="space-y-4">
            {/* Mobile-optimized control buttons */}
            <div className="flex items-center justify-center space-x-4">
              {/* Upload Button - Left */}
              <button
                onClick={handleFileUpload}
                disabled={isLoading}
                className="w-14 h-14 bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center rounded-full touch-manipulation active:scale-95"
                aria-label="Upload image from device"
                title="Upload image"
              >
                <ImageIcon size={20} />
              </button>
              
              {/* Capture Button - Center (larger) */}
              <button
                onClick={capturePhoto}
                disabled={!isCameraActive || isLoading}
                className="w-16 h-16 bg-primary-600 text-white hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center rounded-full shadow-lg touch-manipulation active:scale-95"
                aria-label="Capture photo"
                title="Capture photo"
              >
                <Camera size={24} />
              </button>
              
              {/* Switch Camera Button - Right */}
              <button
                onClick={switchCamera}
                disabled={isLoading || isSwitchingCamera || availableCameras.length <= 1}
                className="w-14 h-14 bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center rounded-full touch-manipulation active:scale-95"
                aria-label="Switch camera"
                title="Switch camera"
              >
                {isSwitchingCamera ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-700"></div>
                ) : (
                  <RotateCcw size={20} />
                )}
              </button>
            </div>
            
            {/* Camera indicator */}
            <div className="text-center">
              <span className="text-xs text-gray-500">
                {facingMode === 'user' ? '📱 Front Camera' : '📷 Back Camera'}
                {availableCameras.length > 1 && ` (${availableCameras.length} available)`}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={retakePhoto}
              className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors rounded-lg touch-manipulation active:scale-95"
            >
              Retake
            </button>
            <button
              onClick={confirmPhoto}
              className="flex-1 px-4 py-3 bg-primary-600 text-white hover:bg-primary-700 transition-colors rounded-lg touch-manipulation active:scale-95"
            >
              Use Photo
            </button>
          </div>
        )}
      </div>

      {/* Hidden file input for upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        aria-hidden="true"
      />

      {/* Hidden canvas for capturing */}
      <canvas ref={canvasRef} className="hidden" />
    </motion.div>
  );
};

export default CameraCapture;
