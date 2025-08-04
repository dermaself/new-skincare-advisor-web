// Shopify Cart Integration Script
// This script handles communication between the embedded DermaSelf app and Shopify storefront

(function() {
  'use strict';

  // Check if we're in a Shopify environment
  const isShopifyEnvironment = () => {
    return typeof window !== 'undefined' && 
           (window.Shopify || 
            window.location.hostname.includes('myshopify.com') ||
            window.location.hostname.includes('shopify.com') ||
            document.querySelector('[data-shopify]') !== null);
  };

  // Initialize cart integration
  const initCartIntegration = () => {
    if (!isShopifyEnvironment()) {
      console.log('Not in Shopify environment, skipping cart integration');
      return;
    }

    console.log('Initializing Shopify cart integration...');

    // Listen for messages from the embedded app
    window.addEventListener('message', handleAppMessage);

    // Set up cart update listeners
    setupCartUpdateListeners();

    // Send initial cart state to embedded app
    sendInitialCartState();
  };

  // Handle messages from the embedded app
  const handleAppMessage = async (event) => {
    const { type, payload } = event.data;

    switch (type) {
      case 'SHOPIFY_GET_CART':
        await sendCartState();
        break;

      case 'SHOPIFY_ADD_TO_CART':
        await addToCart(payload);
        break;

      case 'SHOPIFY_REMOVE_FROM_CART':
        await removeFromCart(payload);
        break;

      case 'SHOPIFY_ADD_ROUTINE_TO_CART':
        await addRoutineToCart(payload);
        break;

      default:
        // Ignore unknown message types
        break;
    }
  };

  // Send current cart state to embedded app
  const sendCartState = async () => {
    try {
      // Get cart data from Shopify
      const cartData = await getShopifyCart();
      
      // Send to embedded app
      sendMessageToApp({
        type: 'CART_INITIAL_STATE',
        payload: { cart: cartData }
      });
    } catch (error) {
      console.error('Failed to send cart state:', error);
    }
  };

  // Send initial cart state
  const sendInitialCartState = () => {
    // Delay to ensure embedded app is ready
    setTimeout(sendCartState, 1000);
  };

  // Get cart data from Shopify
  const getShopifyCart = async () => {
    try {
      // Try to get cart from Shopify's cart API
      if (window.Shopify && window.Shopify.theme && window.Shopify.theme.cart) {
        return await window.Shopify.theme.cart.get();
      }

      // Fallback: try to get cart from cart page
      const response = await fetch('/cart.js');
      if (response.ok) {
        return await response.json();
      }

      // Return empty cart if no data available
      return {
        id: 'cart',
        items: [],
        item_count: 0,
        total_price: 0,
        currency: 'EUR'
      };
    } catch (error) {
      console.error('Failed to get Shopify cart:', error);
      return {
        id: 'cart',
        items: [],
        item_count: 0,
        total_price: 0,
        currency: 'EUR'
      };
    }
  };

  // Add item to cart
  const addToCart = async (payload) => {
    try {
      const { variantId, quantity = 1, customAttributes = [] } = payload;

      // Convert GraphQL ID to numeric ID if needed
      let numericVariantId = variantId;
      if (typeof variantId === 'string' && variantId.includes('gid://shopify/ProductVariant/')) {
        numericVariantId = variantId.split('/').pop();
      }

      // Prepare cart item data
      const cartItem = {
        id: numericVariantId,
        quantity: quantity,
        properties: {}
      };

      // Add custom attributes as properties
      customAttributes.forEach(attr => {
        cartItem.properties[attr.key] = attr.value;
      });

      // Add to cart using Shopify's cart API
      if (window.Shopify && window.Shopify.theme && window.Shopify.theme.cart) {
        const result = await window.Shopify.theme.cart.addItem(cartItem);
        
        if (result.status === 200) {
          // Send success message
          sendMessageToApp({
            type: 'CART_UPDATE_SUCCESS',
            payload: { cart: result.body }
          });

          // Send individual item added message
          const addedItem = result.body.items.find(item => 
            item.variant_id.toString() === numericVariantId.toString()
          );
          
          if (addedItem) {
            sendMessageToApp({
              type: 'CART_ITEM_ADDED',
              payload: addedItem
            });
          }
        } else {
          throw new Error('Failed to add item to cart');
        }
      } else {
        // Fallback: use fetch to add to cart
        const response = await fetch('/cart/add.js', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(cartItem)
        });

        if (response.ok) {
          const result = await response.json();
          
          // Get updated cart
          const cartData = await getShopifyCart();
          
          sendMessageToApp({
            type: 'CART_UPDATE_SUCCESS',
            payload: { cart: cartData }
          });

          sendMessageToApp({
            type: 'CART_ITEM_ADDED',
            payload: result
          });
        } else {
          throw new Error('Failed to add item to cart');
        }
      }
    } catch (error) {
      console.error('Failed to add to cart:', error);
      sendMessageToApp({
        type: 'CART_UPDATE_ERROR',
        payload: { error: error.message }
      });
    }
  };

  // Remove item from cart
  const removeFromCart = async (payload) => {
    try {
      const { variantId } = payload;

      // Convert GraphQL ID to numeric ID if needed
      let numericVariantId = variantId;
      if (typeof variantId === 'string' && variantId.includes('gid://shopify/ProductVariant/')) {
        numericVariantId = variantId.split('/').pop();
      }

      // Get current cart to find the key
      const cartData = await getShopifyCart();
      const itemToRemove = cartData.items.find(item => 
        item.variant_id.toString() === numericVariantId.toString()
      );

      if (!itemToRemove) {
        throw new Error('Item not found in cart');
      }

      // Remove from cart
      const response = await fetch('/cart/change.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: itemToRemove.key,
          quantity: 0
        })
      });

      if (response.ok) {
        const updatedCart = await getShopifyCart();
        sendMessageToApp({
          type: 'CART_UPDATE_SUCCESS',
          payload: { cart: updatedCart }
        });
      } else {
        throw new Error('Failed to remove item from cart');
      }
    } catch (error) {
      console.error('Failed to remove from cart:', error);
      sendMessageToApp({
        type: 'CART_UPDATE_ERROR',
        payload: { error: error.message }
      });
    }
  };

  // Add multiple products to cart (routine)
  const addRoutineToCart = async (payload) => {
    try {
      const { products } = payload;

      // Add each product to cart
      for (const product of products) {
        await addToCart({
          variantId: product.variantId,
          quantity: product.quantity || 1,
          customAttributes: product.customAttributes || []
        });
      }

      // Send final cart state
      const finalCart = await getShopifyCart();
      sendMessageToApp({
        type: 'CART_UPDATE_SUCCESS',
        payload: { cart: finalCart }
      });
    } catch (error) {
      console.error('Failed to add routine to cart:', error);
      sendMessageToApp({
        type: 'CART_UPDATE_ERROR',
        payload: { error: error.message }
      });
    }
  };

  // Send message to embedded app
  const sendMessageToApp = (message) => {
    // Find the embedded iframe
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      try {
        iframe.contentWindow.postMessage(message, '*');
      } catch (error) {
        console.error('Failed to send message to iframe:', error);
      }
    });
  };

  // Set up cart update listeners
  const setupCartUpdateListeners = () => {
    // Listen for cart changes (if Shopify provides events)
    if (window.Shopify && window.Shopify.theme && window.Shopify.theme.cart) {
      window.Shopify.theme.cart.on('change', async () => {
        const cartData = await getShopifyCart();
        sendMessageToApp({
          type: 'CART_UPDATE_SUCCESS',
          payload: { cart: cartData }
        });
      });
    }

    // Listen for cart page changes
    if (typeof window !== 'undefined' && window.history && window.history.pushState) {
      const originalPushState = window.history.pushState;
      window.history.pushState = function(...args) {
        originalPushState.apply(this, args);
        
        // Check if we're on a cart-related page
        if (window.location.pathname.includes('/cart')) {
          setTimeout(sendCartState, 500);
        }
      };
    }
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCartIntegration);
  } else {
    initCartIntegration();
  }

  // Also initialize when window loads (for late-loading scripts)
  window.addEventListener('load', initCartIntegration);

})(); 