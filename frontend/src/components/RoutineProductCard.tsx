'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Loader2, CheckCircle, Trash2, Info, X } from 'lucide-react';
import { useCart } from './CartContext';

interface ProductVariant {
  id: string | number;
  title: string;
  price: string;
  inventory_quantity: number;
}

interface ProductImage {
  id: number;
  src: string;
  alt: string;
}

interface Product {
  id: number;
  title: string;
  vendor: string;
  product_type: string;
  tags: string;
  variants: ProductVariant[];
  images: ProductImage[];
  body_html: string;
  created_at: string;
  updated_at: string;
}

interface RoutineProductCardProps {
  product: Product;
  stepNumber: number;
  stepTitle: string;
  categoryTitle?: string;
  isLastStep?: boolean;
  showAddAllButton?: boolean;
  onAddAllToCart?: () => void;
}

export default function RoutineProductCard({ 
  product, 
  stepNumber, 
  stepTitle, 
  categoryTitle,
  isLastStep = false,
  showAddAllButton = false,
  onAddAllToCart 
}: RoutineProductCardProps) {
  
  // Early return if product is invalid
  if (!product) {
    console.error('RoutineProductCard: Product is undefined');
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Error: Product data is missing</p>
      </div>
    );
  }

  // Ensure variants array exists and has at least one item
  const safeVariants = product.variants && Array.isArray(product.variants) && product.variants.length > 0 
    ? product.variants 
    : [{
        id: 'default',
        title: 'Default',
        price: '0',
        inventory_quantity: 1
      }];

  const { addToCart, removeFromCart, isProductInCart, getCartItemLineId, state } = useCart();
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    safeVariants[0] || null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState<'added' | 'removed' | false>(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Check if product is in cart
  const variantId = selectedVariant ? `gid://shopify/ProductVariant/${selectedVariant.id}` : null;
  const isInCart = variantId ? isProductInCart(variantId) : false;
  const cartLineId = variantId ? getCartItemLineId(variantId) : null;

  // Refresh cart state when component mounts or cart changes
  useEffect(() => {
    // This will be handled by the cart context automatically
  }, [state.cart]);

  const handleAddToCart = async () => {
    if (!selectedVariant || !variantId) {
      console.error('Cannot add to cart: missing variant or variantId');
      setErrorMessage('Product variant not available');
      setShowError(true);
      return;
    }

    setIsLoading(true);
    setShowSuccess(false);
    setShowError(false);
    setErrorMessage('');

    try {
      // Add custom attributes for tracking recommended products
      const customAttributes = [
        {
          key: 'source',
          value: 'dermaself_recommendation'
        },
        {
          key: 'recommendation_type',
          value: 'skin_analysis'
        },
        {
          key: 'product_step',
          value: stepTitle.toLowerCase().replace('step ', '').replace(':', '')
        },
        {
          key: 'added_at',
          value: new Date().toISOString()
        }
      ];
      
      // Prepare product info for the modal
      const productInfo = {
        name: product.title || (product as any).name || 'Unknown Product',
        image: product.images[0]?.src || 'https://via.placeholder.com/300x300?text=Product',
        price: parseFloat(selectedVariant.price || '0') * 100 // Convert to cents
      };
      
      await addToCart(variantId, 1, customAttributes, productInfo);
      
      // Show success overlay briefly
      setShowSuccess('added');
      setTimeout(() => setShowSuccess(false), 1000);
      
      // The cart success modal will be shown automatically by the CartContext
    } catch (error) {
      console.error('Failed to add to cart:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to add to cart');
      setShowError(true);
      
      // Hide error message after 3 seconds
      setTimeout(() => setShowError(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFromCart = async () => {
    if (!cartLineId) return;

    setIsLoading(true);
    setShowSuccess(false);
    setShowError(false);
    setErrorMessage('');

    try {
      await removeFromCart(cartLineId);
      setShowSuccess('removed');
      
      // Hide success message after 2 seconds
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Failed to remove from cart:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to remove from cart');
      setShowError(true);
      
      // Hide error message after 3 seconds
      setTimeout(() => setShowError(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };


  const formatPrice = (price: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(price));
  };

  const isVariantAvailable = (variant: ProductVariant) => {
    return variant.inventory_quantity > 0;
  };

  // Extract tags from product tags string
  const productTags = (product.tags && typeof product.tags === 'string') 
    ? product.tags.split(',').map(tag => tag.trim()).filter(tag => tag) 
    : [];
  
  // Get tag colors based on tag content
  const getTagColor = (tag: string) => {
    const tagLower = tag.toLowerCase();
    if (tagLower.includes('oily')) return 'rgb(248, 194, 27)'; // Yellow
    if (tagLower.includes('dark') || tagLower.includes('uneven')) return 'rgb(177, 206, 81)'; // Green
    if (tagLower.includes('dry') || tagLower.includes('sensitive')) return 'rgb(255, 99, 132)'; // Red
    return 'rgb(100, 149, 237)'; // Default blue
  };
  

  return (
    <section className="routine-steps">
      <h1 className="heading-1 w-full step-name flex items-center justify-center gap-2">
        <p>{stepTitle}</p>
        <p className="rounded-full bg-gray-200 px-4 py-1">{categoryTitle}</p>
      </h1>
      
      <div className="step-content">
        {/* Product Image Slider */}
        <div className="swiper-container">
          <div className="swiper-slide">
            <img 
              key={`product-${product.id}`}
              width="500px" 
              src={product.images[0]?.src || 'https://via.placeholder.com/300x300/f0f0f0/999999?text=Product+Image'} 
              alt={product.title}
              className="w-full h-auto"
              onLoad={() => {
                console.log('✅ Routine image loaded successfully:', product.images[0]?.src);
              }}
              onError={(e) => {
                console.error('❌ Routine image failed to load:', product.images[0]?.src);
                // Fallback to placeholder
                const target = e.target as HTMLImageElement;
                const placeholderUrl = 'https://via.placeholder.com/300x300/f0f0f0/999999?text=Product+Image';
                if (target.src !== placeholderUrl) {
                  target.src = placeholderUrl;
                }
              }}
            />
          </div>
        </div>

        {/* Product Info */}
        <div className="product-info__tablet">
          <h2 className="heading-3 product-name">
            {product.vendor || 'Unknown Brand'} {product.title || 'Unknown Product'}
          </h2>
          
          {/* Tags */}
          <div className="tags">
            {productTags.map((tag, index) => (
              <div key={index}>
                <p 
                  className="body-mobile-small tag-colour border-2"
                >
                  {tag}
                </p>
              </div>
            ))}
          </div>
          
          <div className="product-info-container">
            <div className="product-info">
              <p className="body-mobile price-container">
                <span className="current-price px-2 font-medium">
                  Price: {selectedVariant ? formatPrice(selectedVariant.price) : '$0.00'}
                </span>
              </p>
            </div>

            <div className="flex items-center justify-between w-full">
              <button 
                className="flex items-center px-4 py-2 rounded-lg font-medium transition-colors bg-gray-200 hover:bg-gray-300"
                onClick={() => setShowDetailsModal(true)}
              >
                <Info className="w-4 h-4 mr-2" />
                Details
              </button>
              {/* Cart Button */}
              <button 
                className={`ml-auto px-4 py-2 rounded-lg font-medium transition-colors ${isInCart ? 'remove-btn' : 'add-btn'}`}
                onClick={isInCart ? handleRemoveFromCart : handleAddToCart}
                disabled={isLoading || !selectedVariant || !isVariantAvailable(selectedVariant) || state.loading}
              >
                {isLoading || state.loading ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {isInCart ? 'Removing...' : 'Adding...'}
                  </div>
                ) : isInCart ? (
                  <div className="flex items-center justify-center">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove from Cart
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Add to Cart
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Success Overlay */}
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-green-500 bg-opacity-90 flex items-center justify-center rounded-lg"
          >
            <div className="text-white text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-2" />
              <p className="font-semibold">
                {showSuccess === 'added' ? 'Added to Cart!' : 'Removed from Cart!'}
              </p>
            </div>
          </motion.div>
        )}

        {/* Error Overlay */}
        {showError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-red-500 bg-opacity-90 flex items-center justify-center rounded-lg"
          >
            <div className="text-white text-center">
              <div className="w-12 h-12 mx-auto mb-2 flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
              <p className="font-semibold">Error</p>
              <p className="text-sm mt-1">{errorMessage}</p>
            </div>
          </motion.div>
        )}
      </div>

      

      {/* Step Separator */}
      {!isLastStep && <div className="step-separator"></div>}

      {/* Add All to Bag Button for Last Step */}
      {isLastStep && showAddAllButton && onAddAllToCart && (
        <button 
          className="mt-4 bg-pink-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-pink-700 transition-colors"
          onClick={onAddAllToCart}
          disabled={state.loading}
        >
          {state.loading ? (
            <div className="flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Adding Routine...
            </div>
          ) : (
            'ADD FULL ROUTINE TO BAG'
          )}
        </button>
      )}

      <style jsx>{`
        .cart-btn {
          font-weight: 600;
          transition: all 0.2s ease;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 140px;
        }

        .add-btn {
          background-color: #ff6b9d;
          color: white;
        }

        .add-btn:hover:not(:disabled) {
          background-color: #ff6b9d;
          transform: translateY(-1px);
        }

        .remove-btn {
          background-color:rgb(77, 77, 77);
          color: white;
        }

        .remove-btn:hover:not(:disabled) {
          background-color: rgb(70, 70, 70);
          transform: translateY(-1px);
        }

        .cart-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #ff6b9d #f1f1f1;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #ff6b9d;
          border-radius: 4px;
          transition: background 0.2s ease;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #e55a8a;
        }

        .custom-scrollbar::-webkit-scrollbar-corner {
          background: #f1f1f1;
        }
      `}</style>

      {/* Product Details Modal */}
      {showDetailsModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDetailsModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-lg max-w-md w-full overflow-y-auto scrollbar-thin scrollbar-thumb-pink-600 scrollbar-track-gray-200"
            style={{ maxHeight: '80vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Product Details</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4">
              {/* Product Image */}
              <div className="mb-4">
                <img
                  src={product.images[0]?.src || 'https://via.placeholder.com/300x300/f0f0f0/999999?text=Product+Image'}
                  alt={product.title}
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>

              {/* Product Info */}
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-lg">{product.title}</h4>
                  <p className="text-gray-600">{product.vendor}</p>
                </div>

                {/* Price */}
                <div>
                  <p className="text-xl font-bold text-pink-600">
                    {selectedVariant ? formatPrice(selectedVariant.price) : '$0.00'}
                  </p>
                </div>

                {/* Tags */}
                {productTags.length > 0 && (
                  <div>
                    <p className="font-medium mb-2">Tags:</p>
                    <div className="flex flex-wrap gap-2">
                      {productTags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs rounded-full border"
                          style={{ borderColor: getTagColor(tag) }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                {product.body_html && (
                  <div>
                    <p className="font-medium mb-2">Description:</p>
                    <div 
                      className="text-sm text-gray-700 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ 
                        __html: product.body_html.replace(/<[^>]*>/g, '').substring(0, 500) + '...' 
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </section>
  );
} 