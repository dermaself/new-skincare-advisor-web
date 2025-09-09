'use client';

import { useState, useEffect, Suspense, lazy } from 'react';

// Lazy load the modal to reduce initial bundle size
const SkinAnalysisModal = lazy(() => import('@/components/SkinAnalysisModal'));

// Preload the modal component for faster loading
const preloadModal = () => {
  import('@/components/SkinAnalysisModal');
};

export default function EmbedPage() {
  const [showModal, setShowModal] = useState(true); // Always show modal in embed mode
  const [isModalReady, setIsModalReady] = useState(false); // Track when modal is ready

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

  // Handle modal ready state
  const handleModalReady = () => {
    setIsModalReady(true);
  };

  // Reset modal ready state when modal closes
  useEffect(() => {
    if (!showModal) {
      setIsModalReady(false);
    }
  }, [showModal]);

  // Fallback timeout in case onReady doesn't fire
  useEffect(() => {
    if (showModal && !isModalReady) {
      const fallbackTimer = setTimeout(() => {
        console.log('Modal ready fallback triggered');
        setIsModalReady(true);
      }, 2000); // 2 second fallback

      return () => clearTimeout(fallbackTimer);
    }
  }, [showModal, isModalReady]);

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
          <SkinAnalysisModal 
            isOpen={showModal} 
            onClose={handleCloseModal} 
            embedded={true}
            onReady={handleModalReady}
          />
        </Suspense>
        
        {/* Loading overlay */}
        {!isModalReady && (
          <div className="absolute inset-0 bg-white flex items-center justify-center z-50">
            <div className="flex flex-col items-center space-y-4">
              <div className="loader__wrapper">
                <div className="loader">&nbsp;</div>
              </div>
              <p className="text-gray-600 text-sm">Loading skin analysis...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 