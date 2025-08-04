'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';

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
}

type CartAction =
  | { type: 'SET_CART'; payload: Cart }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_CART' };

// Initial state
const initialState: CartState = {
  cart: null,
  loading: false,
  error: null,
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
    default:
      return state;
  }
}

// Context
interface CartContextType {
  state: CartState;
  addToCart: (variantId: string, quantity?: number, customAttributes?: Array<{key: string, value: string}>) => Promise<void>;
  updateCartItem: (lineId: string, quantity: number) => Promise<void>;
  removeFromCart: (lineId: string) => Promise<void>;
  getCart: (cartId: string) => Promise<void>;
  clearCart: () => void;
  isProductInCart: (variantId: string) => boolean;
  getCartItemLineId: (variantId: string) => string | null;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Provider component
interface CartProviderProps {
  children: ReactNode;
}

export function CartProvider({ children }: CartProviderProps) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

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
        
        if (cartData && cartData.items) {
          // Transform the cart data to match our expected format
          const transformedCart: Cart = {
            id: cartData.id || 'cart',
            checkoutUrl: '/cart',
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
        }
      } else if (event.data.type === 'CART_DATA') {
        // Handle the original CART_DATA format as well
        const cartData = event.data.payload;
        
        // Transform the cart data to match our expected format
        const transformedCart: Cart = {
          id: cartData.id,
          checkoutUrl: cartData.checkoutUrl,
          lines: cartData.lines.edges.map((edge: any) => ({
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
          cost: cartData.cost,
        };

        dispatch({ type: 'SET_CART', payload: transformedCart });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Request initial cart state and set up periodic refresh
  useEffect(() => {
    // Request initial cart state from Shopify
    if (isShopifyEnvironment() && typeof window !== 'undefined') {
      console.log('Requesting initial cart state from Shopify');
      
      // Send message to parent to get cart state
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'SHOPIFY_GET_CART'
        }, '*');
      }
    }

    // Periodic cart refresh to stay synchronized with Shopify
    if (!state.cart) return;

    const refreshInterval = setInterval(async () => {
      try {
        await refreshCart();
      } catch (error) {
        console.error('Failed to refresh cart:', error);
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(refreshInterval);
  }, [state.cart]);

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

  const addToCart = async (variantId: string, quantity: number = 1, customAttributes?: Array<{key: string, value: string}>) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      // If in Shopify environment, try to use native cart API first
      if (isShopifyEnvironment() && typeof window !== 'undefined') {
        // Try to communicate with parent Shopify page
        if (window.parent !== window) {
          window.parent.postMessage({
            type: 'SHOPIFY_ADD_TO_CART',
            payload: { 
              variantId,
              quantity,
              customAttributes
            }
          }, '*');
          
          // Wait a bit for the parent to process
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Try to get updated cart from parent
          window.parent.postMessage({
            type: 'SHOPIFY_GET_CART'
          }, '*');
          
          dispatch({ type: 'SET_LOADING', payload: false });
          return;
        }
        
        // If we're on the same domain, try to use Shopify's native cart
        if (typeof window !== 'undefined' && window.Shopify?.cart?.addItem) {
          try {
            await window.Shopify.cart.addItem(variantId, quantity);
            dispatch({ type: 'SET_LOADING', payload: false });
            return;
          } catch (error) {
            console.warn('Native Shopify cart failed, falling back to API:', error);
          }
        }
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
            customAttributes,
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
            customAttributes,
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
      } else {
        throw new Error('Failed to add item to cart');
      }
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to add item to cart' 
      });
    }
  };

  const updateCartItem = async (lineId: string, quantity: number) => {
    if (!state.cart) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

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
            
            // Wait a bit for the parent to process
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Try to get updated cart from parent
            console.log('Requesting updated cart from parent');
            window.parent.postMessage({
              type: 'SHOPIFY_GET_CART'
            }, '*');
            
            dispatch({ type: 'SET_LOADING', payload: false });
            return;
          }
          
          // If we're on the same domain, try to use Shopify's native cart
          if (typeof window !== 'undefined' && window.Shopify?.cart?.removeItem) {
            try {
              await window.Shopify.cart.removeItem(lineId);
              dispatch({ type: 'SET_LOADING', payload: false });
              return;
            } catch (error) {
              console.warn('Native Shopify cart failed, falling back to API:', error);
            }
          }
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
      dispatch({ type: 'SET_LOADING', payload: false });
    }
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
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// Hook to use cart context
export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
} 