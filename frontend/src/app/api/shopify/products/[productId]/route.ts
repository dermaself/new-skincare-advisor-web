import { NextRequest, NextResponse } from 'next/server';

const SHOPIFY_DOMAIN = process.env.NEXT_PUBLIC_SHOPIFY_DOMAIN;
const SHOPIFY_STOREFRONT_ACCESS_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

export async function GET(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const { productId } = params;

    if (!SHOPIFY_DOMAIN || !SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
      console.error('Missing Shopify credentials in API route');
      return NextResponse.json(
        { error: 'Missing Shopify credentials' },
        { status: 500 }
      );
    }

    // Handle different product ID formats
    let graphqlProductId: string;
    
    if (productId.startsWith('gid://')) {
      // Already in GraphQL format
      graphqlProductId = productId;
    } else {
      // Convert numeric ID to GraphQL format
      // Remove any non-numeric characters and ensure it's a valid number
      const numericId = productId.toString().replace(/[^\d]/g, '');
      if (!numericId || isNaN(Number(numericId))) {
        console.error('Invalid product ID format:', productId);
        return NextResponse.json(
          { error: 'Invalid product ID format' },
          { status: 400 }
        );
      }
      graphqlProductId = `gid://shopify/Product/${numericId}`;
    }

    console.log('🛍️ Fetching product for ID:', graphqlProductId, 'from original:', productId);

    const query = `
      query getProduct($productId: ID!) {
        product(id: $productId) {
          id
          title
          vendor
          description
          productType
          tags
          images(first: 5) {
            edges {
              node {
                url
                altText
              }
            }
          }
          variants(first: 10) {
            edges {
              node {
                id
                title
                price {
                  amount
                  currencyCode
                }
                availableForSale
              }
            }
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
      body: JSON.stringify({
        query,
        variables: { productId: graphqlProductId }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Shopify API error:', response.status, errorText);
      throw new Error(`Shopify API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      return NextResponse.json(
        { error: 'GraphQL errors', details: data.errors },
        { status: 400 }
      );
    }

    const product = data.data.product;
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    
    // Transform the Shopify product to our expected format
    const transformedProduct = {
      id: product.id.split('/').pop() || product.id,
      title: product.title,
      vendor: product.vendor,
      product_type: product.productType || 'Skincare',
      tags: product.tags.join(', '),
      variants: product.variants.edges.map((variantEdge: any) => {
        const variantNode = variantEdge.node;
        return {
          id: variantNode.id.split('/').pop() || variantNode.id,
          title: variantNode.title,
          price: variantNode.price.amount,
          inventory_quantity: variantNode.availableForSale ? 1 : 0
        };
      }),
      images: product.images.edges.map((imageEdge: any, index: number) => {
        const imageNode = imageEdge.node;
        // Ensure image URL is absolute
        let imageUrl = imageNode.url;
        if (imageUrl && !imageUrl.startsWith('http')) {
          imageUrl = `https:${imageUrl}`;
        }
        
        console.log(`🖼️ API: Processing image ${index + 1}:`, {
          originalUrl: imageNode.url,
          transformedUrl: imageUrl
        });
        
        return {
          id: index + 1,
          src: imageUrl,
          alt: imageNode.altText || product.title
        };
      }),
      body_html: product.description || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('✅ Product fetched successfully:', transformedProduct.title);
    return NextResponse.json({ success: true, product: transformedProduct });

  } catch (error) {
    console.error('Failed to fetch product by ID:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 