import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    SHOPIFY_DOMAIN: process.env.SHOPIFY_DOMAIN || 'NOT_SET',
    SHOPIFY_ACCESS_TOKEN: process.env.SHOPIFY_ACCESS_TOKEN ? 
      `${process.env.SHOPIFY_ACCESS_TOKEN.substring(0, 10)}...` : 'NOT_SET',
    SHOPIFY_ACCESS_TOKEN_STARTS_WITH_SHPAT: process.env.SHOPIFY_ACCESS_TOKEN?.startsWith('shpat_') || false,
    ALL_ENV_KEYS: Object.keys(process.env).filter(key => key.includes('SHOPIFY'))
  });
} 