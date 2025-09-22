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
  // UI extensions
  whyPicked?: string;
  alternatives?: any[]; // TransformedProduct[] from fetcher; keep loose to avoid backend change
  alternativesExpanded?: boolean;
  onToggleAlternatives?: () => void;
}

export default function RoutineProductCard({ 
  product, 
  stepNumber, 
  stepTitle, 
  categoryTitle,
  isLastStep = false,
  showAddAllButton = false,
  onAddAllToCart,
  whyPicked,
  alternatives = [],
  alternativesExpanded = false,
  onToggleAlternatives
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
      {/* Step Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center justify-center h-7 px-3 rounded-full bg-neutral-900 text-white text-sm font-semibold">
          {`Step ${stepNumber}`}
        </span>
        <h2 className="text-2xl font-semibold tracking-tight">{stepTitle}</h2>
      </div>
      
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
          {/* Product main row */}
          <div className="flex items-start gap-3">
            <img 
              key={`product-${product.id}`}
              width="80" 
              height="80"
              src={product.images[0]?.src || 'https://via.placeholder.com/80'} 
              alt={product.title}
              loading="lazy"
              className="w-20 h-20 rounded-lg object-cover bg-muted"
              onLoad={() => {
                console.log('✅ Routine image loaded successfully:', product.images[0]?.src);
              }}
              onError={(e) => {
                console.error('❌ Routine image failed to load:', product.images[0]?.src);
                const target = e.target as HTMLImageElement;
                const placeholderUrl = 'https://via.placeholder.com/80';
                if (target.src !== placeholderUrl) {
                  target.src = placeholderUrl;
                }
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2">
                <div className="min-w-0">
                  <div className="text-lg font-semibold leading-snug truncate">{product.title || 'Unknown Product'}</div>
                  <div className="text-sm text-muted-foreground truncate">{product.vendor || 'Unknown Brand'}</div>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className="inline-flex px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  {selectedVariant ? formatPrice(selectedVariant.price) : '$0.00'}
                </span>
              </div>
            </div>
          </div>
          
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
          
          {/* Why picked bubble */}
          {whyPicked && (
            <div className="mt-4 rounded-3xl bg-muted p-4 text-base leading-relaxed">
              <div className="font-semibold mb-1">Why we picked it</div>
              <p className="text-gray-900">{whyPicked}</p>
            </div>
          )}

          {/* Footer actions: Add to cart + Alternatives toggle */}
          <div className="mt-4 flex items-center gap-3 w-full">
            <button 
              className="inline-flex items-center justify-center h-11 px-4 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-60"
              onClick={isInCart ? handleRemoveFromCart : handleAddToCart}
              disabled={isLoading || !selectedVariant || !isVariantAvailable(selectedVariant) || state.loading}
            >
              {isLoading || state.loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {isInCart ? 'Removing...' : 'Adding...'}
                </>
              ) : isInCart ? (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove from Cart
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Add to Cart
                </>
              )}
            </button>

            {alternatives && alternatives.length > 0 && (
              <button 
                type="button"
                className="flex-1 h-11 inline-flex items-center justify-between rounded-full bg-muted/60 hover:bg-muted text-sm font-medium px-4 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                onClick={onToggleAlternatives}
              >
                <span>View {alternatives.length} alternatives</span>
                <svg className={`w-4 h-4 transition-transform ${alternativesExpanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path d="M5.23 7.21a.75.75 0 011.06.02L10 11.188l3.71-3.956a.75.75 0 011.08 1.04l-4.25 4.53a.75.75 0 01-1.08 0l-4.25-4.53a.75.75 0 01.03-1.06z"/></svg>
              </button>
            )}
          </div>

          {/* Alternatives list when expanded */}
          {alternativesExpanded && alternatives && alternatives.length > 0 && (
            <div className="mt-4 space-y-3">
              <div className="text-sm text-muted-foreground px-1">Other great AI-picked options</div>
              <div className="overflow-x-auto [-webkit-overflow-scrolling:touch]">
                <div className="flex gap-3 w-max pr-1">
                  {alternatives.map((alt: any) => (
                    <div key={alt.id || alt.title} className="dermaself-card min-w-[260px] rounded-2xl">
                      <div className="flex items-start gap-3">
                        <img src={alt.images?.[0]?.src || 'https://via.placeholder.com/64'} alt={alt.title} loading="lazy" className="w-16 h-16 rounded-lg object-cover bg-muted" />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">{alt.title}</div>
                          <div className="text-xs text-muted-foreground truncate">{alt.vendor}</div>
                        </div>
                      </div>
                      {alt.variants?.[0]?.price && (
                        <div className="mt-2 inline-flex px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                          {new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(parseFloat(alt.variants[0].price))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
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

      {/* Removed style jsx in favor of Tailwind utilities */}

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
            className="bg-white rounded-lg w-[calc(100%-2rem)] max-w-md md:w-full max-h-[80vh] mx-auto overflow-y-auto scrollbar-thin scrollbar-thumb-pink-600 scrollbar-track-gray-200"
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