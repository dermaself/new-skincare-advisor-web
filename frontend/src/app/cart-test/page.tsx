'use client';

import { useState, useEffect } from 'react';
import { useCart } from '../../components/CartContext';

export default function CartTestPage() {
  const { state, addToCart, removeFromCart, updateCartItem, getCart } = useCart();
  const [testVariantId, setTestVariantId] = useState('gid://shopify/ProductVariant/123456789');
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');

  const handleAddToCart = async () => {
    try {
      setMessage('Adding to cart...');
      await addToCart(testVariantId, quantity);
      setMessage('Product added to cart successfully!');
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleRemoveFromCart = async (lineId: string) => {
    try {
      setMessage('Removing from cart...');
      await removeFromCart(lineId);
      setMessage('Product removed from cart successfully!');
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleUpdateQuantity = async (lineId: string, newQuantity: number) => {
    try {
      setMessage('Updating quantity...');
      await updateCartItem(lineId, newQuantity);
      setMessage('Quantity updated successfully!');
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Cart Integration Test</h1>
      
      {/* Environment Check */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">Environment Check</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <strong>Shopify Domain:</strong> {process.env.NEXT_PUBLIC_SHOPIFY_DOMAIN || 'Not set'}
          </div>
          <div>
            <strong>Storefront Token:</strong> {process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN ? 'Set' : 'Not set'}
          </div>
          <div>
            <strong>Is Shopify Environment:</strong> {typeof window !== 'undefined' && (window.parent !== window || window.location.hostname.includes('myshopify.com')) ? 'Yes' : 'No'}
          </div>
          <div>
            <strong>Cart State:</strong> {state.cart ? 'Loaded' : 'Not loaded'}
          </div>
        </div>
      </div>

      {/* Test Controls */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Variant ID:</label>
            <input
              type="text"
              value={testVariantId}
              onChange={(e) => setTestVariantId(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="gid://shopify/ProductVariant/123456789"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Quantity:</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              min="1"
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAddToCart}
              disabled={state.loading}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {state.loading ? 'Adding...' : 'Add to Cart'}
            </button>
          </div>
        </div>

        {message && (
          <div className={`p-3 rounded ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message}
          </div>
        )}
      </div>

      {/* Cart Display */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Current Cart</h2>
        
        {state.error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
            Error: {state.error}
          </div>
        )}

        {state.loading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2">Loading cart...</p>
          </div>
        )}

        {state.cart ? (
          <div>
            <div className="mb-4">
              <strong>Cart ID:</strong> {state.cart.id}
            </div>
            <div className="mb-4">
              <strong>Items:</strong> {state.cart.lines.length}
            </div>
            <div className="mb-4">
              <strong>Subtotal:</strong> {state.cart.cost.subtotalAmount.amount} {state.cart.cost.subtotalAmount.currencyCode}
            </div>
            <div className="mb-4">
              <strong>Total:</strong> {state.cart.cost.totalAmount.amount} {state.cart.cost.totalAmount.currencyCode}
            </div>

            {state.cart.lines.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Cart Items:</h3>
                {state.cart.lines.map((item) => (
                  <div key={item.id} className="border rounded p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold">{item.merchandise.product.title}</h4>
                        <p className="text-gray-600">{item.merchandise.title}</p>
                        <p className="text-sm text-gray-500">Variant ID: {item.merchandise.id}</p>
                        <p className="font-medium">
                          {item.merchandise.price.amount} {item.merchandise.price.currencyCode}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleUpdateQuantity(item.id, parseInt(e.target.value) || 1)}
                          min="1"
                          className="w-16 p-1 border rounded text-center"
                        />
                        <button
                          onClick={() => handleRemoveFromCart(item.id)}
                          className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Cart is empty</p>
            )}

            {state.cart.lines.length > 0 && (
              <div className="mt-6">
                <a
                  href={state.cart.checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 inline-block"
                >
                  Proceed to Checkout
                </a>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500">No cart loaded</p>
        )}
      </div>

      {/* Debug Info */}
      <div className="mt-8 bg-gray-100 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
        <pre className="text-sm overflow-auto">
          {JSON.stringify(state, null, 2)}
        </pre>
      </div>
    </div>
  );
} 