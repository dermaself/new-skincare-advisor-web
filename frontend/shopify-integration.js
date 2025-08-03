// Shopify Integration Script
// Add this to your Shopify theme's assets and include it in your theme.liquid

(function() {
  'use strict';

  // Listen for messages from the embedded app
  window.addEventListener('message', function(event) {
    // Verify the origin for security (replace with your app's domain)
    // if (event.origin !== 'https://your-app-domain.com') return;
    
    const { type, payload } = event.data;
    
    switch (type) {
      case 'SHOPIFY_ADD_TO_CART':
        handleAddToCart(payload);
        break;
        
      case 'SHOPIFY_ADD_ROUTINE_TO_CART':
        handleAddRoutineToCart(payload);
        break;
        
      case 'SHOPIFY_GET_CART':
        handleGetCart();
        break;
        
      case 'REQUEST_SHOPIFY_DATA':
        handleRequestShopifyData();
        break;
    }
  });

  // Handle adding single product to cart
  async function handleAddToCart(payload) {
    try {
      const { variantId, quantity = 1, customAttributes = [] } = payload;
      
      // Use Shopify's native cart API
      if (typeof window.Shopify !== 'undefined' && window.Shopify.cart) {
        // Add the item to cart
        await window.Shopify.cart.addItem(variantId, quantity);
        
        // Update cart count and display
        updateCartDisplay();
        
        // Send success response back to app
        event.source.postMessage({
          type: 'CART_UPDATE_SUCCESS',
          payload: { variantId, quantity }
        }, event.origin);
      } else {
        // Fallback to AJAX cart API
        const response = await fetch('/cart/add.js', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: variantId,
            quantity: quantity,
            properties: customAttributes.reduce((acc, attr) => {
              acc[attr.key] = attr.value;
              return acc;
            }, {})
          })
        });
        
        if (response.ok) {
          updateCartDisplay();
          event.source.postMessage({
            type: 'CART_UPDATE_SUCCESS',
            payload: { variantId, quantity }
          }, event.origin);
        } else {
          throw new Error('Failed to add to cart');
        }
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      event.source.postMessage({
        type: 'CART_UPDATE_ERROR',
        payload: { error: error.message }
      }, event.origin);
    }
  }

  // Handle adding multiple products (routine) to cart
  async function handleAddRoutineToCart(payload) {
    try {
      const { products } = payload;
      
      // Use Shopify's native cart API for multiple items
      if (typeof window.Shopify !== 'undefined' && window.Shopify.cart) {
        for (const product of products) {
          await window.Shopify.cart.addItem(product.variantId, product.quantity || 1);
        }
        
        updateCartDisplay();
        
        event.source.postMessage({
          type: 'ROUTINE_ADD_SUCCESS',
          payload: { products }
        }, event.origin);
      } else {
        // Fallback to AJAX cart API
        const items = products.map(product => ({
          id: product.variantId,
          quantity: product.quantity || 1
        }));
        
        const response = await fetch('/cart/add.js', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ items })
        });
        
        if (response.ok) {
          updateCartDisplay();
          event.source.postMessage({
            type: 'ROUTINE_ADD_SUCCESS',
            payload: { products }
          }, event.origin);
        } else {
          throw new Error('Failed to add routine to cart');
        }
      }
    } catch (error) {
      console.error('Error adding routine to cart:', error);
      event.source.postMessage({
        type: 'ROUTINE_ADD_ERROR',
        payload: { error: error.message }
      }, event.origin);
    }
  }

  // Handle getting current cart
  async function handleGetCart() {
    try {
      const response = await fetch('/cart.js');
      const cart = await response.json();
      
      event.source.postMessage({
        type: 'CART_DATA',
        payload: cart
      }, event.origin);
    } catch (error) {
      console.error('Error getting cart:', error);
      event.source.postMessage({
        type: 'CART_DATA_ERROR',
        payload: { error: error.message }
      }, event.origin);
    }
  }

  // Handle request for Shopify data
  function handleRequestShopifyData() {
    const shopifyData = {
      shop: {
        name: window.Shopify?.shop || 'Unknown Shop',
        domain: window.location.hostname,
        currency: window.Shopify?.currency?.active || 'USD'
      },
      cart: {
        itemCount: window.Shopify?.cart?.item_count || 0,
        totalPrice: window.Shopify?.cart?.total_price || 0
      },
      customer: window.Shopify?.customer || null
    };
    
    event.source.postMessage({
      type: 'SHOPIFY_DATA',
      payload: shopifyData
    }, event.origin);
  }

  // Update cart display (cart count, mini cart, etc.)
  async function updateCartDisplay() {
    try {
      // Fetch current cart data
      const response = await fetch('/cart.js');
      const cartData = await response.json();
      
      // Update cart count in header
      const cartCountElements = document.querySelectorAll('[data-cart-count]');
      cartCountElements.forEach(element => {
        element.textContent = cartData.item_count || 0;
      });

      // Update cart total
      const cartTotalElements = document.querySelectorAll('[data-cart-total]');
      cartTotalElements.forEach(element => {
        if (cartData.total_price !== undefined) {
          element.textContent = window.Shopify?.formatMoney ? 
            window.Shopify.formatMoney(cartData.total_price) : 
            `$${(cartData.total_price / 100).toFixed(2)}`;
        }
      });

      // Update cart count in any element with cart-count class
      const cartCountClassElements = document.querySelectorAll('.cart-count');
      cartCountClassElements.forEach(element => {
        element.textContent = cartData.item_count || 0;
      });

      // Update cart total in any element with cart-total class
      const cartTotalClassElements = document.querySelectorAll('.cart-total');
      cartTotalClassElements.forEach(element => {
        if (cartData.total_price !== undefined) {
          element.textContent = window.Shopify?.formatMoney ? 
            window.Shopify.formatMoney(cartData.total_price) : 
            `$${(cartData.total_price / 100).toFixed(2)}`;
        }
      });

      // Update mini cart if it exists
      updateMiniCart(cartData);

      // Trigger cart update events
      const cartUpdateEvent = new CustomEvent('cart:updated', {
        detail: { cart: cartData }
      });
      document.dispatchEvent(cartUpdateEvent);

      // Also trigger a custom event that themes might be listening for
      const customCartEvent = new CustomEvent('cart:refresh', {
        detail: { cart: cartData }
      });
      document.dispatchEvent(customCartEvent);

      console.log('Cart display updated:', cartData);
    } catch (error) {
      console.error('Error updating cart display:', error);
    }
  }

  // Update mini cart contents
  function updateMiniCart(cartData) {
    const miniCartContainer = document.querySelector('[data-cart-container], .mini-cart, .cart-drawer');
    if (!miniCartContainer) return;

    // If the theme has a cart refresh function, call it
    if (typeof window.refreshCart === 'function') {
      window.refreshCart();
      return;
    }

    // If the theme uses a cart API, try to refresh it
    if (typeof window.Shopify !== 'undefined' && window.Shopify.cart) {
      // Try to trigger a cart refresh
      if (window.Shopify.cart.refresh) {
        window.Shopify.cart.refresh();
      }
    }

    // Update cart items in mini cart
    const cartItemsContainer = miniCartContainer.querySelector('.cart-items, [data-cart-items]');
    if (cartItemsContainer && cartData.items) {
      // This is a simplified update - themes might need custom implementation
      cartItemsContainer.innerHTML = cartData.items.map(item => `
        <div class="cart-item" data-cart-item="${item.key}">
          <img src="${item.image}" alt="${item.title}" width="50" height="50">
          <div class="item-details">
            <h4>${item.title}</h4>
            <p>${window.Shopify?.formatMoney ? window.Shopify.formatMoney(item.price) : `$${(item.price / 100).toFixed(2)}`}</p>
            <span>Qty: ${item.quantity}</span>
          </div>
        </div>
      `).join('');
    }
  }

  // Initialize cart display on page load
  document.addEventListener('DOMContentLoaded', function() {
    updateCartDisplay();
  });

  // Listen for Shopify cart updates
  if (typeof window.Shopify !== 'undefined') {
    window.Shopify.onCartUpdate = function(cart) {
      updateCartDisplay();
    };
  }

})(); 