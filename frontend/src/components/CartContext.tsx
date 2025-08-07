'use client';

import React, { createContext, useContext, useReducer, useEffect, useState, ReactNode } from 'react';

// Types
export interface CartItem {
  id: string;
  quantity: number;
  merchandise: {
    id: string;
    title: string;
    price: {
      amount: string;
      currencyCode: string;
    };
    product: {
      title: string;
      images: Array<{
        url: string;
        altText: string;
      }>;
    };
  };
  attributes?: Array<{
    key: string;
    value: string;
  }>;
}

export interface Cart {
  id: string;
  checkoutUrl: string;
  lines: CartItem[];
  cost: {
    subtotalAmount: {
      amount: string;
      currencyCode: string;
    };
    totalAmount: {
      amount: string;
      currencyCode: string;
    };
  };
}

interface CartState {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  showCartSuccessModal: boolean;
  lastAddedProducts: Array<{
    name: string;
    image: string;
    price: number;
  }>;
  showGlobalLoading: boolean;
}

type CartAction =
  | { type: 'SET_CART'; payload: Cart }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_CART' }
  | { type: 'SHOW_CART_SUCCESS_MODAL'; payload: Array<{name: string; image: string; price: number}> }
  | { type: 'HIDE_CART_SUCCESS_MODAL' }
  | { type: 'SHOW_GLOBAL_LOADING' }
  | { type: 'HIDE_GLOBAL_LOADING' };

// Initial state
const initialState: CartState = {
  cart: null,
  loading: false,
  error: null,
  showCartSuccessModal: false,
  lastAddedProducts: [],
  showGlobalLoading: false,
};

// Reducer
function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'SET_CART':
      return {
        ...state,
        cart: action.payload,
        error: null,
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false,
      };
    case 'CLEAR_CART':
      return {
        ...state,
        cart: null,
        error: null,
      };
    case 'SHOW_CART_SUCCESS_MODAL':
      return {
        ...state,
        showCartSuccessModal: true,
        lastAddedProducts: action.payload,
      };
    case 'HIDE_CART_SUCCESS_MODAL':
      return {
        ...state,
        showCartSuccessModal: false,
        lastAddedProducts: [],
      };
    case 'SHOW_GLOBAL_LOADING':
      return {
        ...state,
        showGlobalLoading: true,
      };
    case 'HIDE_GLOBAL_LOADING':
      return {
        ...state,
        showGlobalLoading: false,
      };
    default:
      return state;
  }
}

// Context
interface CartContextType {
  state: CartState;
  addToCart: (variantId: string, quantity?: number, customAttributes?: Array<{key: string, value: string}>, productInfo?: {name: string; image: string; price: number}) => Promise<void>;
  updateCartItem: (lineId: string, quantity: number) => Promise<void>;
  removeFromCart: (lineId: string) => Promise<void>;
  getCart: (cartId: string) => Promise<void>;
  clearCart: () => void;
  isProductInCart: (variantId: string) => boolean;
  getCartItemLineId: (variantId: string) => string | null;
  refreshCart: () => Promise<void>;
  showCartSuccessModal: (products: Array<{name: string; image: string; price: number}>) => void;
  hideCartSuccessModal: () => void;
  proceedToCheckout: () => void;
  showGlobalLoading: () => void;
  hideGlobalLoading: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Provider component
interface CartProviderProps {
  children: ReactNode;
}

export function CartProvider({ children }: CartProviderProps) {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const [lastSuccessModalTime, setLastSuccessModalTime] = useState<number>(0);

  // Check if we're in a Shopify environment
  const isShopifyEnvironment = () => {
    if (typeof window !== 'undefined') {
      const isShopify = window.parent !== window || 
             window.location.hostname.includes('myshopify.com') ||
             window.location.hostname.includes('shopify.com') ||
             document.querySelector('[data-shopify]') !== null;
      
      console.log('isShopifyEnvironment check:', {
        isIframe: window.parent !== window,
        hostname: window.location.hostname,
        hasShopifyData: document.querySelector('[data-shopify]') !== null,
        result: isShopify
      });
      
      return isShopify;
    }
    return false;
  };

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('shopify-cart');
    if (savedCart) {
      try {
        const cart = JSON.parse(savedCart);
        dispatch({ type: 'SET_CART', payload: cart });
      } catch (error) {
        console.error('Failed to load cart from localStorage:', error);
        localStorage.removeItem('shopify-cart');
      }
    }
  }, []);

  // Save cart to localStorage when it changes
  useEffect(() => {
    if (state.cart) {
      localStorage.setItem('shopify-cart', JSON.stringify(state.cart));
    } else {
      localStorage.removeItem('shopify-cart');
    }
  }, [state.cart]);

  // Listen for cart updates from Shopify integration
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('CartContext received message:', event.data);
      
      if (event.data.type === 'CART_UPDATE_SUCCESS' || event.data.type === 'CART_INITIAL_STATE') {
        const cartData = event.data.payload.cart;
        console.log('Processing cart data:', cartData);
        
        if (cartData && cartData.items && cartData.items.length > 0) {
          // Transform the cart data to match our expected format
          const transformedCart: Cart = {
            id: cartData.id || 'cart',
            checkoutUrl: cartData.checkout_url || '/cart',
            lines: cartData.items.map((item: any) => ({
              id: item.key || item.id,
              quantity: item.quantity,
              merchandise: {
                id: `gid://shopify/ProductVariant/${item.variant_id}`,
                title: item.product_title || item.title,
                price: {
                  amount: (item.final_price / 100).toString(),
                  currencyCode: 'EUR'
                },
                product: {
                  title: item.product_title || item.title,
                  images: item.image ? [{
                    url: item.image,
                    altText: item.product_title || item.title,
                  }] : [],
                },
              },
              attributes: item.properties ? Object.entries(item.properties).map(([key, value]) => ({
                key,
                value: value as string
              })) : [],
            })),
            cost: {
              subtotalAmount: {
                amount: (cartData.total_price / 100).toString(),
                currencyCode: 'EUR'
              },
              totalAmount: {
                amount: (cartData.total_price / 100).toString(),
                currencyCode: 'EUR'
              },
            },
          };

          console.log('Transformed cart:', transformedCart);
          dispatch({ type: 'SET_CART', payload: transformedCart });
          
          // Only show cart success modal for CART_UPDATE_SUCCESS (not CART_INITIAL_STATE)
          // and only if we have specific added products info
          if (event.data.type === 'CART_UPDATE_SUCCESS' && event.data.payload.addedProducts) {
            // Prevent multiple popups by checking if we've shown a modal recently
            const now = Date.now();
            if (now - lastSuccessModalTime > 2000) { // 2 second cooldown
              // Use the product info from the message if available
              const addedProducts = event.data.payload.addedProducts.map((product: any) => ({
                name: product.name || product.title || product.product_title || 'Product',
                image: product.image || '/placeholder-product.png',
                price: product.price || product.final_price || 0
              }));
              dispatch({ type: 'SHOW_CART_SUCCESS_MODAL', payload: addedProducts });
              setLastSuccessModalTime(now);
            } else {
              console.log('Skipping success modal - too soon since last one');
            }
          }
          // Remove the fallback that shows all cart items - we only want to show newly added products
        } else {
          // Handle empty cart
          console.log('Cart is empty, clearing cart state');
          dispatch({ type: 'CLEAR_CART' });
        }
      } else if (event.data.type === 'CART_DATA') {
        // Handle the CART_DATA format from Shopify's /cart.js API
        const cartData = event.data.payload.cart;
        
        if (cartData && cartData.items && cartData.items.length > 0) {
          // Transform the cart data to match our expected format
          const transformedCart: Cart = {
            id: cartData.token || 'cart',
            checkoutUrl: '/cart',
            lines: cartData.items.map((item: any) => ({
              id: item.key || item.id,
              quantity: item.quantity,
              merchandise: {
                id: `gid://shopify/ProductVariant/${item.variant_id}`,
                title: item.product_title || item.title,
                price: {
                  amount: (item.final_price / 100).toString(),
                  currencyCode: cartData.currency || 'EUR'
                },
                product: {
                  title: item.product_title || item.title,
                  images: item.image ? [{
                    url: item.image,
                    altText: item.product_title || item.title,
                  }] : [],
                },
              },
              attributes: item.properties ? Object.entries(item.properties).map(([key, value]) => ({
                key,
                value: value as string
              })) : [],
            })),
            cost: {
              subtotalAmount: {
                amount: (cartData.total_price / 100).toString(),
                currencyCode: cartData.currency || 'EUR'
              },
              totalAmount: {
                amount: (cartData.total_price / 100).toString(),
                currencyCode: cartData.currency || 'EUR'
              },
            },
          };

          dispatch({ type: 'SET_CART', payload: transformedCart });
        } else {
          // Handle empty cart
          console.log('Cart is empty, clearing cart state');
          dispatch({ type: 'CLEAR_CART' });
        }
      } else if (event.data.type === 'ROUTINE_ADD_SUCCESS') {
        // Handle routine added to cart
        const routineData = event.data.payload;
        console.log('Routine added to cart:', routineData);
        
        // Show cart success modal for the added routine products
        if (routineData && routineData.products) {
          // Prevent multiple popups by checking if we've shown a modal recently
          const now = Date.now();
          if (now - lastSuccessModalTime > 2000) { // 2 second cooldown
            const addedProducts = routineData.products.map((product: any) => ({
              name: product.name || product.title || product.product_title || 'Product',
              image: product.image || '/placeholder-product.png',
              price: product.price || product.final_price || 0
            }));
            dispatch({ type: 'SHOW_CART_SUCCESS_MODAL', payload: addedProducts });
            setLastSuccessModalTime(now);
          } else {
            console.log('Skipping routine success modal - too soon since last one');
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Request initial cart state from Shopify
  useEffect(() => {
    if (isShopifyEnvironment() && typeof window !== 'undefined') {
      console.log('Requesting initial cart state from Shopify');
      
      // Send message to parent to get cart state
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'SHOPIFY_GET_CART'
        }, '*');
      }
    }
  }, []); // Empty dependency array - only runs once on mount

  // Helper function to extract numeric ID from GraphQL ID
  const extractNumericId = (graphqlId: string): string => {
    if (!graphqlId) return '';
    // Extract the numeric part from gid://shopify/ProductVariant/123456789
    const match = graphqlId.match(/\/(\d+)$/);
    return match ? match[1] : graphqlId;
  };

  // Helper function to check if a product is in cart
  const isProductInCart = (variantId: string): boolean => {
    if (!state.cart) return false;
    const numericId = extractNumericId(variantId);
    return state.cart.lines.some(line => {
      const lineNumericId = extractNumericId(line.merchandise.id);
      return lineNumericId === numericId;
    });
  };

  // Helper function to get cart item line ID
  const getCartItemLineId = (variantId: string): string | null => {
    if (!state.cart) return null;
    const numericId = extractNumericId(variantId);
    const line = state.cart.lines.find(line => {
      const lineNumericId = extractNumericId(line.merchandise.id);
      return lineNumericId === numericId;
    });
    return line ? line.id : null;
  };

  // Helper function to refresh cart from server
  const refreshCart = async () => {
    if (!state.cart) return;
    
    try {
      // Cart will be updated via webhook - no need for manual refresh
      console.log('Cart refresh requested - webhook will handle this');
    } catch (error) {
      console.error('Failed to refresh cart:', error);
    }
  };

  const addToCart = async (variantId: string, quantity: number = 1, customAttributes?: Array<{key: string, value: string}>, productInfo?: {name: string; image: string; price: number}) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    dispatch({ type: 'SHOW_GLOBAL_LOADING' });

    try {
      // Add tracking attribute for recommended products
      const enhancedAttributes = [
        ...(customAttributes || []),
        {
          key: 'recommended_by_dermaself',
          value: 'true'
        }
      ];

      // If in Shopify environment, try to use native cart API first
      if (isShopifyEnvironment() && typeof window !== 'undefined') {
        // Try to communicate with parent Shopify page
        if (window.parent !== window) {
          window.parent.postMessage({
            type: 'SHOPIFY_ADD_TO_CART',
            payload: { 
              variantId,
              quantity,
              customAttributes: enhancedAttributes,
              tracking: 'recommended_by_dermaself'
            }
          }, '*');
          
          // Wait a bit for the parent to process
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Wait for cart update and icon refresh
          await waitForCartIconUpdate();
          
          // Try to get updated cart from parent
          window.parent.postMessage({
            type: 'SHOPIFY_GET_CART'
          }, '*');
          
          // Show success modal immediately for Shopify environments
          // Use provided product info if available, otherwise show generic message
          const now = Date.now();
          if (now - lastSuccessModalTime > 2000) { // 2 second cooldown
            const addedProduct = productInfo || {
              name: 'Product added to cart',
              image: '/placeholder-product.png',
              price: 0
            };
            dispatch({ type: 'SHOW_CART_SUCCESS_MODAL', payload: [addedProduct] });
            setLastSuccessModalTime(now);
          }
          return;
        }
        
        // If we're on the same domain, try to use Shopify's native cart
        // Note: Shopify's native cart API is limited, so we use message-based approach
        console.log('Using message-based approach for Shopify cart integration');
      }

      // Fallback to our API cart system
      let response;
      
      if (state.cart) {
        // Add to existing cart
        response = await fetch('/api/shopify/cart', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'add_to_cart',
            cartId: state.cart.id,
            variantId,
            quantity,
            customAttributes: enhancedAttributes,
          }),
        });
      } else {
        // Create new cart
        response = await fetch('/api/shopify/cart', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'create_cart',
            variantId,
            quantity,
            customAttributes: enhancedAttributes,
          }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Cart API error response:', errorData);
        throw new Error(errorData.details || errorData.error || 'Failed to add item to cart');
      }

      const data = await response.json();
      
      if (data.success && data.cart) {
        // Transform the cart data to match our expected format
        const transformedCart: Cart = {
          id: data.cart.id,
          checkoutUrl: data.cart.checkoutUrl,
          lines: data.cart.lines.edges.map((edge: any) => ({
            id: edge.node.id,
            quantity: edge.node.quantity,
            merchandise: {
              id: edge.node.merchandise.id,
              title: edge.node.merchandise.title,
              price: edge.node.merchandise.price,
              product: {
                title: edge.node.merchandise.product.title,
                images: edge.node.merchandise.product.images.edges.map((imgEdge: any) => ({
                  url: imgEdge.node.url,
                  altText: imgEdge.node.altText,
                })),
              },
            },
            attributes: edge.node.attributes || [],
          })),
          cost: data.cart.cost,
        };

        dispatch({ type: 'SET_CART', payload: transformedCart });
        
        // Show success modal with the added product info (for all environments)
        // Use provided product info if available, otherwise extract from cart data
        const now = Date.now();
        if (now - lastSuccessModalTime > 2000) { // 2 second cooldown
          const addedProduct = productInfo || {
            name: data.cart.lines.edges[data.cart.lines.edges.length - 1]?.node.merchandise.product.title || 'Product added to cart',
            image: data.cart.lines.edges[data.cart.lines.edges.length - 1]?.node.merchandise.product.images.edges[0]?.node.url || '/placeholder-product.png',
            price: parseFloat(data.cart.lines.edges[data.cart.lines.edges.length - 1]?.node.merchandise.price.amount || '0') * 100
          };
          dispatch({ type: 'SHOW_CART_SUCCESS_MODAL', payload: [addedProduct] });
          setLastSuccessModalTime(now);
        }
      } else {
        throw new Error('Failed to add item to cart');
      }
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to add item to cart' 
      });
    } finally {
      // Wait a bit longer to ensure cart icon updates are complete
      setTimeout(() => {
        dispatch({ type: 'SET_LOADING', payload: false });
        dispatch({ type: 'HIDE_GLOBAL_LOADING' });
      }, 1500);
    }
  };

  const updateCartItem = async (lineId: string, quantity: number) => {
    if (!state.cart) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    dispatch({ type: 'SHOW_GLOBAL_LOADING' });

    try {
      const response = await fetch('/api/shopify/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_cart_item',
          cartId: state.cart.id,
          lineId,
          quantity,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Cart API error response:', errorData);
        throw new Error(errorData.details || errorData.error || 'Failed to update cart item');
      }

      const data = await response.json();
      
      if (data.success && data.cart) {
        const transformedCart: Cart = {
          id: data.cart.id,
          checkoutUrl: data.cart.checkoutUrl,
          lines: data.cart.lines.edges.map((edge: any) => ({
            id: edge.node.id,
            quantity: edge.node.quantity,
            merchandise: {
              id: edge.node.merchandise.id,
              title: edge.node.merchandise.title,
              price: edge.node.merchandise.price,
              product: {
                title: edge.node.merchandise.product.title,
                images: edge.node.merchandise.product.images.edges.map((imgEdge: any) => ({
                  url: imgEdge.node.url,
                  altText: imgEdge.node.altText,
                })),
              },
            },
            attributes: edge.node.attributes || [],
          })),
          cost: data.cart.cost,
        };

        dispatch({ type: 'SET_CART', payload: transformedCart });
      } else {
        throw new Error('Failed to update cart item');
      }
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to update cart item' 
      });
    } finally {
      // Wait a bit longer to ensure cart icon updates are complete
      setTimeout(() => {
        dispatch({ type: 'SET_LOADING', payload: false });
        dispatch({ type: 'HIDE_GLOBAL_LOADING' });
      }, 1500);
    }
  };

  const removeFromCart = async (lineId: string) => {
    console.log('removeFromCart called with lineId:', lineId);
    if (!state.cart) {
      console.log('No cart state available');
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    dispatch({ type: 'SHOW_GLOBAL_LOADING' });

    try {
      // If in Shopify environment, try to use native cart API first
      if (isShopifyEnvironment() && typeof window !== 'undefined') {
        console.log('In Shopify environment, attempting to remove via Shopify cart sync');
        
        // Find the variant ID from the line ID
        const line = state.cart.lines.find(l => l.id === lineId);
        console.log('Found line:', line);
        
        if (line) {
          const variantId = line.merchandise.id;
          console.log('Extracted variantId:', variantId);
          
          // Try to communicate with parent Shopify page
          if (window.parent !== window) {
            console.log('Sending SHOPIFY_REMOVE_FROM_CART message to parent');
            window.parent.postMessage({
              type: 'SHOPIFY_REMOVE_FROM_CART',
              payload: { 
                variantId
              }
            }, '*');
            
            // Wait for cart update and icon refresh
            await waitForCartIconUpdate();
            
            // Try to get updated cart from parent
            console.log('Requesting updated cart from parent');
            window.parent.postMessage({
              type: 'SHOPIFY_GET_CART'
            }, '*');
            
            return;
          }
          
          // If we're on the same domain, try to use Shopify's native cart
          console.log('Native Shopify cart removeItem not available, using message-based approach');
        }
      }

      // Fallback to our API cart system
      const response = await fetch('/api/shopify/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'remove_from_cart',
          cartId: state.cart.id,
          lineId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Cart API error response:', errorData);
        throw new Error(errorData.details || errorData.error || 'Failed to remove item from cart');
      }

      const data = await response.json();
      
      if (data.success && data.cart) {
        const transformedCart: Cart = {
          id: data.cart.id,
          checkoutUrl: data.cart.checkoutUrl,
          lines: data.cart.lines.edges.map((edge: any) => ({
            id: edge.node.id,
            quantity: edge.node.quantity,
            merchandise: {
              id: edge.node.merchandise.id,
              title: edge.node.merchandise.title,
              price: edge.node.merchandise.price,
              product: {
                title: edge.node.merchandise.product.title,
                images: edge.node.merchandise.product.images.edges.map((imgEdge: any) => ({
                  url: imgEdge.node.url,
                  altText: imgEdge.node.altText,
                })),
              },
            },
            attributes: edge.node.attributes || [],
          })),
          cost: data.cart.cost,
        };

        dispatch({ type: 'SET_CART', payload: transformedCart });
      } else {
        throw new Error('Failed to remove item from cart');
      }
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to remove item from cart' 
      });
    } finally {
      // Wait a bit longer to ensure cart icon updates are complete
      setTimeout(() => {
        dispatch({ type: 'SET_LOADING', payload: false });
        dispatch({ type: 'HIDE_GLOBAL_LOADING' });
      }, 1500);
    }
  };

  // Helper function to wait for cart icon updates
  const waitForCartIconUpdate = async (): Promise<void> => {
    return new Promise((resolve) => {
      // Wait for cart icon to update (usually takes 1-2 seconds)
      setTimeout(resolve, 2000);
      
      // Also listen for cart update events
      const handleCartUpdate = () => {
        console.log('Cart update detected, resolving wait');
        resolve();
      };
      
      // Listen for various cart update events
      document.addEventListener('cart:updated', handleCartUpdate, { once: true });
      document.addEventListener('cart:refresh', handleCartUpdate, { once: true });
      document.addEventListener('cart-ui-updated', handleCartUpdate, { once: true });
      
      // Cleanup after 3 seconds
      setTimeout(() => {
        document.removeEventListener('cart:updated', handleCartUpdate);
        document.removeEventListener('cart:refresh', handleCartUpdate);
        document.removeEventListener('cart-ui-updated', handleCartUpdate);
        resolve();
      }, 3000);
    });
  };

  const getCart = async (cartId: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const response = await fetch('/api/shopify/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'get_cart',
          cartId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Cart API error response:', errorData);
        throw new Error(errorData.details || errorData.error || 'Failed to get cart');
      }

      const data = await response.json();
      
      if (data.success && data.cart) {
        const transformedCart: Cart = {
          id: data.cart.id,
          checkoutUrl: data.cart.checkoutUrl,
          lines: data.cart.lines.edges.map((edge: any) => ({
            id: edge.node.id,
            quantity: edge.node.quantity,
            merchandise: {
              id: edge.node.merchandise.id,
              title: edge.node.merchandise.title,
              price: edge.node.merchandise.price,
              product: {
                title: edge.node.merchandise.product.title,
                images: edge.node.merchandise.product.images.edges.map((imgEdge: any) => ({
                  url: imgEdge.node.url,
                  altText: imgEdge.node.altText,
                })),
              },
            },
            attributes: edge.node.attributes || [],
          })),
          cost: data.cart.cost,
        };

        dispatch({ type: 'SET_CART', payload: transformedCart });
      } else {
        throw new Error('Failed to get cart');
      }
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to get cart' 
      });
    }
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const showCartSuccessModal = (products: Array<{name: string; image: string; price: number}>) => {
    dispatch({ type: 'SHOW_CART_SUCCESS_MODAL', payload: products });
  };

  const hideCartSuccessModal = () => {
    dispatch({ type: 'HIDE_CART_SUCCESS_MODAL' });
  };

  const proceedToCheckout = async () => {
    // Hide the modal first
    dispatch({ type: 'HIDE_CART_SUCCESS_MODAL' });
    
    // Set loading state for checkout
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      // If in Shopify environment, try to use native checkout
      if (isShopifyEnvironment() && typeof window !== 'undefined') {
        // Try to communicate with parent Shopify page first
        if (window.parent !== window) {
          console.log('Sending checkout request to parent Shopify page');
          window.parent.postMessage({
            type: 'SHOPIFY_PROCEED_TO_CHECKOUT'
          }, '*');
          
          // Wait a bit for the parent to process
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Fallback: try to navigate directly if parent doesn't respond
          setTimeout(() => {
            console.log('Fallback: navigating to checkout directly');
            navigateToCheckout();
          }, 1000);
          
          return;
        }
        
        // If we're on the same domain, try to use Shopify's native checkout
        console.log('Using native Shopify checkout');
        navigateToCheckout();
        return;
      }
      
      // For non-Shopify environments, use the checkout URL from cart
      if (state.cart && state.cart.checkoutUrl) {
        console.log('Navigating to checkout URL:', state.cart.checkoutUrl);
        if (typeof window !== 'undefined') {
          window.location.href = state.cart.checkoutUrl;
        }
      } else {
        console.error('No checkout URL available');
        // Try to get checkout URL from Shopify's cart API
        await getCheckoutUrlFromShopify();
      }
    } catch (error) {
      console.error('Error proceeding to checkout:', error);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to proceed to checkout' 
      });
      // Fallback to basic navigation
      navigateToCheckout();
    } finally {
      // Reset loading state after a short delay to allow navigation to complete
      setTimeout(() => {
        dispatch({ type: 'SET_LOADING', payload: false });
      }, 1000);
    }
  };

  // Helper function to navigate to checkout using various methods
  const navigateToCheckout = () => {
    if (typeof window === 'undefined') return;
    
    // Method 1: Try to use Shopify's native checkout if available
    if (window.Shopify && window.Shopify.checkout) {
      console.log('Using Shopify.checkout');
      window.Shopify.checkout();
      return;
    }
    
    // Method 2: Try to find and click a checkout button
    const checkoutButtons = document.querySelectorAll('[data-checkout], .checkout-button, #checkout, [href*="checkout"]');
    if (checkoutButtons.length > 0) {
      console.log('Clicking checkout button');
      (checkoutButtons[0] as HTMLElement).click();
      return;
    }
    
    // Method 3: Navigate to /checkout directly
    console.log('Navigating to /checkout directly');
    window.location.href = '/checkout';
  };

  // Helper function to get checkout URL from Shopify's cart API
  const getCheckoutUrlFromShopify = async () => {
    try {
      console.log('Getting checkout URL from Shopify cart API');
      const response = await fetch('/cart.js');
      const cart = await response.json();
      
      if (cart.token) {
        const checkoutUrl = `/checkout?token=${cart.token}`;
        console.log('Generated checkout URL:', checkoutUrl);
        if (typeof window !== 'undefined') {
          window.location.href = checkoutUrl;
        }
      } else {
        console.error('No cart token available');
        // Final fallback
        navigateToCheckout();
      }
    } catch (error) {
      console.error('Error getting checkout URL from Shopify:', error);
      // Final fallback
      navigateToCheckout();
    }
  };

  const showGlobalLoading = () => {
    dispatch({ type: 'SHOW_GLOBAL_LOADING' });
  };

  const hideGlobalLoading = () => {
    dispatch({ type: 'HIDE_GLOBAL_LOADING' });
  };

  const value: CartContextType = {
    state,
    addToCart,
    updateCartItem,
    removeFromCart,
    getCart,
    clearCart,
    isProductInCart,
    getCartItemLineId,
    refreshCart,
    showCartSuccessModal,
    hideCartSuccessModal,
    proceedToCheckout,
    showGlobalLoading,
    hideGlobalLoading,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
      
      {/* Global Loading Overlay */}
      {state.showGlobalLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <div>
                <p className="text-lg font-semibold text-gray-900">Updating Cart...</p>
                <p className="text-sm text-gray-600">Please wait while we update your cart</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </CartContext.Provider>
  );
}

// Hook to use cart context
export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
} 