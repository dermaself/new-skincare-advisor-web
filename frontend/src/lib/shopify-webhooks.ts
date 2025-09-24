// Shopify Webhook Registration Utility

interface WebhookRegistration {
  shopDomain: string;
  accessToken: string;
  webhookUrl: string;
  webhookSecret: string;
}

export async function registerCartWebhook({
  shopDomain,
  accessToken,
  webhookUrl,
  webhookSecret
}: WebhookRegistration) {
  try {
    // Register cart/update webhook
    const webhookData = {
      webhook: {
        topic: 'carts/update',
        address: webhookUrl,
        format: 'json'
      }
    };

    const response = await fetch(`https://${shopDomain}/admin/api/2024-01/webhooks.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken
      },
      body: JSON.stringify(webhookData)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to register webhook: ${error}`);
    }

    const result = await response.json();
    console.log(`Webhook registered for ${shopDomain}:`, result.webhook);

    return result.webhook;
  } catch (error) {
    console.error('Error registering webhook:', error);
    throw error;
  }
}

export async function listWebhooks(shopDomain: string, accessToken: string) {
  try {
    const response = await fetch(`https://${shopDomain}/admin/api/2024-01/webhooks.json`, {
      headers: {
        'X-Shopify-Access-Token': accessToken
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to list webhooks: ${response.statusText}`);
    }

    const result = await response.json();
    return result.webhooks;
  } catch (error) {
    console.error('Error listing webhooks:', error);
    throw error;
  }
}

export async function deleteWebhook(shopDomain: string, accessToken: string, webhookId: number) {
  try {
    const response = await fetch(`https://${shopDomain}/admin/api/2024-01/webhooks/${webhookId}.json`, {
      method: 'DELETE',
      headers: {
        'X-Shopify-Access-Token': accessToken
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to delete webhook: ${response.statusText}`);
    }

    console.log(`Webhook ${webhookId} deleted for ${shopDomain}`);
    return true;
  } catch (error) {
    console.error('Error deleting webhook:', error);
    throw error;
  }
}

// Verify webhook signature
export function verifyWebhookSignature(
  body: string,
  hmacHeader: string,
  webhookSecret: string
): boolean {
  // Import crypto at the top of the file instead
  const crypto = (typeof window === 'undefined') ? eval('require')('crypto') : null;
  
  if (!crypto) {
    console.error('Crypto module not available');
    return false;
  }
  
  const expectedHmac = crypto
    .createHmac('sha256', webhookSecret)
    .update(body, 'utf8')
    .digest('base64');

  return hmacHeader === expectedHmac;
} 