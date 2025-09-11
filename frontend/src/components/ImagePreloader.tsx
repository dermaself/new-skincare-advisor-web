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
        setLoadingText('Loading images...');
        
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
        await preloadPromise;
        
        clearInterval(progressInterval);
        setProgress(100);
        setLoadingText('Ready!');
        
        // Small delay to show completion
        setTimeout(() => {
          setIsLoading(false);
          onComplete();
        }, 500);
        
      } catch (error) {
        console.error('Image preloading failed:', error);
        // Even if preloading fails, continue with the app
        setIsLoading(false);
        onComplete();
      }
    };

    loadImages();
  }, [onComplete]);

  if (!isLoading) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl p-8 shadow-xl max-w-sm w-full mx-4"
      >
        {/* Loading Animation */}
        <div className="text-center mb-6">
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
      </motion.div>
    </div>
  );
}
