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
      
      case 'SHOPIFY_PROCEED_TO_CHECKOUT':
        callShopifyProceedToCheckout();
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
          properties: {},
          sections: 'cart-drawer,cart-icon-bubble,cart-count'
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
        
        // Check if cart was empty before adding
        const wasEmpty = cart.item_count === quantity;
        console.log('Cart was empty before adding:', wasEmpty);
        
        // Use Shopify's native cart sync system
        console.log('Using Shopify native cart sync system');
        await syncCartWithShopify();
        
        // Always update the cart drawer with sections data if available
        if (result.sections && result.sections['cart-drawer']) {
          console.log('Updating cart drawer with sections data');
          updateCartUIElements(result.sections);
        } else {
          // If no sections data, force a refresh of the cart drawer
          console.log('No sections data available, forcing cart drawer refresh');
          await refreshCartDrawer();
        }
        
        // Debug: Log the sections data to understand what we're working with
        console.log('Sections data from cart add response:', result.sections);
        console.log('Cart data after adding item:', cart);
        
        // Additional fallback: ensure cart drawer is updated by fetching fresh sections
        setTimeout(async () => {
          try {
            console.log('Performing additional cart drawer refresh as fallback');
            await updateCartSections();
          } catch (error) {
            console.error('Error in fallback cart drawer refresh:', error);
          }
        }, 500);
        
        // Force a complete cart drawer refresh after a short delay to ensure it's updated
        setTimeout(async () => {
          try {
            console.log('Performing final cart drawer refresh to ensure all items are visible');
            await forceRefreshCartDrawer();
            
            // Additional check: if cart drawer still doesn't show items, try a more aggressive approach
            setTimeout(async () => {
              try {
                console.log('Performing aggressive cart drawer update');
                const cartDrawer = document.querySelector('cart-drawer, [data-cart-drawer], .cart-drawer, #cart-drawer');
                if (cartDrawer) {
                  // Force a complete refresh by fetching fresh cart data
                  const freshCartResponse = await fetch('/cart.js?sections=cart-drawer,cart-icon-bubble');
                  const freshCart = await freshCartResponse.json();
                  
                  if (freshCart.sections && freshCart.sections['cart-drawer']) {
                    console.log('Applying fresh cart drawer data');
                    cartDrawer.innerHTML = freshCart.sections['cart-drawer'];
                    
                    // Re-bind functionality
                    rebindCartDrawerFunctionality(cartDrawer);
                    
                    // Trigger events
                    cartDrawer.dispatchEvent(new CustomEvent('cart-drawer-updated', {
                      detail: { content: freshCart.sections['cart-drawer'] }
                    }));
                  }
                }
              } catch (error) {
                console.error('Error in aggressive cart drawer update:', error);
              }
            }, 500);
          } catch (error) {
            console.error('Error in final cart drawer refresh:', error);
          }
        }, 1000);
        
        // Extract the newly added product information
        const addedProduct = {
          name: result.product_title || result.title || 'Product',
          image: result.image || '/placeholder-product.png',
          price: result.final_price || 0,
          variant_id: result.variant_id
        };

        // Notify embedded app of success with sections data and added product info
        notifyApp('CART_UPDATE_SUCCESS', { 
          cart,
          sections: result.sections || {},
          addedProducts: [addedProduct] // Send only the newly added product
        });
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
          quantity: 0,
          sections: 'cart-drawer,cart-icon-bubble'
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Shopify cart remove success:', result);
        
        // Get updated cart data
        const updatedCartResponse = await fetch('/cart.js');
        const updatedCart = await updatedCartResponse.json();
        
        // Check if cart is now empty
        const isNowEmpty = updatedCart.item_count === 0;
        console.log('Cart is now empty:', isNowEmpty);
        
        // Use Shopify's native cart sync system
        console.log('Using Shopify native cart sync system for remove operation');
        await syncCartWithShopify();
        
        // If cart is now empty, handle the transition to empty cart state
        if (isNowEmpty) {
          console.log('Cart is now empty, handling transition to empty cart state');
          await handleEmptyCartState();
        } else if (result.sections && result.sections['cart-drawer']) {
          // If cart still has items and we have sections data, update the cart drawer
          console.log('Cart still has items, updating cart drawer with sections data');
          updateCartUIElements(result.sections);
        }
        
        // Notify embedded app of success with sections data
        notifyApp('CART_UPDATE_SUCCESS', { 
          cart: updatedCart,
          sections: result.sections || {}
        });
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

  // Call Shopify's checkout functionality
  async function callShopifyProceedToCheckout() {
    try {
      console.log('Proceeding to Shopify checkout');
      
      // Method 1: Try to use Shopify's native checkout if available
      if (window.Shopify && window.Shopify.checkout) {
        console.log('Using Shopify.checkout()');
        window.Shopify.checkout();
        return;
      }
      
      // Method 2: Try to find and click a checkout button
      const checkoutButtons = document.querySelectorAll('[data-checkout], .checkout-button, #checkout, [href*="checkout"], .btn--checkout, .checkout-btn, [data-action="checkout"]');
      if (checkoutButtons.length > 0) {
        console.log('Clicking checkout button');
        checkoutButtons[0].click();
        return;
      }
      
      // Method 3: Get cart token and navigate to checkout
      try {
        const cartResponse = await fetch('/cart.js');
        const cart = await cartResponse.json();
        
        if (cart.token) {
          const checkoutUrl = `/checkout?token=${cart.token}`;
          console.log('Navigating to checkout URL:', checkoutUrl);
          
          // Navigate to the checkout URL on the current domain
          window.location.href = checkoutUrl;
          return;
        }
      } catch (cartError) {
        console.log('Could not get cart token, trying alternative methods');
      }
      
      // Method 4: Navigate to /checkout directly
      console.log('Navigating to /checkout directly');
      const currentOrigin = window.location.origin;
      const checkoutUrl = `${currentOrigin}/checkout`;
      console.log('Full checkout URL:', checkoutUrl);
      window.location.href = checkoutUrl;
      
    } catch (error) {
      console.error('Shopify checkout error:', error);
      // Final fallback - navigate to checkout on current domain
      const currentOrigin = window.location.origin;
      window.location.href = `${currentOrigin}/checkout`;
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

  // Set up real-time cart monitoring
  setupRealTimeCartMonitoring();

  // Expose functions for manual use
  window.shopifyCartBridge = {
    addToCart: callShopifyAddToCart,
    removeFromCart: callShopifyRemoveFromCart,
    getCart: callShopifyGetCart,
    proceedToCheckout: callShopifyProceedToCheckout,
    updateCartSections: updateCartSections,
    refreshCartDrawer: refreshCartDrawer,
    forceRefreshCartDrawer: forceRefreshCartDrawer,
    handleEmptyCartTransition: handleEmptyCartTransition,
    handleEmptyCartState: handleEmptyCartState,
    restoreEmptyCartStateManually: restoreEmptyCartStateManually,
    rebindCartDrawerFunctionality: rebindCartDrawerFunctionality,
    syncCartWithShopify: syncCartWithShopify,
    updateCartCountElements: updateCartCountElements,
    debugCartElements: debugCartElements
  };

  // Function to update cart sections
  async function updateCartSections() {
    try {
      console.log('Updating cart sections');
      
      const response = await fetch('/cart.js?sections=cart-drawer,cart-icon-bubble');
      const sectionsData = await response.json();
      
      console.log('Cart sections data:', sectionsData);
      
      // Update the cart UI elements with the sections data
      updateCartUIElements(sectionsData);
      
      // Notify embedded app with sections data
      notifyApp('CART_SECTIONS_UPDATE', { sections: sectionsData });
      
      return sectionsData;
    } catch (error) {
      console.error('Error updating cart sections:', error);
      notifyApp('CART_SECTIONS_ERROR', { error: error.message });
    }
  }

  // Function to update cart UI elements with sections data
  function updateCartUIElements(sectionsData) {
    console.log('Updating cart UI elements with sections data:', sectionsData);
    
    if (!sectionsData) {
      console.log('No sections data provided');
      return;
    }

    // Update cart drawer if section data is available
    if (sectionsData['cart-drawer']) {
      // Try multiple selectors to find the cart drawer
      const cartDrawerSelectors = [
        'cart-drawer',
        '[data-cart-drawer]',
        '.cart-drawer',
        '#cart-drawer',
        '[id*="cart-drawer"]',
        '[class*="cart-drawer"]',
        '[data-cart-container]',
        '.cart-container',
        '[data-cart-popup]',
        '.cart-popup',
        '[data-cart-sidebar]',
        '.cart-sidebar'
      ];
      
      let cartDrawer = null;
      for (const selector of cartDrawerSelectors) {
        cartDrawer = document.querySelector(selector);
        if (cartDrawer) {
          console.log('Found cart drawer with selector:', selector);
          break;
        }
      }
      
      if (cartDrawer) {
        console.log('Updating cart drawer');
        try {
          // Check if cart is currently empty
          const isCurrentlyEmpty = cartDrawer.classList.contains('is-empty') || 
                                  cartDrawer.querySelector('.is-empty') !== null ||
                                  cartDrawer.querySelector('.cart__empty-text') !== null ||
                                  cartDrawer.querySelector('.drawer__inner-empty') !== null;
          
          console.log('Cart is currently empty:', isCurrentlyEmpty);
          
          if (isCurrentlyEmpty) {
            // If cart is empty, replace the entire cart drawer content but preserve the cart-drawer element
            console.log('Cart is empty, replacing cart drawer content while preserving functionality');
            
            // Parse the sections data to get the inner content
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = sectionsData['cart-drawer'];
            
            // Find the inner content (everything inside the cart-drawer element)
            const newInnerContent = tempDiv.querySelector('cart-drawer > *') || tempDiv.firstElementChild;
            
            if (newInnerContent) {
              // Clear the cart drawer and append the new content
              cartDrawer.innerHTML = '';
              cartDrawer.appendChild(newInnerContent);
              
              // Remove empty classes
              cartDrawer.classList.remove('is-empty');
              const emptyElements = cartDrawer.querySelectorAll('.is-empty');
              emptyElements.forEach(el => el.classList.remove('is-empty'));
              
              console.log('Cart drawer content replaced while preserving cart-drawer element');
            } else {
              // Fallback: replace entire content
              cartDrawer.innerHTML = sectionsData['cart-drawer'];
            }
          } else {
            // If cart has items, try to update specific parts
            console.log('Cart has items, updating specific parts');
            
            // Try to find the cart items container with more specific selectors
            const cartItemsContainer = cartDrawer.querySelector('#CartDrawer-CartItems, .drawer__contents, .cart__contents, [data-cart-items], cart-drawer-items, .cart-items');
            
            if (cartItemsContainer) {
              console.log('Found cart items container, updating it');
              // Parse the sections data to extract just the cart items part
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = sectionsData['cart-drawer'];
              
              // Try to find the cart items in the sections data with more specific selectors
              const newCartItems = tempDiv.querySelector('#CartDrawer-CartItems, .drawer__contents, .cart__contents, [data-cart-items], cart-drawer-items, .cart-items');
              
              if (newCartItems) {
                cartItemsContainer.innerHTML = newCartItems.innerHTML;
                console.log('Cart items container updated successfully');
              } else {
                // If we can't find the specific container, update the entire drawer
                console.log('Cart items container not found in sections data, updating entire drawer');
                cartDrawer.innerHTML = sectionsData['cart-drawer'];
              }
            } else {
              // Fallback: update the entire cart drawer
              console.log('Cart items container not found, updating entire cart drawer');
              cartDrawer.innerHTML = sectionsData['cart-drawer'];
            }
            
            // Also try to update the cart drawer items element specifically
            const cartDrawerItems = cartDrawer.querySelector('cart-drawer-items');
            if (cartDrawerItems) {
              console.log('Found cart-drawer-items element, ensuring it is not marked as empty');
              // Remove the is-empty class if items were added
              if (cartDrawerItems.classList.contains('is-empty')) {
                cartDrawerItems.classList.remove('is-empty');
                console.log('Removed is-empty class from cart-drawer-items');
              }
            }
          }
          
          // Also try to update the cart drawer items element specifically
          const cartDrawerItems = cartDrawer.querySelector('cart-drawer-items');
          if (cartDrawerItems) {
            console.log('Found cart-drawer-items element');
            // Remove the is-empty class if items were added
            if (cartDrawerItems.classList.contains('is-empty')) {
              cartDrawerItems.classList.remove('is-empty');
              console.log('Removed is-empty class from cart-drawer-items');
            }
          }
          
          // Update the cart drawer class if it's empty
          if (cartDrawer.classList.contains('is-empty')) {
            cartDrawer.classList.remove('is-empty');
            console.log('Removed is-empty class from cart drawer');
          }
          
          // Re-bind close button functionality
          rebindCartDrawerFunctionality(cartDrawer);
          
          // Trigger any cart drawer specific events
          cartDrawer.dispatchEvent(new CustomEvent('cart-drawer-updated', {
            detail: { content: sectionsData['cart-drawer'] }
          }));
          
          console.log('Cart drawer updated successfully');
        } catch (error) {
          console.error('Error updating cart drawer:', error);
        }
      } else {
        console.log('Cart drawer element not found with any selector');
        // Log all cart-related elements for debugging
        const allCartElements = document.querySelectorAll('[class*="cart"], [id*="cart"], [data-cart]');
        console.log('Available cart-related elements:', allCartElements);
      }
    }

    // Update cart icon bubble if section data is available
    if (sectionsData['cart-icon-bubble']) {
      // Try multiple selectors to find the cart icon
      const cartIconSelectors = [
        '[data-cart-icon-bubble]',
        '.cart-icon-bubble',
        '#cart-icon-bubble',
        '[id*="cart-icon-bubble"]',
        '[class*="cart-icon-bubble"]',
        '.cart-count',
        '.cart-count-bubble',
        '[data-cart-count]',
        '[data-cart-icon]',
        '.cart-icon',
        '[data-cart-badge]',
        '.cart-badge',
        '[data-cart-indicator]',
        '.cart-indicator'
      ];
      
      let cartIconBubble = null;
      for (const selector of cartIconSelectors) {
        cartIconBubble = document.querySelector(selector);
        if (cartIconBubble) {
          console.log('Found cart icon with selector:', selector);
          break;
        }
      }
      
      if (cartIconBubble) {
        console.log('Updating cart icon bubble');
        try {
          cartIconBubble.innerHTML = sectionsData['cart-icon-bubble'];
          
          // Trigger any cart icon specific events
          cartIconBubble.dispatchEvent(new CustomEvent('cart-icon-updated', {
            detail: { content: sectionsData['cart-icon-bubble'] }
          }));
          
          console.log('Cart icon updated successfully');
        } catch (error) {
          console.error('Error updating cart icon:', error);
        }
      } else {
        console.log('Cart icon bubble element not found with any selector');
        // Log all icon-related elements for debugging
        const allIconElements = document.querySelectorAll('[class*="icon"], [id*="icon"], [data-icon], [class*="count"], [id*="count"]');
        console.log('Available icon/count elements:', allIconElements);
      }
    }

    // Also try to update any other cart-related elements
    const cartElements = document.querySelectorAll('[data-cart], .cart, [id*="cart"], [class*="cart"]');
    cartElements.forEach(element => {
      // Check if this element should be updated based on its attributes or classes
      const shouldUpdate = element.hasAttribute('data-cart') || 
                          element.classList.contains('cart') ||
                          element.id.includes('cart');
      
      if (shouldUpdate) {
        console.log('Found cart element to potentially update:', element);
        // You can add specific logic here for different cart elements
      }
    });

    // Dispatch a general cart update event
    document.dispatchEvent(new CustomEvent('cart-ui-updated', {
      detail: { sections: sectionsData }
    }));
    
    console.log('Cart UI update process completed');
  }

  // Function to re-bind cart drawer functionality after content updates
  function rebindCartDrawerFunctionality(cartDrawer) {
    console.log('Re-binding cart drawer functionality');
    
    // Re-bind close button functionality
    const closeButtons = cartDrawer.querySelectorAll('.drawer__close');
    closeButtons.forEach(button => {
      // Remove existing onclick to avoid conflicts
      button.removeAttribute('onclick');
      
      // Add new click event listener
      button.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('Close button clicked');
        
        // Try to call the close method on the cart drawer
        if (cartDrawer.close && typeof cartDrawer.close === 'function') {
          cartDrawer.close();
        } else {
          // Fallback: manually remove active class and hide drawer
          cartDrawer.classList.remove('active');
          cartDrawer.classList.remove('animate');
          
          // Also try to find and close any parent drawer elements
          const parentDrawer = cartDrawer.closest('.drawer');
          if (parentDrawer) {
            parentDrawer.classList.remove('active');
            parentDrawer.classList.remove('animate');
          }
          
          console.log('Cart drawer closed manually');
        }
      });
    });
    
    // Re-bind overlay click functionality
    const overlay = cartDrawer.querySelector('.cart-drawer__overlay');
    if (overlay) {
      overlay.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('Overlay clicked');
        
        // Try to call the close method on the cart drawer
        if (cartDrawer.close && typeof cartDrawer.close === 'function') {
          cartDrawer.close();
        } else {
          // Fallback: manually remove active class and hide drawer
          cartDrawer.classList.remove('active');
          cartDrawer.classList.remove('animate');
          
          // Also try to find and close any parent drawer elements
          const parentDrawer = cartDrawer.closest('.drawer');
          if (parentDrawer) {
            parentDrawer.classList.remove('active');
            parentDrawer.classList.remove('animate');
          }
          
          console.log('Cart drawer closed via overlay');
        }
      });
    }
    
    console.log('Cart drawer functionality re-bound');
  }

  // Function to refresh the cart drawer
  async function refreshCartDrawer() {
    try {
      console.log('Refreshing cart drawer manually');
      const cartResponse = await fetch('/cart.js?sections=cart-drawer');
      const cart = await cartResponse.json();
      
      if (cart.sections && cart.sections['cart-drawer']) {
        updateCartUIElements({ 'cart-drawer': cart.sections['cart-drawer'] });
        console.log('Cart drawer refreshed successfully');
      } else {
        console.log('No cart drawer sections data available');
        // Try to trigger Shopify's native cart events as fallback
        triggerShopifyCartEvents();
      }
    } catch (error) {
      console.error('Error refreshing cart drawer:', error);
      // Try to trigger Shopify's native cart events as fallback
      triggerShopifyCartEvents();
    }
  }

  // Function to force refresh the cart drawer (useful for empty cart scenarios)
  async function forceRefreshCartDrawer() {
    try {
      console.log('Forcing cart drawer refresh');
      const cartResponse = await fetch('/cart.js?sections=cart-drawer');
      const cart = await cartResponse.json();
      
      if (cart.sections && cart.sections['cart-drawer']) {
        updateCartUIElements({ 'cart-drawer': cart.sections['cart-drawer'] });
        console.log('Cart drawer refreshed successfully after force refresh');
      } else {
        console.log('No cart drawer sections data available after force refresh');
        // Try to trigger Shopify's native cart events as fallback
        triggerShopifyCartEvents();
      }
    } catch (error) {
      console.error('Error forcing cart drawer refresh:', error);
      // Try to trigger Shopify's native cart events as fallback
      triggerShopifyCartEvents();
    }
  }

  // Function to handle empty cart to non-empty cart transition
  async function handleEmptyCartTransition() {
    try {
      console.log('Handling empty cart to non-empty cart transition');
      
      // Find the cart drawer
      const cartDrawer = document.querySelector('cart-drawer, [data-cart-drawer], .cart-drawer, #cart-drawer');
      
      if (cartDrawer) {
        console.log('Found cart drawer for empty cart transition');
        
        // Force a complete refresh of the cart drawer
        const cartResponse = await fetch('/cart.js?sections=cart-drawer');
        const cart = await cartResponse.json();
        
        if (cart.sections && cart.sections['cart-drawer']) {
          // Parse the sections data to get the inner content
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = cart.sections['cart-drawer'];
          
          // Find the inner content (everything inside the cart-drawer element)
          const newInnerContent = tempDiv.querySelector('cart-drawer > *') || tempDiv.firstElementChild;
          
          if (newInnerContent) {
            // Clear the cart drawer and append the new content
            cartDrawer.innerHTML = '';
            cartDrawer.appendChild(newInnerContent);
            
            // Remove all empty-related classes
            cartDrawer.classList.remove('is-empty');
            const emptyElements = cartDrawer.querySelectorAll('.is-empty, .drawer__inner-empty');
            emptyElements.forEach(el => el.classList.remove('is-empty'));
            
            // Re-bind cart drawer functionality
            rebindCartDrawerFunctionality(cartDrawer);
            
            console.log('Empty cart transition completed successfully');
            
            // Trigger events
            cartDrawer.dispatchEvent(new CustomEvent('cart-drawer-updated', {
              detail: { content: cart.sections['cart-drawer'] }
            }));
            
            document.dispatchEvent(new CustomEvent('cart-ui-updated', {
              detail: { sections: { 'cart-drawer': cart.sections['cart-drawer'] } }
            }));
          } else {
            // Fallback: replace entire content
            cartDrawer.innerHTML = cart.sections['cart-drawer'];
            
            // Remove all empty-related classes
            cartDrawer.classList.remove('is-empty');
            const emptyElements = cartDrawer.querySelectorAll('.is-empty, .drawer__inner-empty');
            emptyElements.forEach(el => el.classList.remove('is-empty'));
            
            // Re-bind cart drawer functionality
            rebindCartDrawerFunctionality(cartDrawer);
            
            console.log('Empty cart transition completed with fallback');
          }
        } else {
          console.log('No cart drawer sections data available for empty cart transition');
          triggerShopifyCartEvents();
        }
      } else {
        console.log('Cart drawer not found for empty cart transition');
        triggerShopifyCartEvents();
      }
    } catch (error) {
      console.error('Error handling empty cart transition:', error);
      triggerShopifyCartEvents();
    }
  }

  // Function to handle transition to empty cart state
  async function handleEmptyCartState() {
    try {
      console.log('Handling transition to empty cart state');
      
      // Find the cart drawer
      const cartDrawer = document.querySelector('cart-drawer, [data-cart-drawer], .cart-drawer, #cart-drawer');
      
      if (cartDrawer) {
        console.log('Found cart drawer for empty cart state transition');
        
        // Get the empty cart state from Shopify
        const cartResponse = await fetch('/cart.js?sections=cart-drawer');
        const cart = await cartResponse.json();
        
        if (cart.sections && cart.sections['cart-drawer']) {
          // Parse the sections data to get the inner content
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = cart.sections['cart-drawer'];
          
          // Find the inner content (everything inside the cart-drawer element)
          const newInnerContent = tempDiv.querySelector('cart-drawer > *') || tempDiv.firstElementChild;
          
          if (newInnerContent) {
            // Clear the cart drawer and append the new content
            cartDrawer.innerHTML = '';
            cartDrawer.appendChild(newInnerContent);
            
            // Add empty-related classes
            cartDrawer.classList.add('is-empty');
            
            // Find and add is-empty class to cart-drawer-items if it exists
            const cartDrawerItems = cartDrawer.querySelector('cart-drawer-items');
            if (cartDrawerItems) {
              cartDrawerItems.classList.add('is-empty');
            }
            
            // Re-bind cart drawer functionality
            rebindCartDrawerFunctionality(cartDrawer);
            
            console.log('Empty cart state transition completed successfully');
            
            // Trigger events
            cartDrawer.dispatchEvent(new CustomEvent('cart-drawer-updated', {
              detail: { content: cart.sections['cart-drawer'] }
            }));
            
            document.dispatchEvent(new CustomEvent('cart-ui-updated', {
              detail: { sections: { 'cart-drawer': cart.sections['cart-drawer'] } }
            }));
          } else {
            // Fallback: replace entire content
            cartDrawer.innerHTML = cart.sections['cart-drawer'];
            
            // Add empty-related classes
            cartDrawer.classList.add('is-empty');
            
            // Find and add is-empty class to cart-drawer-items if it exists
            const cartDrawerItems = cartDrawer.querySelector('cart-drawer-items');
            if (cartDrawerItems) {
              cartDrawerItems.classList.add('is-empty');
            }
            
            // Re-bind cart drawer functionality
            rebindCartDrawerFunctionality(cartDrawer);
            
            console.log('Empty cart state transition completed with fallback');
          }
        } else {
          console.log('No cart drawer sections data available for empty cart state');
          // Try to manually restore empty cart state
          restoreEmptyCartStateManually(cartDrawer);
        }
      } else {
        console.log('Cart drawer not found for empty cart state transition');
        triggerShopifyCartEvents();
      }
    } catch (error) {
      console.error('Error handling empty cart state transition:', error);
      triggerShopifyCartEvents();
    }
  }

  // Function to manually restore empty cart state
  function restoreEmptyCartStateManually(cartDrawer) {
    console.log('Manually restoring empty cart state');
    
    try {
      // Add empty classes
      cartDrawer.classList.add('is-empty');
      
      // Find cart-drawer-items and add is-empty class
      const cartDrawerItems = cartDrawer.querySelector('cart-drawer-items');
      if (cartDrawerItems) {
        cartDrawerItems.classList.add('is-empty');
      }
      
      // Create the complete empty cart structure
      const emptyCartHTML = `
        <div id="CartDrawer" class="cart-drawer">
          <div id="CartDrawer-Overlay" class="cart-drawer__overlay"></div>
          <div class="drawer__inner" role="dialog" aria-modal="true" aria-label="Your cart" tabindex="-1">
            <div class="drawer__inner-empty">
              <div class="cart-drawer__warnings center cart-drawer__warnings--has-collection">
                <div class="cart-drawer__empty-content">
                  <h2 class="cart__empty-text">Your cart is empty</h2>
                  <button class="drawer__close" type="button" onclick="this.closest('cart-drawer').close()" aria-label="Close">
                    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" class="icon icon-close" fill="none" viewBox="0 0 18 17">
                      <path d="M.865 15.978a.5.5 0 00.707.707l7.433-7.431 7.579 7.282a.501.501 0 00.846-.37.5.5 0 00-.153-.351L9.712 8.546l7.417-7.416a.5.5 0 10-.707-.708L8.991 7.853 1.413.573a.5.5 0 10-.693.72l7.563 7.268-7.418 7.417z" fill="currentColor"></path>
                    </svg>
                  </button>
                  <a href="/collections/all" class="button">Continue shopping</a>
                  <p class="cart__login-title h3">Have an account?</p>
                  <p class="cart__login-paragraph">
                    <a href="https://shopify.com/88898634064/account?locale=en&amp;region_country=IT&amp;consent=p0a0m0&amp;consent_id=ad0dc1a9-00ee-42e4-ad27-1e3e2fe217bb" class="link underlined-link">Log in</a> to check out faster.
                  </p>
                </div>
              </div>
              <div class="cart-drawer__collection">
                <div class="card-wrapper animate-arrow collection-card-wrapper">
                  <div class="card card--standard card--text" style="--ratio-percent: 100%;">
                    <div class="card__inner color-background-2 gradient ratio" style="--ratio-percent: 100%;">
                      <div class="card__content">
                        <div class="card__information">
                          <h3 class="card__heading">
                            <a href="/collections/hydrogen" class="full-unstyled-link">Hydrogen<span class="icon-wrap"><svg viewBox="0 0 14 10" fill="none" aria-hidden="true" focusable="false" class="icon icon-arrow" xmlns="http://www.w3.org/2000/svg">
                              <path fill-rule="evenodd" clip-rule="evenodd" d="M8.537.808a.5.5 0 01.817-.162l4 4a.5.5 0 010 .708l-4 4a.5.5 0 11-.708-.708L11.793 5.5H1a.5.5 0 010-1h10.793L8.646 1.354a.5.5 0 01-.109-.546z" fill="currentColor"></path>
                            </svg></span></a>
                          </h3>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="drawer__header">
              <h2 class="drawer__heading">Your cart</h2>
              <button class="drawer__close" type="button" onclick="this.closest('cart-drawer').close()" aria-label="Close">
                <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" class="icon icon-close" fill="none" viewBox="0 0 18 17">
                  <path d="M.865 15.978a.5.5 0 00.707.707l7.433-7.431 7.579 7.282a.501.501 0 00.846-.37.5.5 0 00-.153-.351L9.712 8.546l7.417-7.416a.5.5 0 10-.707-.708L8.991 7.853 1.413.573a.5.5 0 10-.693.72l7.563 7.268-7.418 7.417z" fill="currentColor"></path>
                </svg>
              </button>
            </div>
            <cart-drawer-items class="is-empty">
              <form action="/cart" id="CartDrawer-Form" class="cart__contents cart-drawer__form" method="post">
                <div id="CartDrawer-CartItems" class="drawer__contents js-contents">
                  <p id="CartDrawer-LiveRegionText" class="visually-hidden" role="status"></p>
                  <p id="CartDrawer-LineItemStatus" class="visually-hidden" aria-hidden="true" role="status">Loading...</p>
                </div>
                <div id="CartDrawer-CartErrors" role="alert"></div>
              </form>
            </cart-drawer-items>
            <div class="drawer__footer">
              <div class="cart-drawer__footer">
                <div class="totals" role="status">
                  <h2 class="totals__subtotal">Subtotal</h2>
                  <p class="totals__subtotal-value">€0,00 EUR</p>
                </div>
                <div></div>
                <small class="tax-note caption-large rte">Tax included and shipping calculated at checkout</small>
              </div>
              <div class="cart__ctas">
                <noscript>
                  <button type="submit" class="cart__update-button button button--secondary" form="CartDrawer-Form">Update</button>
                </noscript>
                <button type="submit" id="CartDrawer-Checkout" class="cart__checkout-button button" name="checkout" form="CartDrawer-Form" disabled="">Check out</button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      // Replace the entire cart drawer content
      cartDrawer.innerHTML = emptyCartHTML;
      
      // Re-bind cart drawer functionality
      rebindCartDrawerFunctionality(cartDrawer);
      
      console.log('Empty cart state restored manually with complete structure');
    } catch (error) {
      console.error('Error manually restoring empty cart state:', error);
    }
  }

  // Function to trigger Shopify's native cart events
  function triggerShopifyCartEvents() {
    console.log('Triggering Shopify native cart events');
    
    // Trigger cart:updated event
    document.dispatchEvent(new CustomEvent('cart:updated', {
      detail: { cart: null }
    }));
    
    // Trigger cart:refresh event
    document.dispatchEvent(new CustomEvent('cart:refresh', {
      detail: { cart: null }
    }));
    
    // Also try to trigger any other cart-related events that might be listened to
    const cartEvents = ['cart:updated', 'cart:refresh', 'cart:change', 'cart:reload'];
    cartEvents.forEach(eventName => {
      document.dispatchEvent(new CustomEvent(eventName, {
        detail: { cart: null }
      }));
    });
    
    console.log('Shopify native cart events triggered');
  }

  // Function to properly sync cart icon and drawer using Shopify's native system
  async function syncCartWithShopify() {
    try {
      console.log('Syncing cart with Shopify native system');
      
      // Get current cart data
      const cartResponse = await fetch('/cart.js');
      const cart = await cartResponse.json();
      
      console.log('Current cart data:', cart);
      
      // Trigger Shopify's native cart update events
      triggerShopifyCartEvents();
      
      // Also try to trigger theme-specific cart events
      const themeEvents = [
        'cart:updated',
        'cart:refresh', 
        'cart:change',
        'cart:reload',
        'cart:open',
        'cart:close'
      ];
      
      themeEvents.forEach(eventName => {
        document.dispatchEvent(new CustomEvent(eventName, {
          detail: { 
            cart: cart,
            sections: null
          }
        }));
      });
      
      // Try to find and update cart count elements manually if needed
      updateCartCountElements(cart.item_count);
      
      console.log('Cart sync completed');
      
      return cart;
    } catch (error) {
      console.error('Error syncing cart with Shopify:', error);
    }
  }

  // Function to update cart count elements manually
  function updateCartCountElements(itemCount) {
    console.log('Updating cart count elements with count:', itemCount);
    
    // Common cart count selectors
    const cartCountSelectors = [
      '[data-cart-count]',
      '.cart-count',
      '.cart-count-bubble',
      '[data-cart-icon-bubble]',
      '.cart-icon-bubble',
      '[data-cart-badge]',
      '.cart-badge',
      '[data-cart-indicator]',
      '.cart-indicator'
    ];
    
    cartCountSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        if (itemCount > 0) {
          // Show the element and update count
          element.style.display = '';
          element.style.visibility = '';
          element.classList.remove('hidden', 'is-hidden', 'cart-count--empty', 'is-empty');
          element.classList.add('cart-count--has-items');
          
          // Update the text content
          element.textContent = itemCount;
          
          // Update data attributes
          element.setAttribute('data-cart-count', itemCount);
          
          console.log(`Updated cart count element: ${selector} with count ${itemCount}`);
        } else {
          // Hide the element when cart is empty
          element.style.display = 'none';
          element.style.visibility = 'hidden';
          element.classList.add('hidden', 'is-hidden', 'cart-count--empty', 'is-empty');
          element.classList.remove('cart-count--has-items');
          
          // Clear the text content (don't show "0")
          element.textContent = '';
          
          // Update data attributes
          element.setAttribute('data-cart-count', '0');
          
          console.log(`Hidden cart count element: ${selector} (cart is empty)`);
        }
      });
    });
    
    // Also handle cart icon elements that might need to be hidden
    const cartIconSelectors = [
      '.cart-icon',
      '[data-cart-icon]',
      '.cart-bubble',
      '.cart-indicator'
    ];
    
    cartIconSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        if (itemCount > 0) {
          // Show the cart icon
          element.style.display = '';
          element.style.visibility = '';
          element.classList.remove('hidden', 'is-hidden', 'cart-icon--empty');
          element.classList.add('cart-icon--has-items');
        } else {
          // Hide the cart icon when cart is empty
          element.style.display = 'none';
          element.style.visibility = 'hidden';
          element.classList.add('hidden', 'is-hidden', 'cart-icon--empty');
          element.classList.remove('cart-icon--has-items');
          
          console.log(`Hidden cart icon element: ${selector} (cart is empty)`);
        }
      });
    });
  }

  // Set up real-time cart monitoring
  function setupRealTimeCartMonitoring() {
    console.log('Setting up real-time cart monitoring');

    // Listen for Shopify's native cart events
    document.addEventListener('cart:updated', function(event) {
      console.log('Native cart updated event received');
      refreshAndNotifyCart();
    });

    document.addEventListener('cart:refresh', function(event) {
      console.log('Native cart refresh event received');
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

    // Observe cart-related elements for changes
    const cartElements = document.querySelectorAll('.cart-count, .cart-count-bubble, [data-cart-count], .cart-drawer');
    cartElements.forEach(element => {
      observer.observe(element, { 
        childList: true, 
        subtree: true, 
        attributes: true 
      });
    });

    // Also listen for URL changes (in case user navigates to cart page)
    let currentUrl = window.location.href;
    setInterval(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        if (currentUrl.includes('/cart')) {
          console.log('Navigated to cart page, refreshing cart state');
          refreshAndNotifyCart();
        }
      }
    }, 1000);
  }

  // Refresh cart and notify embedded app
  async function refreshAndNotifyCart() {
    try {
      const response = await fetch('/cart.js');
      const cart = await response.json();
      console.log('Refreshed cart state:', cart);
      
      // Notify embedded app with current cart state
      notifyApp('CART_UPDATE_SUCCESS', { cart });
    } catch (error) {
      console.log('Error refreshing cart state:', error);
    }
  }

  // Function to debug cart elements on the page
  function debugCartElements() {
    console.log('=== Cart Elements Debug ===');
    
    const cartSelectors = [
      '[data-cart-drawer]',
      '.cart-drawer',
      '#cart-drawer',
      '[id*="cart-drawer"]',
      '[class*="cart-drawer"]',
      '[data-cart-container]',
      '.cart-container',
      '[data-cart-popup]',
      '.cart-popup',
      '[data-cart-sidebar]',
      '.cart-sidebar',
      '[data-cart-icon-bubble]',
      '.cart-icon-bubble',
      '#cart-icon-bubble',
      '[id*="cart-icon-bubble"]',
      '[class*="cart-icon-bubble"]',
      '.cart-count',
      '.cart-count-bubble',
      '[data-cart-count]',
      '[data-cart-icon]',
      '.cart-icon',
      '[data-cart-badge]',
      '.cart-badge',
      '[data-cart-indicator]',
      '.cart-indicator'
    ];
    
    cartSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`Found ${elements.length} element(s) with selector: ${selector}`);
        elements.forEach((element, index) => {
          console.log(`  Element ${index + 1}:`, {
            tagName: element.tagName,
            id: element.id,
            className: element.className,
            innerHTML: element.innerHTML.substring(0, 100) + '...'
          });
        });
      }
    });
    
    // Also check for any elements with "cart" in their attributes
    const allElements = document.querySelectorAll('*');
    const cartRelatedElements = [];
    
    allElements.forEach(element => {
      const hasCartInId = element.id && element.id.toLowerCase().includes('cart');
      const hasCartInClass = element.className && element.className.toLowerCase().includes('cart');
      const hasCartInData = element.hasAttribute('data-cart') || 
                           Array.from(element.attributes).some(attr => 
                             attr.name.toLowerCase().includes('cart') || 
                             attr.value.toLowerCase().includes('cart')
                           );
      
      if (hasCartInId || hasCartInClass || hasCartInData) {
        cartRelatedElements.push({
          element: element,
          tagName: element.tagName,
          id: element.id,
          className: element.className,
          attributes: Array.from(element.attributes).map(attr => `${attr.name}="${attr.value}"`).join(' ')
        });
      }
    });
    
    if (cartRelatedElements.length > 0) {
      console.log(`Found ${cartRelatedElements.length} cart-related elements:`);
      cartRelatedElements.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.tagName} - ID: "${item.id}" - Class: "${item.className}" - Attributes: ${item.attributes}`);
      });
    }
    
    console.log('=== End Cart Elements Debug ===');
  }

})(); 