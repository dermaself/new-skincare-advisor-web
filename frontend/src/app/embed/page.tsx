'use client';

import { useState, useEffect, Suspense, lazy } from 'react';

// Lazy load the modal and preloader to reduce initial bundle size
const SkinAnalysisModal = lazy(() => import('@/components/SkinAnalysisModal'));
const ImagePreloader = lazy(() => import('@/components/ImagePreloader'));

// Preload the modal component for faster loading
const preloadModal = () => {
  import('@/components/SkinAnalysisModal');
};

export default function EmbedPage() {
  const [showModal, setShowModal] = useState(true); // Always show modal in embed mode
  const [isReady, setIsReady] = useState(false); // Track when everything is ready

  // Listen for messages from parent Shopify page
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'OPEN_SKIN_ANALYSIS') {
        setShowModal(true);
      } else if (event.data.type === 'CLOSE_SKIN_ANALYSIS') {
        setShowModal(false);
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Preload modal components for faster loading
    preloadModal();
    
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Handle everything ready (images preloaded + modal ready)
  const handleEverythingReady = () => {
    setIsReady(true);
  };

  // Reset ready state when modal closes
  useEffect(() => {
    if (!showModal) {
      setIsReady(false);
    }
  }, [showModal]);

  // Fallback timeout in case everything doesn't load
  useEffect(() => {
    if (showModal && !isReady) {
      const fallbackTimer = setTimeout(() => {
        console.log('Embed ready fallback triggered');
        setIsReady(true);
      }, 5000); // 5 second fallback

      return () => clearTimeout(fallbackTimer);
    }
  }, [showModal, isReady]);

  const handleCloseModal = () => {
    setShowModal(false);
    
    // Notify parent that modal was closed
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'SKIN_ANALYSIS_CLOSED',
        payload: {}
      }, '*');
    }
  };

  return (
    <div className="w-full h-screen bg-black/20 backdrop-blur-sm flex items-center justify-center p-0 md:p-4">
      <div className="w-full max-w-[540px] h-[95vh] max-h-[800px] bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200 relative md:rounded-xl rounded-none">
        <Suspense fallback={
          <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="loader__wrapper">
                <div className="loader">&nbsp;</div>
              </div>
              <p className="text-gray-600 text-sm">Loading skin analysis...</p>
            </div>
          </div>
        }>
          {!isReady ? (
            <ImagePreloader mode="initial" onComplete={handleEverythingReady}>
              <SkinAnalysisModal 
                isOpen={showModal} 
                onClose={handleCloseModal} 
                embedded={true}
                onReady={() => {}} // No need for separate modal ready callback
              />
            </ImagePreloader>
          ) : (
            <SkinAnalysisModal 
              isOpen={showModal} 
              onClose={handleCloseModal} 
              embedded={true}
              onReady={() => {}}
            />
          )}
        </Suspense>
      </div>
    </div>
  );
} 