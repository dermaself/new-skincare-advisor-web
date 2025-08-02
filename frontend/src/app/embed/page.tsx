'use client';
import React, { useState, useEffect } from 'react';
import SkinAnalysisModal from '@/components/SkinAnalysisModal';

export default function EmbedPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Auto-open the modal when embedded
    setIsModalOpen(true);
  }, []);

  const handleClose = () => {
    setIsModalOpen(false);
    
    // Send message to parent (Shopify) to close iframe
    if (typeof window !== 'undefined' && window.parent !== window) {
      window.parent.postMessage({
        type: 'SHOPIFY_CLOSE_MODAL'
      }, '*');
    }
  };

  return (
    <div className="embed-container min-h-screen bg-gray-50">
      <SkinAnalysisModal 
        isOpen={isModalOpen} 
        onClose={handleClose}
        embedded={true}
      />
    </div>
  );
} 