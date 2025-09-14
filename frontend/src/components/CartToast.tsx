'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, X, ShoppingBag } from 'lucide-react';

interface CartToastProps {
  isVisible: boolean;
  onClose: () => void;
  onGoToCart: () => void;
  productName: string;
  cartItemCount: number;
}

export default function CartToast({
  isVisible,
  onClose,
  onGoToCart,
  productName,
  cartItemCount
}: CartToastProps) {
  const toastRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toastRef.current && !toastRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed top-4 right-0 z-50 w-full max-w-md mx-4"
        ref={toastRef}
      >
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
          {/* Header with close button */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-900">
                {productName} has been added to your cart
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close notification"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Continue shopping
            </button>
            
            <button
              onClick={onGoToCart}
              className="flex items-center space-x-2 bg-pink-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-pink-700 transition-colors"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Go to cart ({cartItemCount})</span>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
