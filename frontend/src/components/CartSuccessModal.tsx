'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, ShoppingBag, X, Loader2 } from 'lucide-react';

interface CartSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinueShopping: () => void;
  onProceedToCheckout: () => void;
  addedProducts: Array<{
    name: string;
    image: string;
    price: number;
  }>;
}

export default function CartSuccessModal({
  isOpen,
  onClose,
  onContinueShopping,
  onProceedToCheckout,
  addedProducts
}: CartSuccessModalProps) {
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const handleProceedToCheckout = async () => {
    setIsCheckingOut(true);
    try {
      await onProceedToCheckout();
    } catch (error) {
      console.error('Checkout error:', error);
      // Reset loading state on error
      setIsCheckingOut(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence key="cart-success-modal">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-white rounded-t-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-primary-600 to-primary-700 p-6 text-white">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <CheckCircle className="w-8 h-8 text-green-300" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Added to Cart!</h2>
                <p className="text-primary-100 text-sm">
                  {addedProducts.length} {addedProducts.length === 1 ? 'product' : 'products'} added successfully
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Added Products */}
            <div className="space-y-3 mb-6">
              {addedProducts.map((product, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-12 h-12 object-cover rounded-md"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{product.name}</h3>
                    <p className="text-sm text-gray-500">€{(product.price / 100).toFixed(2)}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                </div>
              ))}
            </div>

            {/* DermaSelf Badge */}
            <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-blue-800">
                  Recommended by DermaSelf
                </span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                These products are personalized for your skin needs
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleProceedToCheckout}
                className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-primary-700 transition-colors flex items-center justify-center space-x-2"
                disabled={isCheckingOut}
              >
                {isCheckingOut ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <ShoppingBag className="w-5 h-5" />
                    <span>Proceed to Checkout</span>
                  </>
                )}
              </button>
              
              <button
                onClick={onContinueShopping}
                className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
} 