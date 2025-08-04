// Shopify Cart Sync Script for Embedded Apps
// Add this script to your Shopify theme to sync cart updates from embedded apps

(function() {
    'use strict';
  
    // Listen for messages from embedded apps
    window.addEventListener('message', function(event) {
      console.log('Cart sync received message:', event.data);
  
      const { type, payload } = event.data;
  
      switch (type) {
        case 'SHOPIFY_ADD_TO_CART':
          console.log('Handling add to cart:', payload);
          handleAddToCart(payload);
          break;
        
        case 'SHOPIFY_ADD_ROUTINE_TO_CART':
          console.log('Handling add routine to cart:', payload);
          handleAddRoutineToCart(payload);
          break;
        
        case 'SHOPIFY_GET_CART':
          console.log('Handling get cart request');
          handleGetCart();
          break;
        
        case 'SHOPIFY_NAVIGATE':
          console.log('Handling navigation:', payload);
          handleNavigate(payload);
          break;
        
        case 'SHOPIFY_REMOVE_FROM_CART':
          console.log('Handling remove from cart:', payload);
          handleRemoveFromCart(payload);
          break;
          
        default:
          console.log('Unknown message type:', type);
      }
    });
  
    // Handle single product add to cart
    async function handleAddToCart(payload) {
      try {
        const { productId, variantId, quantity = 1, customAttributes = [] } = payload;
        
        console.log('Received payload:', payload);
        
        const idToUse = productId || variantId;
        console.log('ProductId:', productId, 'VariantId:', variantId, 'Using:', idToUse);
        
        if (!idToUse) {
          throw new Error('Product/Variant ID is required');
        }
        
        let numericId = idToUse;
        if (typeof idToUse === 'string' && idToUse.includes('gid://shopify/ProductVariant/')) {
          numericId = idToUse.split('/').pop();
          console.log('Converted GraphQL ID to numeric ID:', numericId);
        }
        
        if (!numericId || isNaN(parseInt(numericId))) {
          throw new Error(`Invalid variant ID: ${numericId}`);
        }
        
        const requestBody = {
          items: [{
            id: parseInt(numericId),
            quantity: quantity,
            properties: customAttributes.reduce((acc, attr) => {
              acc[attr.key] = attr.value;
              return acc;
            }, {})
          }]
        };
        
        console.log('Adding to cart with payload:', requestBody);
        
        const response = await fetch('/cart/add.js', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });
  
        console.log('Cart add response status:', response.status);
  
        if (response.ok) {
          const result = await response.json();
          console.log('Cart add success:', result);
          
          const cartData = await refreshCart();
          notifyEmbeddedApp('CART_UPDATE_SUCCESS', { productId: idToUse, quantity, cart: cartData });
          
          await triggerGentleCartUpdate(cartData);
        } else {
          const errorData = await response.json();
          console.error('Cart add error response:', errorData);
          throw new Error(errorData.description || 'Failed to add to cart');
        }
      } catch (error) {
        console.error('Error adding to cart:', error);
        notifyEmbeddedApp('CART_UPDATE_ERROR', { error: error.message });
      }
    }
  
    // Handle routine add to cart
    async function handleAddRoutineToCart(payload) {
      try {
        const { products } = payload;
        
        const items = products.map(product => {
          console.log('Processing product:', product);
          
          let variantId = product.variantId;
          if (typeof product.variantId === 'string' && product.variantId.includes('gid://shopify/ProductVariant/')) {
            variantId = product.variantId.split('/').pop();
            console.log('Converted GraphQL ID to numeric ID:', variantId);
          }
          
          if (!variantId || isNaN(parseInt(variantId))) {
            throw new Error(`Invalid variant ID for product: ${product.name || 'Unknown'}`);
          }
          
          return {
            id: parseInt(variantId),
            quantity: product.quantity || 1,
            properties: product.properties || {}
          };
        });
        
        console.log('Adding routine to cart with items:', items);
        
        const response = await fetch('/cart/add.js', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ items })
        });
  
        console.log('Routine cart add response status:', response.status);
  
        if (response.ok) {
          const result = await response.json();
          console.log('Routine cart add success:', result);
          
          const cartData = await refreshCart();
          notifyEmbeddedApp('ROUTINE_ADD_SUCCESS', { products, cart: cartData });
          
          await triggerGentleCartUpdate(cartData);
        } else {
          const errorData = await response.json();
          console.error('Routine cart add error response:', errorData);
          throw new Error(errorData.description || 'Failed to add routine to cart');
        }
      } catch (error) {
        console.error('Error adding routine to cart:', error);
        notifyEmbeddedApp('ROUTINE_ADD_ERROR', { error: error.message });
      }
    }
  
    // Handle get cart request
    async function handleGetCart() {
      try {
        const response = await fetch('/cart.js');
        const cart = await response.json();
        notifyEmbeddedApp('CART_DATA', { cart });
      } catch (error) {
        console.error('Error getting cart:', error);
        notifyEmbeddedApp('CART_ERROR', { error: error.message });
      }
    }
  
    // Handle navigation request
    function handleNavigate(payload) {
      const { productId } = payload;
      if (productId) {
        window.location.href = `/products/${productId}`;
      }
    }
  
    // Handle remove from cart request
    async function handleRemoveFromCart(payload) {
      try {
        const { variantId } = payload;
        
        console.log('Removing from cart:', payload);
        
        if (!variantId) {
          throw new Error('Variant ID is required');
        }
        
        let numericId = variantId;
        if (typeof variantId === 'string' && variantId.includes('gid://shopify/ProductVariant/')) {
          numericId = variantId.split('/').pop();
          console.log('Converted GraphQL ID to numeric ID:', numericId);
        }
        
        if (!numericId || isNaN(parseInt(numericId))) {
          throw new Error(`Invalid variant ID: ${numericId}`);
        }
        
        // First get current cart to find the item key
        const cartResponse = await fetch('/cart.js');
        const cart = await cartResponse.json();
        
        const itemToRemove = cart.items.find(item => item.variant_id.toString() === numericId.toString());
        
        if (!itemToRemove) {
          throw new Error('Item not found in cart');
        }
        
        // Remove the item using the item key
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
  
        console.log('Cart remove response status:', response.status);
  
        if (response.ok) {
          const result = await response.json();
          console.log('Cart remove success:', result);
          
          const cartData = await refreshCart();
          notifyEmbeddedApp('CART_UPDATE_SUCCESS', { variantId: numericId, cart: cartData });
          
          await triggerGentleCartUpdate(cartData);
        } else {
          const errorData = await response.json();
          console.error('Cart remove error response:', errorData);
          throw new Error(errorData.description || 'Failed to remove from cart');
        }
      } catch (error) {
        console.error('Error removing from cart:', error);
        notifyEmbeddedApp('CART_UPDATE_ERROR', { error: error.message });
      }
    }
  
    // Refresh cart data
    async function refreshCart() {
      try {
        const response = await fetch('/cart.js');
        return await response.json();
      } catch (error) {
        console.error('Error refreshing cart:', error);
        throw error;
      }
    }
  
    // Simple cart update that triggers theme's native functionality
    async function triggerGentleCartUpdate(cartData) {
      console.log('Triggering simple cart update with', cartData.item_count, 'items');
      
      // Method 1: Trigger theme's native cart update
      triggerCartEvents(cartData);
      
      // Method 2: Call theme functions if they exist
      callThemeFunctions();
      
      // Method 3: Force a page refresh of cart sections if needed
      await refreshCartSections();
      
      // Method 4: Direct cart display sync
      syncCartDisplay(cartData);
    }
  
    // Refresh cart sections using Shopify's sections API
    async function refreshCartSections() {
      try {
        console.log('Refreshing cart sections');
        
        // Get updated cart sections
        const sectionsResponse = await fetch('/?sections=cart-icon-bubble,cart-drawer');
        const sectionsData = await sectionsResponse.json();
        
        // Update cart icon bubble section
        if (sectionsData['cart-icon-bubble']) {
          const cartIconSection = document.getElementById('shopify-section-cart-icon-bubble');
          if (cartIconSection) {
            cartIconSection.innerHTML = sectionsData['cart-icon-bubble'];
            console.log('Updated cart icon bubble section');
          }
        }
        
        // Update cart drawer section
        if (sectionsData['cart-drawer']) {
          const cartDrawerSection = document.getElementById('shopify-section-cart-drawer');
          if (cartDrawerSection) {
            cartDrawerSection.innerHTML = sectionsData['cart-drawer'];
            console.log('Updated cart drawer section');
          }
        }
        
      } catch (error) {
        console.log('Error refreshing cart sections:', error);
      }
    }
  
    // Trigger cart events
    function triggerCartEvents(cartData) {
      const events = [
        'cart:updated',
        'cart:refresh',
        'cart:reload',
        'cart:open',
        'cart:close',
        'cart:drawer:refresh',
        'cart:drawer:updated'
      ];
      
      events.forEach(eventName => {
        const event = new CustomEvent(eventName, {
          detail: { cart: cartData }
        });
        document.dispatchEvent(event);
        console.log('Dispatched event:', eventName);
      });
    }
  
    // Call theme-specific functions
    function callThemeFunctions() {
      const cartFunctions = [
        'refreshCartDrawer',
        'openCartDrawer',
        'updateCart',
        'refreshCart',
        'updateCartDisplay',
        'updateMiniCart'
      ];
      
      cartFunctions.forEach(funcName => {
        if (typeof window[funcName] === 'function') {
          try {
            window[funcName]();
            console.log('Called cart function:', funcName);
          } catch (error) {
            console.log('Error calling', funcName, ':', error);
          }
        }
      });
    }
    
    // Direct cart display sync function
    function syncCartDisplay(cartData) {
      console.log('Syncing cart display with data:', cartData);
      
      // Update cart count elements
      const cartCountSelectors = [
        '[data-cart-count]',
        '.cart-count',
        '.cart-item-count',
        '.header__cart-count',
        '.cart-badge',
        '.cart-icon .count',
        '.cart-icon span',
        '.cart-link .count',
        '.cart-count-bubble span',
        '.cart-count-bubble span[aria-hidden="true"]',
        '.cart-count-bubble .visually-hidden',
        '.cart-count-bubble',
        '.cart-count-bubble .count',
        '.cart-count-bubble .cart-count',
        '.cart-count-bubble .cart-item-count'
      ];
      
      cartCountSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          element.textContent = cartData.item_count || 0;
          console.log('Updated cart count element:', selector, 'with value:', cartData.item_count);
        });
      });
      
      // Update cart total elements
      const cartTotalSelectors = [
        '[data-cart-total]',
        '.cart-total',
        '.cart-price',
        '.header__cart-total',
        '.cart-summary .total',
        '.cart-total-price',
        '.cart-subtotal'
      ];
      
      cartTotalSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          if (cartData.total_price !== undefined) {
            const formattedPrice = window.Shopify?.formatMoney ? 
              window.Shopify.formatMoney(cartData.total_price) : 
              `$${(cartData.total_price / 100).toFixed(2)}`;
            element.textContent = formattedPrice;
            console.log('Updated cart total element:', selector, 'with value:', formattedPrice);
          }
        });
      });
      
      // Update cart icon visibility
      const cartIconElements = document.querySelectorAll('.cart-icon, .cart-link, .cart-badge');
      cartIconElements.forEach(element => {
        if (cartData.item_count > 0) {
          element.style.display = '';
          element.classList.remove('cart-empty');
          element.classList.add('cart-has-items');
        } else {
          element.classList.add('cart-empty');
          element.classList.remove('cart-has-items');
        }
      });
      
      console.log('Cart display sync completed');
      
      // Notify embedded app of cart state after display update
      refreshAndNotifyCart();
    }
  
    // Notify embedded app of result
    function notifyEmbeddedApp(type, data) {
      console.log('Notifying embedded app:', type, data);
      
      // Send to all iframes
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        try {
          iframe.contentWindow.postMessage({
            type: type,
            payload: data
          }, '*');
          console.log('Sent message to iframe:', type);
        } catch (error) {
          console.log('Error sending message to iframe:', error);
        }
      });
      
      // Also send to parent window if this is in an iframe
      if (window.parent !== window) {
        try {
          window.parent.postMessage({
            type: type,
            payload: data
          }, '*');
          console.log('Sent message to parent window:', type);
        } catch (error) {
          console.log('Error sending message to parent:', error);
        }
      }
    }
  
    // Initialize cart sync
    function initCartSync() {
      console.log('Shopify Cart Sync initialized');
      
      // Listen for native cart events
      document.addEventListener('cart:updated', function(event) {
        console.log('Native cart updated event received');
        refreshAndNotifyCart();
      });
  
      document.addEventListener('cart:drawer:updated', function(event) {
        console.log('Cart drawer updated event received');
        refreshAndNotifyCart();
      });
      
      // Listen for cart changes from theme
      const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.type === 'childList' || mutation.type === 'attributes') {
            // Check if cart-related elements changed
            const cartElements = document.querySelectorAll('.cart-count, .cart-count-bubble, [data-cart-count]');
            if (cartElements.length > 0) {
              console.log('Cart elements changed, refreshing cart state');
              refreshAndNotifyCart();
            }
          }
        });
      });
      
      // Observe cart-related elements
      const cartElements = document.querySelectorAll('.cart-count, .cart-count-bubble, [data-cart-count], .cart-drawer');
      cartElements.forEach(element => {
        observer.observe(element, { 
          childList: true, 
          subtree: true, 
          attributes: true 
        });
      });
      
      // Initial cart state
      setTimeout(async () => {
        await refreshAndNotifyCart();
      }, 1000);
    }
    
    // Refresh cart and notify embedded app
    async function refreshAndNotifyCart() {
      try {
        const response = await fetch('/cart.js');
        const cart = await response.json();
        console.log('Refreshed cart state:', cart);
        
        // Always notify with current cart state
        notifyEmbeddedApp('CART_INITIAL_STATE', { cart });
      } catch (error) {
        console.log('Error refreshing cart state:', error);
      }
    }
  
    // Expose sync function globally
    window.syncCartDisplay = function() {
      fetch('/cart.js')
        .then(response => response.json())
        .then(cartData => {
          syncCartDisplay(cartData);
        })
        .catch(error => {
          console.error('Error fetching cart data for manual sync:', error);
        });
    };
    
    // Expose refresh function globally
    window.refreshCartState = function() {
      refreshAndNotifyCart();
    };
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initCartSync);
    } else {
      initCartSync();
    }
  
  })(); 