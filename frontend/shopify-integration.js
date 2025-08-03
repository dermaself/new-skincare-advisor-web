// Shopify Integration Script
// Add this to your Shopify theme's assets and include it in your theme.liquid

(function() {
  'use strict';

  // Helper function to extract numeric ID from GraphQL ID
  function extractNumericId(graphqlId) {
    if (!graphqlId) return null;
    // Extract the numeric part from gid://shopify/ProductVariant/123456789
    const match = graphqlId.match(/\/(\d+)$/);
    return match ? match[1] : graphqlId;
  }

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
      
      // Extract numeric ID from GraphQL ID
      const numericId = extractNumericId(variantId);
      
      if (!numericId) {
        throw new Error('Invalid variant ID format');
      }
      
      // Use Shopify's native cart API
      if (typeof window.Shopify !== 'undefined' && window.Shopify.cart) {
        // Add the item to cart
        await window.Shopify.cart.addItem(numericId, quantity);
        
        // Update cart count and display
        setTimeout(() => {
          updateCartDisplay(true);
        }, 500);
        
        // Send success response back to app
        if (event && event.source) {
          event.source.postMessage({
            type: 'CART_UPDATE_SUCCESS',
            payload: { variantId, quantity }
          }, event.origin);
        }
      } else {
        // Fallback to AJAX cart API
        const response = await fetch('/cart/add.js', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: numericId,
            quantity: quantity,
            properties: customAttributes.reduce((acc, attr) => {
              acc[attr.key] = attr.value;
              return acc;
            }, {})
          })
        });
        
        if (response.ok) {
          // Force update after adding item
          setTimeout(() => {
            updateCartDisplay(true);
          }, 500);
          
          if (event && event.source) {
            event.source.postMessage({
              type: 'CART_UPDATE_SUCCESS',
              payload: { variantId, quantity }
            }, event.origin);
          }
        } else {
          const errorData = await response.json();
          throw new Error(`Failed to add to cart: ${errorData.message || response.statusText}`);
        }
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      if (event && event.source) {
        event.source.postMessage({
          type: 'CART_UPDATE_ERROR',
          payload: { error: error.message }
        }, event.origin);
      }
    }
  }

  // Handle adding multiple products (routine) to cart
  async function handleAddRoutineToCart(payload) {
    try {
      const { products } = payload;
      
      // Use Shopify's native cart API for multiple items
      if (typeof window.Shopify !== 'undefined' && window.Shopify.cart) {
        for (const product of products) {
          const numericId = extractNumericId(product.variantId);
          if (numericId) {
            await window.Shopify.cart.addItem(numericId, product.quantity || 1);
          }
        }
        
        // Update cart count and display
        setTimeout(() => {
          updateCartDisplay(true);
        }, 500);
        
        if (event && event.source) {
          event.source.postMessage({
            type: 'ROUTINE_ADD_SUCCESS',
            payload: { products }
          }, event.origin);
        }
      } else {
        // Fallback to AJAX cart API
        const items = products.map(product => {
          const numericId = extractNumericId(product.variantId);
          return {
            id: numericId,
            quantity: product.quantity || 1
          };
        }).filter(item => item.id); // Filter out invalid IDs
        
        const response = await fetch('/cart/add.js', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ items })
        });
        
        if (response.ok) {
          // Force update after adding routine
          setTimeout(() => {
            updateCartDisplay(true);
          }, 500);
          
          if (event && event.source) {
            event.source.postMessage({
              type: 'ROUTINE_ADD_SUCCESS',
              payload: { products }
            }, event.origin);
          }
        } else {
          const errorData = await response.json();
          throw new Error(`Failed to add routine to cart: ${errorData.message || response.statusText}`);
        }
      }
    } catch (error) {
      console.error('Error adding routine to cart:', error);
      if (event && event.source) {
        event.source.postMessage({
          type: 'ROUTINE_ADD_ERROR',
          payload: { error: error.message }
        }, event.origin);
      }
    }
  }

  // Handle getting current cart
  async function handleGetCart() {
    try {
      const response = await fetch('/cart.js');
      const cartData = await response.json();
      
      // Convert Shopify cart format to GraphQL format for the app
      const graphqlCart = {
        id: `gid://shopify/Cart/${cartData.token}`,
        checkoutUrl: `/cart/c/${cartData.token}?key=${cartData.key}`,
        lines: {
          edges: cartData.items.map(item => ({
            node: {
              id: `gid://shopify/CartLine/${item.key}`,
              quantity: item.quantity,
              attributes: Object.entries(item.properties || {}).map(([key, value]) => ({
                key: key,
                value: value
              })),
              merchandise: {
                id: `gid://shopify/ProductVariant/${item.variant_id}`,
                title: item.variant_title || 'Default Title',
                price: {
                  amount: (item.price / 100).toString(),
                  currencyCode: cartData.currency
                },
                product: {
                  title: item.product_title,
                  images: {
                    edges: [{
                      node: {
                        url: item.image,
                        altText: item.title
                      }
                    }]
                  }
                }
              }
            }
          }))
        },
        cost: {
          subtotalAmount: {
            amount: (cartData.items_subtotal_price / 100).toString(),
            currencyCode: cartData.currency
          },
          totalAmount: {
            amount: (cartData.total_price / 100).toString(),
            currencyCode: cartData.currency
          }
        }
      };
      
      if (event && event.source) {
        event.source.postMessage({
          type: 'CART_DATA',
          payload: graphqlCart
        }, event.origin);
      }
    } catch (error) {
      console.error('Error getting cart:', error);
      if (event && event.source) {
        event.source.postMessage({
          type: 'CART_DATA_ERROR',
          payload: { error: error.message }
        }, event.origin);
      }
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
    
    if (event && event.source) {
      event.source.postMessage({
        type: 'SHOPIFY_DATA',
        payload: shopifyData
      }, event.origin);
    }
  }

  // Update cart display (cart count, mini cart, etc.)
  async function updateCartDisplay(force = false) {
    try {
      // Fetch current cart data
      const response = await fetch('/cart.js');
      const cartData = await response.json();
      
      // Update cart count in header - try multiple selectors
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
        '.cart-count-bubble .visually-hidden'
      ];
      
      cartCountSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          element.textContent = cartData.item_count || 0;
        });
      });

      // Update cart total - try multiple selectors
      const cartTotalSelectors = [
        '[data-cart-total]',
        '.cart-total',
        '.cart-price',
        '.header__cart-total',
        '.cart-summary .total'
      ];
      
      cartTotalSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          if (cartData.total_price !== undefined) {
            element.textContent = window.Shopify?.formatMoney ? 
              window.Shopify.formatMoney(cartData.total_price) : 
              `$${(cartData.total_price / 100).toFixed(2)}`;
          }
        });
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

  // Listen for custom cart events (only when explicitly triggered)
  document.addEventListener('cart:refresh', function(event) {
    updateCartDisplay(true);
  });

  // Expose updateCartDisplay globally so themes can call it
  window.updateCartDisplay = updateCartDisplay;

  // Debug function to help identify cart elements
  window.debugCartElements = function() {
    const selectors = [
      '[data-cart-count]',
      '.cart-count',
      '.cart-item-count',
      '.header__cart-count',
      '.cart-badge',
      '.cart-icon .count',
      '.cart-icon span',
      '.cart-link .count'
    ];
    
    console.log('=== Cart Element Debug ===');
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      console.log(`${selector}: ${elements.length} elements found`);
      elements.forEach((el, index) => {
        console.log(`  ${index + 1}. Text: "${el.textContent}", HTML: ${el.outerHTML.substring(0, 100)}...`);
      });
    });
    
    // Also check for any elements containing "cart" in their class or ID
    const allElements = document.querySelectorAll('*');
    const cartElements = Array.from(allElements).filter(el => {
      const className = el.className || '';
      const id = el.id || '';
      return className.toLowerCase().includes('cart') || id.toLowerCase().includes('cart');
    });
    
    console.log(`Found ${cartElements.length} elements with "cart" in class or ID`);
    cartElements.slice(0, 10).forEach((el, index) => {
      console.log(`  ${index + 1}. ${el.tagName}.${el.className}#${el.id} - Text: "${el.textContent}"`);
    });
  };

})(); 