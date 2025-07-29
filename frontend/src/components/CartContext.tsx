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
  addToCart: (variantId: string, quantity?: number) => Promise<void>;
  updateCartItem: (lineId: string, quantity: number) => Promise<void>;
  removeFromCart: (lineId: string) => Promise<void>;
  getCart: (cartId: string) => Promise<void>;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Provider component
interface CartProviderProps {
  children: ReactNode;
}

export function CartProvider({ children }: CartProviderProps) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

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

  const addToCart = async (variantId: string, quantity: number = 1) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
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