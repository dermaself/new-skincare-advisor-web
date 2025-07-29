import { NextRequest, NextResponse } from 'next/server';

const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN;
const SHOPIFY_STOREFRONT_ACCESS_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    const envCheck = {
      SHOPIFY_DOMAIN: SHOPIFY_DOMAIN ? 'Set' : 'Missing',
      SHOPIFY_STOREFRONT_ACCESS_TOKEN: SHOPIFY_STOREFRONT_ACCESS_TOKEN ? 'Set' : 'Missing',
      hasDomain: !!SHOPIFY_DOMAIN,
      hasToken: !!SHOPIFY_STOREFRONT_ACCESS_TOKEN,
    };

    if (!SHOPIFY_DOMAIN || !SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
      return NextResponse.json({
        success: false,
        error: 'Missing Shopify Storefront credentials',
        envCheck
      });
    }

    // Test Shopify API connection
    const testQuery = `
      query {
        shop {
          name
          primaryDomain {
            url
          }
        }
      }
    `;

    const response = await fetch(`https://${SHOPIFY_DOMAIN}/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: testQuery }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({
        success: false,
        error: `Shopify API connection failed: ${response.status} ${response.statusText}`,
        details: errorText,
        envCheck
      });
    }

    const data = await response.json();
    
    if (data.errors) {
      return NextResponse.json({
        success: false,
        error: 'GraphQL errors occurred',
        details: data.errors,
        envCheck
      });
    }

    return NextResponse.json({
      success: true,
      shop: data.data.shop,
      envCheck
    });

  } catch (error) {
    console.error('Cart test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to test cart configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 