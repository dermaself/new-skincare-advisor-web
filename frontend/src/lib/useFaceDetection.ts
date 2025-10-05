"use client";
import { useState, useEffect, useRef } from 'react';

// Dynamic import to avoid SSR issues
let faceapi: any = null;

interface FaceDetectionState {
  modelsLoaded: boolean;
  faceApiAvailable: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useFaceDetection = () => {
  const [state, setState] = useState<FaceDetectionState>({
    modelsLoaded: false,
    faceApiAvailable: false,
    isLoading: false,
    error: null
  });

  const initializationInProgressRef = useRef(false);

  const loadModels = async () => {
    // Prevent multiple simultaneous initializations
    if (initializationInProgressRef.current || state.modelsLoaded) {
      return;
    }

    initializationInProgressRef.current = true;
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      console.log('Loading face-api.js models...');
      
      // Try to load face-api.js dynamically
      try {
        const module = await import('face-api.js');
        faceapi = module;
        setState(prev => ({ ...prev, faceApiAvailable: true }));
        
        // Load models from the correct CDN URL
        const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        
        setState(prev => ({ 
          ...prev, 
          modelsLoaded: true, 
          isLoading: false 
        }));
        
        console.log('face-api.js models loaded successfully');
      } catch (faceApiError) {
        console.warn('face-api.js not available, continuing without face detection:', faceApiError);
        setState(prev => ({ 
          ...prev, 
          modelsLoaded: true, // Mark as loaded so we can continue without face detection
          isLoading: false 
        }));
      }
    } catch (error) {
      console.error('Error in loadModels:', error);
      setState(prev => ({ 
        ...prev, 
        modelsLoaded: true, // Mark as loaded so we can continue
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    } finally {
      initializationInProgressRef.current = false;
    }
  };

  // Only load models if we're not in SSR
  useEffect(() => {
    if (typeof window !== 'undefined') {
      loadModels();
    }
  }, []);

  return {
    ...state,
    faceapi,
    loadModels
  };
};
