'use client';

import React from 'react';
import { useCart } from './CartContext';
import CartSuccessModal from './CartSuccessModal';

export default function CartSuccessModalWrapper() {
  const { state, hideCartSuccessModal, proceedToCheckout } = useCart();
  const { showCartSuccessModal, lastAddedProducts } = state;

  const handleContinueShopping = () => {
    hideCartSuccessModal();
  };

  const handleProceedToCheckout = () => {
    proceedToCheckout();
  };

  return (
    <CartSuccessModal
      isOpen={showCartSuccessModal}
      onClose={hideCartSuccessModal}
      onContinueShopping={handleContinueShopping}
      onProceedToCheckout={handleProceedToCheckout}
      addedProducts={lastAddedProducts}
    />
  );
} 