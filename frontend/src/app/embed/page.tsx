'use client';

import { useState, useEffect } from 'react';
import SkinAnalysisModal from '@/components/SkinAnalysisModal';

export default function EmbedPage() {
  const [showModal, setShowModal] = useState(true); // Always show modal in embed mode

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
    
    // Notify parent that modal was closed
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'SKIN_ANALYSIS_CLOSED',
        payload: {}
      }, '*');
    }
  };

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