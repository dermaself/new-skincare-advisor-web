import { NextRequest, NextResponse } from 'next/server';
import { registerCartWebhook, listWebhooks } from '../../../../lib/shopify-webhooks';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shopDomain, accessToken } = body;

    if (!shopDomain || !accessToken) {
      return NextResponse.json(
        { error: 'Shop domain and access token are required' },
        { status: 400 }
      );
    }

    // Generate webhook secret
    const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET || 
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // Webhook URL for your app
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/shopify/webhooks/cart-updated`;

    // Check if webhook already exists
    const existingWebhooks = await listWebhooks(shopDomain, accessToken);
    const cartWebhook = existingWebhooks.find((webhook: any) => 
      webhook.topic === 'carts/update' && webhook.address === webhookUrl
    );

    if (cartWebhook) {
      return NextResponse.json({
        success: true,
        message: 'Webhook already exists',
        webhook: cartWebhook
      });
    }

    // Register new webhook
    const webhook = await registerCartWebhook({
      shopDomain,
      accessToken,
      webhookUrl,
      webhookSecret
    });

    return NextResponse.json({
      success: true,
      message: 'Webhook registered successfully',
      webhook
    });
  } catch (error) {
    console.error('Error setting up webhooks:', error);
    return NextResponse.json(
      { error: 'Failed to setup webhooks' },
      { status: 500 }
    );
  }
} 