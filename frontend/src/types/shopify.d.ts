// TypeScript declarations for Shopify integration

declare global {
  interface Window {
    Shopify?: {
      cart?: {
        addItem?: (variantId: string, quantity: number) => Promise<void>;
        removeItem?: (lineId: string) => Promise<void>;
        item_count?: number;
        total_price?: number;
      };
    };
  }
}

export {}; 