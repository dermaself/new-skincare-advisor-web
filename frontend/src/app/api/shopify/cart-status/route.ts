import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shopDomain = searchParams.get('shop');
    
    if (!shopDomain) {
      return NextResponse.json(
        { error: 'Shop domain is required' },
        { status: 400 }
      );
    }

    // Get cart status from cache
    const cartStatus = await getCartStatus(shopDomain);
    
    if (!cartStatus) {
      return NextResponse.json(
        { error: 'Cart status not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      cart: cartStatus
    });
  } catch (error) {
    console.error('Error fetching cart status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cart status' },
      { status: 500 }
    );
  }
}

async function getCartStatus(shopDomain: string) {
  // Get from cache (replace with your preferred caching solution)
  if (typeof global !== 'undefined' && global.cartCache) {
    const cacheKey = `cart:${shopDomain}`;
    return global.cartCache.get(cacheKey);
  }
  
  return null;
} 