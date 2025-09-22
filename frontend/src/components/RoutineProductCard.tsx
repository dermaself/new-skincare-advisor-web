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
  const [whyExpanded, setWhyExpanded] = useState(false);

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
    <div className="bg-gray-50 min-h-screen">
      {/* Step Header */}
      <div className="flex items-center gap-2 mb-4 px-4">
        <span className="inline-flex items-center justify-center h-7 px-3 rounded-full bg-neutral-900 text-white text-sm font-semibold">
          {`Step ${stepNumber}`}
        </span>
        <h2 className="text-2xl font-semibold tracking-tight text-gray-900">{stepTitle}</h2>
      </div>
      
      {/* Separator */}
      <div className="mx-4 mb-6 h-px bg-gray-200"></div>
      
      {/* Product Card */}
      <div className="mx-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Product Info */}
          <div className="p-4">
            {/* Product main row */}
            <div className="flex items-start gap-4">
              <img 
                key={`product-${product.id}`}
                width="80" 
                height="80"
                src={product.images[0]?.src || 'https://via.placeholder.com/80'} 
                alt={product.title}
                loading="lazy"
                className="w-20 h-20 rounded-lg object-cover bg-gray-100"
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
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="text-lg font-bold leading-snug text-gray-900">{product.title || 'Unknown Product'}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {product.vendor || 'Unknown Brand'} · {selectedVariant ? formatPrice(selectedVariant.price) : '$0.00'} · {product.product_type || 'Skincare'} ✨
                    </div>
                  </div>
                  <button 
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    onClick={isInCart ? handleRemoveFromCart : handleAddToCart}
                    disabled={isLoading || !selectedVariant || !isVariantAvailable(selectedVariant) || state.loading}
                    title={isInCart ? 'Remove from cart' : 'Add to cart'}
                    aria-label={isInCart ? 'Remove from cart' : 'Add to cart'}
                  >
                    <ShoppingCart className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
                
                {/* Fit and Verified chips */}
                <div className="mt-3 flex items-center gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-semibold">
                    93% fit
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Lóvi MD Verified
                  </span>
                </div>
              </div>
            </div>
            
            {/* Why picked section */}
            {whyPicked && (
              <div className="mt-6">
                <div className="font-semibold text-gray-900 mb-2">Why we picked it</div>
                <p className={`text-gray-700 text-sm leading-relaxed ${whyExpanded ? '' : 'line-clamp-3'}`}>{whyPicked}</p>
                {whyPicked.length > 150 && (
                  <button
                    type="button"
                    className="mt-2 text-sm font-semibold text-pink-600 hover:text-pink-700"
                    onClick={() => setWhyExpanded(prev => !prev)}
                  >
                    {whyExpanded ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
            )}

          </div>
        </div>
        
        {/* Footer actions: Add to cart + Alternatives toggle */}
        <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full">
          <button 
            className={`inline-flex items-center justify-center h-12 px-6 rounded-full font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 disabled:opacity-60 bg-yellow-400 text-black hover:bg-yellow-500`}
            onClick={isInCart ? handleRemoveFromCart : handleAddToCart}
            disabled={isLoading || !selectedVariant || !isVariantAvailable(selectedVariant) || state.loading}
            aria-label={isInCart ? 'Remove from cart' : 'Add to cart'}
          >
            {isLoading || state.loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span aria-live="polite">{isInCart ? 'Removing...' : 'Adding...'}</span>
              </>
            ) : (
              <>
                <span className="mr-2">a</span>
                <span aria-live="polite">{selectedVariant ? formatPrice(selectedVariant.price) : '$0.00'}</span>
              </>
            )}
          </button>

          {alternatives && alternatives.length > 0 && (
            <button 
              type="button"
              className="flex-1 h-12 inline-flex items-center justify-center rounded-full bg-white hover:bg-gray-50 text-sm font-semibold px-4 transition-colors shadow-sm border border-gray-200"
              onClick={onToggleAlternatives}
              aria-controls={`alt-list-${product.id}`}
            >
              <span>{alternatives.length} alternatives</span>
            </button>
          )}
        </div>

          {/* Alternatives list when expanded */}
          {alternativesExpanded && alternatives && alternatives.length > 0 && (
            <div id={`alt-list-${product.id}`} className="mt-4 space-y-3">
              <div className="text-sm text-muted-foreground px-1">Other great AI-picked options</div>
              <div className="overflow-x-auto [-webkit-overflow-scrolling:touch]">
                <div className="flex gap-4 w-max pr-3 pb-1">
                  {alternatives.map((alt: any) => (
                    <div key={alt.id || alt.title} className="rounded-2xl bg-white shadow-sm border border-pink-100 p-3 min-w-[280px] sm:min-w-[300px]">
                      <div className="flex items-start gap-3">
                        <img src={alt.images?.[0]?.src || 'https://via.placeholder.com/96'} alt={alt.title} loading="lazy" className="w-24 h-24 sm:w-20 sm:h-20 rounded-xl object-cover bg-muted" />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate max-w-[180px]">{alt.title}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[180px]">{alt.vendor}</div>
                          {alt.variants?.[0]?.price && (
                            <div className="mt-2 inline-flex px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                              {new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(parseFloat(alt.variants[0].price))}
                            </div>
                          )}
                        </div>
                        {/* Add alt to cart */}
                        <div className="ml-auto pl-2">
                          {(() => {
                            const altVariantId = alt?.variants?.[0]?.id ? `gid://shopify/ProductVariant/${alt.variants[0].id}` : null;
                            const isAltInCart = altVariantId ? isProductInCart(altVariantId) : false;
                            const altCartLineId = altVariantId ? getCartItemLineId(altVariantId) : null;
                            
                            return (
                              <button
                                type="button"
                                className="h-9 w-9 inline-flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-pink-400"
                                onClick={async () => {
                                  try {
                                    if (!alt?.variants?.[0]?.id) return;
                                    
                                    if (isAltInCart && altCartLineId) {
                                      await removeFromCart(altCartLineId);
                                    } else {
                                      const altVariantId = `gid://shopify/ProductVariant/${alt.variants[0].id}`;
                                      const info = {
                                        name: alt.title,
                                        image: alt.images?.[0]?.src || 'https://via.placeholder.com/300x300?text=Product',
                                        price: alt.variants?.[0]?.price ? parseFloat(alt.variants[0].price) * 100 : 0
                                      };
                                      await addToCart(altVariantId, 1, [
                                        { key: 'source', value: 'dermaself_recommendation' },
                                        { key: 'recommendation_type', value: 'skin_analysis_alternative' },
                                        { key: 'product_step', value: stepTitle.toLowerCase().replace('step ', '').replace(':', '') },
                                        { key: 'added_at', value: new Date().toISOString() }
                                      ], info);
                                    }
                                  } catch (e) {
                                    console.error('Failed to toggle alternative cart:', e);
                                    setErrorMessage('Failed to update cart');
                                    setShowError(true);
                                    setTimeout(() => setShowError(false), 2000);
                                  }
                                }}
                                aria-label={isAltInCart ? `Remove ${alt.title} from cart` : `Add ${alt.title} to cart`}
                              >
                                {isAltInCart ? (
                                  <Trash2 className="w-4 h-4" />
                                ) : (
                                  <ShoppingCart className="w-4 h-4" />
                                )}
                              </button>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>


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

        {/* Step Separator */}
        {!isLastStep && <div className="mx-4 my-6 h-px bg-gray-200"></div>}

        {/* Add All to Bag Button for Last Step */}
        {isLastStep && showAddAllButton && onAddAllToCart && (
          <div className="mx-4 mt-6">
            <button 
              className="w-full bg-pink-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-pink-700 transition-colors"
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
          </div>
        )}

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
    </div>
  );
} 