'use client';

// Disable static prerender to avoid browser-only code errors during build
export const dynamic = 'force-dynamic';

import ShopifyEmbed from '@/components/ShopifyEmbed';

export default function EmbedPage() {
  return <ShopifyEmbed />;
} 