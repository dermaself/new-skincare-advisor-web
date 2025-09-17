"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { preloadStepImages, getLoadingProgress } from '../lib/imagePreloader';

interface ImagePreloaderProps {
  onComplete: () => void;
  children: React.ReactNode;
}

export default function ImagePreloader({ onComplete, children }: ImagePreloaderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Preparing your skincare analysis...');

  useEffect(() => {
    const loadImages = async () => {
      try {
        setLoadingText('Dermaself - AI Skin Analysis');
        
        // Start preloading images
        const preloadPromise = preloadStepImages();
        
        // Update progress periodically
        const progressInterval = setInterval(() => {
          const { percentage } = getLoadingProgress();
          setProgress(percentage);
          
          if (percentage >= 100) {
            clearInterval(progressInterval);
          }
        }, 100);
        
        // Wait for preloading to complete
        const results = await preloadPromise;
        
        clearInterval(progressInterval);
        setProgress(100);
        
        // Check if we have any successful loads
        const successful = results.filter(r => r.success).length;
        const total = results.length;
        
        if (successful === 0) {
          console.warn('⚠️ No images loaded successfully, but continuing...');
        } else {
          console.log(`✅ Image preloading completed: ${successful}/${total} images loaded`);
        }
        
        // Small delay to show completion
        setTimeout(() => {
          setIsLoading(false);
          onComplete();
        }, 500);
        
      } catch (error) {
        console.error('Image preloading failed:', error);
        // Even if preloading fails, continue with the app
        setTimeout(() => {
          setIsLoading(false);
          onComplete();
        }, 1000);
      }
    };

    loadImages();
  }, [onComplete]);

  if (!isLoading) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" />
      
      {/* Modal Container - Same as SkinAnalysisModal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="relative w-full bg-white overflow-hidden flex flex-col h-full md:max-w-[540px] w-full h-full md:max-h-[95vh]"
      >
        {/* Header - Same as modal */}
        <div className="bg-black px-4 py-3 flex items-center justify-center border-b border-gray-700">
          <div className="flex-1 text-center">
            <h2 className="text-lg font-semibold text-white">
              Dermaself - AI Skin Analysis
            </h2>
          </div>
        </div>

        {/* Loading Content */}
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
          <div className="text-center max-w-sm w-full mx-4">
            {/* Loading Animation */}
            <div className="mb-6">
              <motion.div
                className="w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full mx-auto mb-4"
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 180, 360]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {loadingText}
              </h2>
              
              <p className="text-sm text-gray-600">
                AI-powered skin analysis loading...
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <motion.div
                className="bg-gradient-to-r from-pink-500 to-purple-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
            
            <div className="text-center">
              <span className="text-sm font-medium text-gray-700">
                {progress}%
              </span>
            </div>
          </div>
        </div>

        {/* Footer - Same as modal */}
        <div className="bg-gray-100 px-4 py-2 border-t border-gray-200">
          <div className="flex items-center justify-center">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
