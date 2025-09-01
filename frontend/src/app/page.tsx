'use client';

import { useState, useEffect } from 'react';
import SkinAnalysisModal from '@/components/SkinAnalysisModal';

export default function Home() {
  const [showModal, setShowModal] = useState(false);
  const [isEmbedded, setIsEmbedded] = useState(false);

  // Check if we're embedded in Shopify
  useEffect(() => {
    // Check if we're in an iframe or have Shopify-specific parameters
    const isInIframe = window.parent !== window;
    const urlParams = new URLSearchParams(window.location.search);
    const isShopifyEmbed = urlParams.get('embed') === 'true' || urlParams.get('shopify') === 'true';
    
    setIsEmbedded(isInIframe || isShopifyEmbed);
    
    // If embedded, show modal automatically
    if (isInIframe || isShopifyEmbed) {
      setShowModal(true);
    }
  }, []);

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
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleCloseModal = () => {
    setShowModal(false);
    
    // If embedded, notify parent that modal was closed
    if (isEmbedded && window.parent !== window) {
      window.parent.postMessage({
        type: 'SKIN_ANALYSIS_CLOSED',
        payload: {}
      }, '*');
    }
  };

  // If embedded, show only the modal
  if (isEmbedded) {
    return (
      <div className="w-full h-full">
        <SkinAnalysisModal 
          isOpen={showModal} 
          onClose={handleCloseModal} 
          embedded={true} 
        />
      </div>
    );
  }

  // For standalone mode, show a simple trigger button
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">
          DermaSelf - AI Skin Analysis
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Advanced AI technology that analyzes your skin and provides personalized 
          skincare recommendations. Get professional insights from the comfort of your home.
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
        >
          Start Skin Analysis
        </button>
        
        <SkinAnalysisModal 
          isOpen={showModal} 
          onClose={handleCloseModal} 
          embedded={false} 
        />
      </div>
    </div>
  );
}
