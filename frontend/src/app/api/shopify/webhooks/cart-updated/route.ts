import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const hmacHeader = request.headers.get('x-shopify-hmac-sha256');
    
    // Verify webhook signature
    if (!SHOPIFY_WEBHOOK_SECRET || !hmacHeader) {
      console.error('Missing webhook secret or HMAC header');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const expectedHmac = crypto
      .createHmac('sha256', SHOPIFY_WEBHOOK_SECRET)
      .update(body, 'utf8')
      .digest('base64');

    if (hmacHeader !== expectedHmac) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const cartData = JSON.parse(body);
    
    // Extract store domain from webhook
    const shopDomain = request.headers.get('x-shopify-shop-domain');
    
    if (!shopDomain) {
      console.error('Missing shop domain in webhook');
      return NextResponse.json({ error: 'Missing shop domain' }, { status: 400 });
    }

    // Process cart update
    await processCartUpdate(shopDomain, cartData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function processCartUpdate(shopDomain: string, cartData: any) {
  try {
    // Store cart update in cache/database for real-time access
    const cartUpdate = {
      shopDomain,
      cartId: cartData.id,
      itemCount: cartData.item_count,
      totalPrice: cartData.total_price,
      currency: cartData.currency,
      items: cartData.items,
      timestamp: new Date().toISOString(),
      token: cartData.token
    };

    // Store in cache (you can use Redis, database, or in-memory cache)
    await storeCartUpdate(shopDomain, cartUpdate);

    // Broadcast to connected clients (if using WebSockets)
    await broadcastCartUpdate(shopDomain, cartUpdate);

    console.log(`Cart updated for ${shopDomain}:`, {
      itemCount: cartData.item_count,
      totalPrice: cartData.total_price
    });
  } catch (error) {
    console.error('Error processing cart update:', error);
  }
}

async function storeCartUpdate(shopDomain: string, cartUpdate: any) {
  // Implementation depends on your caching strategy
  // For now, we'll use a simple in-memory cache
  // In production, use Redis or a database
  
  const cacheKey = `cart:${shopDomain}`;
  
  // Store in global cache (replace with your preferred caching solution)
  if (typeof global !== 'undefined') {
    global.cartCache = global.cartCache || new Map();
    global.cartCache.set(cacheKey, cartUpdate);
  }
}

async function broadcastCartUpdate(shopDomain: string, cartUpdate: any) {
  // Store the update in cache for immediate access
  await storeCartUpdate(shopDomain, cartUpdate);
  
  // Broadcast to connected clients via Server-Sent Events
  // This will trigger immediate updates without polling
  await broadcastToConnectedClients(shopDomain, cartUpdate);
  
  console.log(`Broadcasting cart update for ${shopDomain}`);
}

async function broadcastToConnectedClients(shopDomain: string, cartUpdate: any) {
  // Implementation for real-time broadcasting
  // This could be WebSockets, Server-Sent Events, or push notifications
  
  // For now, we'll use a simple approach with stored events
  // In production, implement proper real-time communication
  
  if (typeof global !== 'undefined') {
    global.pendingCartUpdates = global.pendingCartUpdates || new Map();
    global.pendingCartUpdates.set(shopDomain, {
      ...cartUpdate,
      timestamp: Date.now()
    });
  }
} 