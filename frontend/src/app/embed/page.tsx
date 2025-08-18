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
    <div className="w-full h-screen bg-black/20 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-[540px] h-[95vh] max-h-[800px] bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200 relative">
        {/* Camera Access Notice */}
        <div className="absolute top-4 left-4 right-4 z-10">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-xs">📷</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-900">Camera Access Limited</p>
                  <p className="text-xs text-blue-700">Open in new tab for full camera access</p>
                </div>
              </div>
              <button
                onClick={() => window.open(window.location.href, '_blank', 'width=540,height=800')}
                className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
              >
                Open New Tab
              </button>
            </div>
          </div>
        </div>
        
        <SkinAnalysisModal 
          isOpen={showModal} 
          onClose={handleCloseModal} 
          embedded={true} 
        />
      </div>
    </div>
  );
} 