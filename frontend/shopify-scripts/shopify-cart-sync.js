// Simple Bridge for Shopify Cart API
// This script just bridges messages from embedded apps to Shopify's original cart APIs

(function() {
  'use strict';

  console.log('Shopify Cart Bridge initialized');

  // Listen for messages from embedded apps
  window.addEventListener('message', function(event) {
    const { type, payload } = event.data;
    console.log('Cart bridge received message:', type, payload);

    switch (type) {
      case 'SHOPIFY_ADD_TO_CART':
        callShopifyAddToCart(payload);
        break;
      
      case 'SHOPIFY_REMOVE_FROM_CART':
        callShopifyRemoveFromCart(payload);
        break;
      
      case 'SHOPIFY_GET_CART':
        callShopifyGetCart();
        break;
        
      default:
        // Ignore unknown message types
        break;
    }
  });

  // Call Shopify's original /cart/add.js API
  async function callShopifyAddToCart(payload) {
    try {
      const { variantId, quantity = 1, customAttributes = [] } = payload;
      
      // Convert GraphQL ID to numeric ID if needed
      let numericId = variantId;
      if (typeof variantId === 'string' && variantId.includes('gid://shopify/ProductVariant/')) {
        numericId = variantId.split('/').pop();
      }
      
      // Prepare cart item exactly as Shopify expects
      const cartItem = {
        id: parseInt(numericId),
        quantity: quantity,
        properties: {}
      };

      // Add custom attributes
      customAttributes.forEach(attr => {
        cartItem.properties[attr.key] = attr.value;
      });

      console.log('Calling Shopify /cart/add.js with:', cartItem);

      // Call Shopify's original cart API
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cartItem)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Shopify cart add success:', result);
        
        // Get updated cart data
        const cartResponse = await fetch('/cart.js');
        const cart = await cartResponse.json();
        
        // Notify embedded app of success
        notifyApp('CART_UPDATE_SUCCESS', { cart });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.description || 'Failed to add to cart');
      }
    } catch (error) {
      console.error('Shopify cart add error:', error);
      notifyApp('CART_UPDATE_ERROR', { error: error.message });
    }
  }

  // Call Shopify's original /cart/change.js API
  async function callShopifyRemoveFromCart(payload) {
    try {
      const { variantId } = payload;
      
      // Convert GraphQL ID to numeric ID if needed
      let numericId = variantId;
      if (typeof variantId === 'string' && variantId.includes('gid://shopify/ProductVariant/')) {
        numericId = variantId.split('/').pop();
      }
      
      // Get current cart to find item key
      const cartResponse = await fetch('/cart.js');
      const cart = await cartResponse.json();
      
      const itemToRemove = cart.items.find(item => 
        item.variant_id.toString() === numericId.toString()
      );
      
      if (!itemToRemove) {
        throw new Error('Item not found in cart');
      }
      
      console.log('Calling Shopify /cart/change.js to remove item:', itemToRemove.key);

      // Call Shopify's original cart API
      const response = await fetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: itemToRemove.key,
          quantity: 0
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Shopify cart remove success:', result);
        
        // Get updated cart data
        const updatedCartResponse = await fetch('/cart.js');
        const updatedCart = await updatedCartResponse.json();
        
        // Notify embedded app of success
        notifyApp('CART_UPDATE_SUCCESS', { cart: updatedCart });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.description || 'Failed to remove from cart');
      }
    } catch (error) {
      console.error('Shopify cart remove error:', error);
      notifyApp('CART_UPDATE_ERROR', { error: error.message });
    }
  }

  // Call Shopify's original /cart.js API
  async function callShopifyGetCart() {
    try {
      console.log('Calling Shopify /cart.js');
      
      const response = await fetch('/cart.js');
      const cart = await response.json();
      
      console.log('Shopify cart data:', cart);
      notifyApp('CART_DATA', { cart });
    } catch (error) {
      console.error('Shopify get cart error:', error);
      notifyApp('CART_ERROR', { error: error.message });
    }
  }

  // Notify embedded app
  function notifyApp(type, data) {
    console.log('Notifying embedded app:', type, data);
    
    // Send to all iframes
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      try {
        iframe.contentWindow.postMessage({ type, payload: data }, '*');
      } catch (error) {
        console.log('Error sending message to iframe:', error);
      }
    });
    
    // Also send to parent if this is in an iframe
    if (window.parent !== window) {
      try {
        window.parent.postMessage({ type, payload: data }, '*');
      } catch (error) {
        console.log('Error sending message to parent:', error);
      }
    }
  }

  // Send initial cart state
  setTimeout(async () => {
    try {
      const response = await fetch('/cart.js');
      const cart = await response.json();
      notifyApp('CART_INITIAL_STATE', { cart });
    } catch (error) {
      console.error('Error getting initial cart:', error);
    }
  }, 1000);

  // Expose functions for manual use
  window.shopifyCartBridge = {
    addToCart: callShopifyAddToCart,
    removeFromCart: callShopifyRemoveFromCart,
    getCart: callShopifyGetCart
  };

})(); 