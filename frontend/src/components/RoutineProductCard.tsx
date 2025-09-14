'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Plus, Minus, Loader2, CheckCircle, Sun, Moon, Trash2 } from 'lucide-react';
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
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState<'added' | 'removed' | false>(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Cache for product images to avoid repeated API calls
  const [imageCache, setImageCache] = useState<Record<string, string>>({});

  // Function to fetch product image from Shopify API
  const fetchProductImageFromShopify = async (shopifyProductId: string | number): Promise<string | null> => {
    try {
      // Check cache first
      const cacheKey = shopifyProductId.toString();
      if (imageCache[cacheKey]) {
        return imageCache[cacheKey];
      }

      console.log('🔄 Fetching product image from Shopify API for:', shopifyProductId);
      
      // Convert to string and handle both numeric and GraphQL ID formats
      let productIdForApi: string;
      
      if (typeof shopifyProductId === 'number') {
        productIdForApi = shopifyProductId.toString();
      } else if (typeof shopifyProductId === 'string') {
        if (shopifyProductId.startsWith('gid://')) {
          // Extract numeric ID from GraphQL ID
          productIdForApi = shopifyProductId.split('/').pop() || shopifyProductId;
        } else {
          productIdForApi = shopifyProductId;
        }
      } else {
        throw new Error('Invalid shopify product ID type');
      }

      console.log('🔄 Using product ID for API call:', productIdForApi);

      const response = await fetch(`/api/shopify/products/${productIdForApi}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API response error:', response.status, errorText);
        throw new Error(`Failed to fetch product: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (data.success && data.product && data.product.images && data.product.images.length > 0) {
        const imageUrl = data.product.images[0].src;
        
        // Cache the result using string key
        setImageCache(prev => ({
          ...prev,
          [cacheKey]: imageUrl
        }));
        
        console.log('✅ Fetched product image from Shopify:', imageUrl);
        return imageUrl;
      }
      
      console.warn('No image found in product data:', data);
      throw new Error('No image found in product data');
    } catch (error) {
      console.error('❌ Failed to fetch product image from Shopify:', error);
      return null;
    }
  };

  // Helper function to get product image from different data formats
  const getProductImage = (product: any): string => {
    try {
      console.log('🔍 Product data structure:', product)
      
      // Safety check
      if (!product) {
        console.error('getProductImage: Product is null or undefined');
        return 'https://via.placeholder.com/300x300/f0f0f0/999999?text=No+Product';
      }
      
      // For routine products with Shopify ID but no image data, fetch from API
      if (product.shopifyProductId) {
        // Check cache first using string key
        const cacheKey = product.shopifyProductId.toString();
        if (imageCache[cacheKey]) {
          console.log('✅ Using cached Shopify image:', imageCache[cacheKey]);
          return imageCache[cacheKey];
        }
        
        // Trigger async fetch (this will update the component when done)
        fetchProductImageFromShopify(product.shopifyProductId).then(imageUrl => {
          if (imageUrl) {
            // Force re-render by updating a state that will trigger image refresh
            setImageCache(prev => ({
              ...prev,
              [cacheKey]: imageUrl
            }));
          }
        }).catch(error => {
          console.error('Error fetching product image:', error);
        });
        
        console.log('🔄 Fetching image for product with Shopify ID:', product.shopifyProductId);
        // Return placeholder while fetching
        return 'https://via.placeholder.com/300x300/f0f0f0/999999?text=Loading...';
      }
      
      // Fallback to placeholder
      console.log('⚠️ Using placeholder image for product:', product.title || (product as any).name || 'Unknown');
      return 'https://via.placeholder.com/300x300/f0f0f0/999999?text=Product+Image';
    } catch (error) {
      console.error('Error in getProductImage:', error);
      return 'https://via.placeholder.com/300x300/f0f0f0/999999?text=Error';
    }
  };

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
        image: getProductImage(product),
        price: parseFloat(selectedVariant.price || '0') * 100 // Convert to cents
      };
      
      await addToCart(variantId, quantity, customAttributes, productInfo);
      
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

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= 99) {
      setQuantity(newQuantity);
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
      <h1 className="heading-1 step-name">
        <span>STEP {stepNumber}:</span> {categoryTitle || stepTitle}
      </h1>
      
      <div className="step-content">
        {/* Product Image Slider */}
        <div className="swiper-container">
          <div className="swiper-slide">
            <img 
              key={`product-${product.id}-${Object.keys(imageCache).length}`}
              width="500px" 
              src={getProductImage(product)} 
              alt={product.title}
              className="w-full h-auto"
              onLoad={() => {
                console.log('✅ Routine image loaded successfully:', getProductImage(product));
              }}
              onError={(e) => {
                console.error('❌ Routine image failed to load:', getProductImage(product));
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
                  className="body-mobile-small tag-colour"
                  style={{ borderColor: getTagColor(tag) }}
                >
                  {tag}
                </p>
              </div>
            ))}
          </div>
          
          <p className="body-mobile product-blurb">
            {product.body_html ? 
              product.body_html.replace(/<[^>]*>/g, '').substring(0, 150) + '...' : 
              'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin convallis volutpat elit, in tincidunt enim volutpat a.'
            }
          </p>
          
          <div className="product-info-container">
            <div className="product-price-info">
              {/* Usage Icons */}
              <div className="regime-images">
                <Sun className="w-6 h-6 text-yellow-500" />
                <Moon className="w-6 h-6 text-blue-500" />
              </div>
              
              <div className="product-info">
                <p className="body-mobile">20 ml</p>
                <div className="separator"></div>
                <p className="body-mobile price-container">
                  <span className="current-price">
                    {selectedVariant ? formatPrice(selectedVariant.price) : '$0.00'}
                  </span>
                </p>
              </div>
            </div>
            
            {/* Cart Button */}
            <button 
              className={`cart-btn ${isInCart ? 'remove-btn' : 'add-btn'}`}
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
          className="add-all-to-bag"
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
          padding: 12px 24px;
          border-radius: 8px;
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
          background-color: #3b82f6;
          color: white;
        }

        .add-btn:hover:not(:disabled) {
          background-color: #2563eb;
          transform: translateY(-1px);
        }

        .remove-btn {
          background-color: #ef4444;
          color: white;
        }

        .remove-btn:hover:not(:disabled) {
          background-color: #dc2626;
          transform: translateY(-1px);
        }

        .cart-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
      `}</style>
    </section>
  );
} 