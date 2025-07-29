'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Plus, Minus, Loader2, CheckCircle, Sun, Moon } from 'lucide-react';
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
  isLastStep?: boolean;
  showAddAllButton?: boolean;
  onAddAllToCart?: () => void;
}

export default function RoutineProductCard({ 
  product, 
  stepNumber, 
  stepTitle, 
  isLastStep = false,
  showAddAllButton = false,
  onAddAllToCart 
}: RoutineProductCardProps) {
  const { addToCart, state } = useCart();
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    product.variants[0] || null
  );
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleAddToCart = async () => {
    if (!selectedVariant) return;

    setIsAddingToCart(true);
    setShowSuccess(false);

    try {
      // Convert the variant ID to the format expected by Shopify Storefront API
      const variantId = `gid://shopify/ProductVariant/${selectedVariant.id}`;
      
      await addToCart(variantId, quantity);
      setShowSuccess(true);
      
      // Hide success message after 2 seconds
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Failed to add to cart:', error);
    } finally {
      setIsAddingToCart(false);
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
  const productTags = product.tags ? product.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
  
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
        <span>STEP {stepNumber}:</span> {stepTitle}
      </h1>
      
      <div className="step-content">
        {/* Product Image Slider */}
        <div className="swiper-container">
          <div className="swiper-slide">
            <img 
              width="500px" 
              src={product.images[0]?.src || '/placeholder-product.png'} 
              alt={product.title}
              className="w-full h-auto"
            />
          </div>
        </div>

        {/* Product Info */}
        <div className="product-info__tablet">
          <h2 className="heading-3 product-name">
            {product.vendor} {product.title}
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
            
            {/* Add to Cart Button */}
            <button 
              className="add-to-bag-btn"
              onClick={handleAddToCart}
              disabled={isAddingToCart || !selectedVariant || !isVariantAvailable(selectedVariant) || state.loading}
            >
              {isAddingToCart || state.loading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Adding...
                </div>
              ) : (
                'ADD TO BAG'
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
              <p className="font-semibold">Added to Cart!</p>
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
    </section>
  );
} 