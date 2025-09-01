export function normalizeShopifyDomain(input: string): string {
  try {
    const url = input.includes('://') ? new URL(input) : new URL(`https://${input}`);
    return url.hostname;
  } catch {
    return input.replace(/^https?:\/\//, '').split('/')[0];
  }
}

/**
 * Returns the Shopify shop domain (e.g., "your-store.myshopify.com").
 * Prefers parent window when embedded, otherwise current hostname, then environment variable.
 */
export function getShopifyDomain(): string | undefined {
  // Browser-first detection
  if (typeof window !== 'undefined') {
    // If embedded, try to read from parent window
    if (window.parent !== window) {
      try {
        return normalizeShopifyDomain(window.parent.location.origin);
      } catch {
        // Cross-origin; fall back below
      }
    }

    // If running on a myshopify domain directly
    if (window.location.hostname.includes('myshopify.com')) {
      return window.location.hostname;
    }
  }

  // Fallback to environment variable
  if (process.env.NEXT_PUBLIC_SHOPIFY_DOMAIN) {
    return normalizeShopifyDomain(process.env.NEXT_PUBLIC_SHOPIFY_DOMAIN);
  }

  return undefined;
}


