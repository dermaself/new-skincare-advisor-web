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
  }
}

export {}; 