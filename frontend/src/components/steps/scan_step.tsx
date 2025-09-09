"use client";
import React, { Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { Camera, ArrowLeft } from 'lucide-react';

// Lazy load CameraCapture component
const CameraCapture = lazy(() => import('../CameraCapture'));

interface ScanStepProps {
  onBack: () => void;
  onImageCapture: (imageData: string, metadata: any) => void;
}

export default function ScanStep({ onBack, onImageCapture }: ScanStepProps) {
  return (
    <motion.div
      key="scan"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="h-full flex flex-col"
    >
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <motion.button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </motion.button>
          <h2 className="text-lg font-semibold text-gray-900">Take Photo</h2>
          <div className="w-16"></div> {/* Spacer for centering */}
        </div>
      </div>

      {/* Camera Component */}
      <div className="flex-1 relative">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading camera...</p>
            </div>
          </div>
        }>
          <CameraCapture onImageCapture={onImageCapture} />
        </Suspense>
      </div>

      {/* Instructions */}
      <div className="px-4 py-4 bg-gray-50 border-t border-gray-200">
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <Camera className="w-5 h-5 text-pink-600 mr-2" />
            <span className="text-sm font-medium text-gray-900">Position your face in the frame</span>
          </div>
          <p className="text-xs text-gray-600">
            Make sure your face is well-lit and clearly visible for the best analysis results.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
