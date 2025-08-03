// Global type declarations for Shopify integration

declare global {
  interface Window {
    Shopify?: {
      cart?: {
        addItem: (variantId: string, quantity: number) => Promise<void>;
        item_count?: number;
        total_price?: number;
      };
      shop?: string;
      currency?: {
        active?: string;
      };
      customer?: any;
      formatMoney?: (amount: number) => string;
      onCartUpdate?: (cart: any) => void;
    };
    SHOPIFY_INTEGRATION_DEBUG?: boolean;
    updateCartDisplay?: (force?: boolean) => Promise<void>;
    debugCartElements?: () => void;
  }

  // Global cache types for webhook-based cart updates
  var cartCache: Map<string, any> | undefined;
  var pendingCartUpdates: Map<string, any> | undefined;
}

export {}; 