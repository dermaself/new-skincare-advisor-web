'use client';

import React, { useState, useEffect } from 'react';
import { useCart } from '../../components/CartContext';

interface ShopifyProduct {
  id: string;
  title: string;
  vendor: string;
  description: string;
  images: Array<{
    src: string;
    altText: string;
  }>;
  variants: Array<{
    id: string;
    title: string;
    price: string;
    inventory_quantity: number;
  }>;
}

export default function CartTestPage() {
  const { state, addToCart, removeFromCart, isProductInCart, getCartItemLineId, refreshCart } = useCart();
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch products on component mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/shopify/storefront');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.products) {
            setProducts(data.products.slice(0, 5)); // Get first 5 products for testing
          }
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
      }
    };

    fetchProducts();
  }, []);

  const handleAddToCart = async (product: ShopifyProduct) => {
    if (!product.variants[0]) return;

    setLoading(true);
    try {
      const variantId = `gid://shopify/ProductVariant/${product.variants[0].id}`;
      const customAttributes = [
        { key: 'source', value: 'dermaself_test' },
        { key: 'test_product', value: 'true' },
        { key: 'added_at', value: new Date().toISOString() }
      ];

      await addToCart(variantId, 1, customAttributes);
    } catch (error) {
      console.error('Failed to add to cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromCart = async (product: ShopifyProduct) => {
    if (!product.variants[0]) return;

    setLoading(true);
    try {
      const variantId = `gid://shopify/ProductVariant/${product.variants[0].id}`;
      const lineId = getCartItemLineId(variantId);
      
      if (lineId) {
        await removeFromCart(lineId);
      }
    } catch (error) {
      console.error('Failed to remove from cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(price));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Cart Synchronization Test</h1>
        
        {/* Cart Status */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Cart Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-600 font-medium">Cart ID</p>
              <p className="text-lg font-semibold text-blue-900">
                {state.cart ? state.cart.id.slice(-8) : 'No cart'}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-600 font-medium">Items in Cart</p>
              <p className="text-lg font-semibold text-green-900">
                {state.cart ? state.cart.lines.length : 0}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-purple-600 font-medium">Total</p>
              <p className="text-lg font-semibold text-purple-900">
                {state.cart ? formatPrice(state.cart.cost.totalAmount.amount) : '$0.00'}
              </p>
            </div>
          </div>
          
          {state.error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-medium">Error: {state.error}</p>
            </div>
          )}
          
          <div className="mt-4 flex space-x-4">
            <button
              onClick={refreshCart}
              disabled={state.loading || !state.cart}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {state.loading ? 'Refreshing...' : 'Refresh Cart'}
            </button>
            
            {state.cart && (
              <a
                href={state.cart.checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Go to Checkout
              </a>
            )}
          </div>
        </div>

        {/* Products */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => {
            const variantId = product.variants[0] ? `gid://shopify/ProductVariant/${product.variants[0].id}` : null;
            const isInCart = variantId ? isProductInCart(variantId) : false;
            
            return (
              <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="aspect-w-1 aspect-h-1 w-full">
                  <img
                    src={product.images[0]?.src || '/placeholder-product.png'}
                    alt={product.title}
                    className="w-full h-48 object-cover"
                  />
                </div>
                
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {product.vendor} {product.title}
                  </h3>
                  
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {product.description}
                  </p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-bold text-gray-900">
                      {product.variants[0] ? formatPrice(product.variants[0].price) : '$0.00'}
                    </span>
                    <span className="text-sm text-gray-500">
                      Stock: {product.variants[0]?.inventory_quantity || 0}
                    </span>
                  </div>
                  
                  <button
                    onClick={isInCart ? () => handleRemoveFromCart(product) : () => handleAddToCart(product)}
                    disabled={loading || !product.variants[0]}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                      isInCart
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    } disabled:opacity-50`}
                  >
                    {loading ? (
                      <span>Loading...</span>
                    ) : isInCart ? (
                      <span>Remove from Cart</span>
                    ) : (
                      <span>Add to Cart</span>
                    )}
                  </button>
                  
                  {isInCart && (
                    <div className="mt-2 text-center">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✓ In Cart
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Cart Items */}
        {state.cart && state.cart.lines.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Cart Items</h2>
            <div className="space-y-4">
              {state.cart.lines.map((line) => (
                <div key={line.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <img
                      src={line.merchandise.product.images[0]?.url || '/placeholder-product.png'}
                      alt={line.merchandise.product.title}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {line.merchandise.product.title}
                      </h4>
                      <p className="text-sm text-gray-500">
                        Qty: {line.quantity} × {formatPrice(line.merchandise.price.amount)}
                      </p>
                      {line.attributes && line.attributes.length > 0 && (
                        <div className="mt-1">
                          {line.attributes.map((attr, index) => (
                            <span key={index} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1 mb-1">
                              {attr.key}: {attr.value}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatPrice((parseFloat(line.merchandise.price.amount) * line.quantity).toString())}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 