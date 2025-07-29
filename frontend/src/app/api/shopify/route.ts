import { NextRequest, NextResponse } from 'next/server';

const SHOPIFY_ACCESS_TOKEN = process.env.NEXT_PUBLIC_SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_DOMAIN = process.env.NEXT_PUBLIC_SHOPIFY_DOMAIN;

export async function GET(request: NextRequest) {
  try {
    // Debug logging
    console.log('🔍 Debug Info:');
    console.log('SHOPIFY_DOMAIN:', SHOPIFY_DOMAIN);
    console.log('SHOPIFY_ACCESS_TOKEN exists:', !!SHOPIFY_ACCESS_TOKEN);
    console.log('SHOPIFY_ACCESS_TOKEN starts with shpat_:', SHOPIFY_ACCESS_TOKEN?.startsWith('shpat_'));
    
    if (!SHOPIFY_ACCESS_TOKEN || !SHOPIFY_DOMAIN) {
      console.log('❌ Missing credentials');
      return NextResponse.json(
        { error: 'Missing Shopify credentials' },
        { status: 500 }
      );
    }

    // Use Admin API with access token
    const url = `https://${SHOPIFY_DOMAIN}/admin/api/2024-01/products.json`;
    console.log('🌐 Making request to:', url);
    
    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Error response body:', errorText);
      throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Success! Products found:', data.products?.length || 0);
    
    return NextResponse.json({
      success: true,
      products: data.products,
      total: data.products?.length || 0
    });

  } catch (error) {
    console.error('Shopify API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch products',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, productId, variantId, quantity } = body;

    if (!SHOPIFY_ACCESS_TOKEN || !SHOPIFY_DOMAIN) {
      return NextResponse.json(
        { error: 'Missing Shopify credentials' },
        { status: 500 }
      );
    }

    switch (action) {
      case 'add_to_cart':
        // Note: Adding to cart typically requires Storefront API or custom implementation
        // This is a simplified example
        return NextResponse.json({
          success: true,
          message: 'Product would be added to cart',
          productId,
          quantity
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Shopify API error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
} 