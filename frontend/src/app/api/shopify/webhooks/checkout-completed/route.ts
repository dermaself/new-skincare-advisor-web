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

    const checkoutData = JSON.parse(body);
    
    // Extract store domain from webhook
    const shopDomain = request.headers.get('x-shopify-shop-domain');
    
    if (!shopDomain) {
      console.error('Missing shop domain in webhook');
      return NextResponse.json({ error: 'Missing shop domain' }, { status: 400 });
    }

    // Process checkout completion
    await processCheckoutCompletion(shopDomain, checkoutData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function processCheckoutCompletion(shopDomain: string, checkoutData: any) {
  try {
    console.log(`Processing checkout completion for ${shopDomain}:`, {
      orderId: checkoutData.id,
      orderNumber: checkoutData.order_number,
      totalPrice: checkoutData.total_price,
      currency: checkoutData.currency,
      lineItemsCount: checkoutData.line_items?.length || 0
    });

    // Extract recommended products from line items
    const recommendedProducts = checkoutData.line_items?.filter((item: any) => {
      // Check if the item has the recommended_by_dermaself attribute
      return item.properties && 
             item.properties.some((prop: any) => 
               prop.name === 'recommended_by_dermaself' && prop.value === 'true'
             );
    }) || [];

    if (recommendedProducts.length > 0) {
      console.log(`Found ${recommendedProducts.length} recommended products in checkout:`, {
        orderId: checkoutData.id,
        recommendedProducts: recommendedProducts.map((item: any) => ({
          productId: item.product_id,
          variantId: item.variant_id,
          title: item.title,
          quantity: item.quantity,
          price: item.price
        }))
      });

      // Store the tracking data
      await storeRecommendedProductTracking(shopDomain, checkoutData, recommendedProducts);
    } else {
      console.log('No recommended products found in this checkout');
    }

  } catch (error) {
    console.error('Error processing checkout completion:', error);
  }
}

async function storeRecommendedProductTracking(shopDomain: string, checkoutData: any, recommendedProducts: any[]) {
  try {
    // Store tracking data in your preferred storage (database, analytics service, etc.)
    const trackingData = {
      shopDomain,
      orderId: checkoutData.id,
      orderNumber: checkoutData.order_number,
      customerId: checkoutData.customer?.id,
      customerEmail: checkoutData.email,
      totalPrice: checkoutData.total_price,
      currency: checkoutData.currency,
      recommendedProducts: recommendedProducts.map((item: any) => ({
        productId: item.product_id,
        variantId: item.variant_id,
        title: item.title,
        quantity: item.quantity,
        price: item.price,
        properties: item.properties
      })),
      completedAt: new Date().toISOString(),
      source: 'dermaself_recommendation'
    };

    // For now, we'll log the tracking data
    // In production, you would store this in a database or analytics service
    console.log('Storing recommended product tracking data:', trackingData);

    // Example: Send to analytics service
    // await fetch('https://your-analytics-service.com/track', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(trackingData)
    // });

  } catch (error) {
    console.error('Error storing recommended product tracking:', error);
  }
} 