import { NextRequest, NextResponse } from 'next/server';

const SHOPIFY_DOMAIN = process.env.NEXT_PUBLIC_SHOPIFY_DOMAIN;
const SHOPIFY_STOREFRONT_ACCESS_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

export async function POST(request: NextRequest) {
  try {
    if (!SHOPIFY_DOMAIN || !SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: 'Missing Shopify Storefront credentials' },
        { status: 500 }
      );
    }

    const { variantIds } = await request.json();

    if (!variantIds || !Array.isArray(variantIds)) {
      return NextResponse.json(
        { error: 'variantIds array is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Fetching products for variant IDs:', variantIds);
    console.log('🔍 Variant ID types:', variantIds.map(id => typeof id));

    // Convert all variant IDs to strings to ensure consistent comparison
    const stringVariantIds = variantIds.map(id => id.toString());
    console.log('🔍 Converted to strings:', stringVariantIds);

    // Convert numeric variant IDs to Shopify GraphQL format
    const graphqlVariantIds = stringVariantIds.map(id => `gid://shopify/ProductVariant/${id}`);
    console.log('🔍 GraphQL variant IDs:', graphqlVariantIds.slice(0, 3)); // Show first 3

    // Query specific variants directly using Shopify's GraphQL API
    const query = `
      query getVariants($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on ProductVariant {
            id
            title
            price {
              amount
              currencyCode
            }
            availableForSale
            sku
            image {
              src
              altText
            }
            product {
              id
              title
              vendor
              productType
              tags
              description
              images(first: 1) {
                edges {
                  node {
                    src
                    altText
                  }
                }
              }
            }
          }
        }
      }
    `;

    console.log('🔍 Fetching specific variants directly from Shopify...');

    const response = await fetch(`https://${SHOPIFY_DOMAIN}/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        query,
        variables: { ids: graphqlVariantIds }
      }),
    });

    console.log(`📡 Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Shopify API error: ${response.status} ${response.statusText}`);
      console.error(`❌ Error response: ${errorText}`);
      return NextResponse.json(
        { 
          error: 'Shopify API error',
          status: response.status,
          details: errorText
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`📦 Response data:`, JSON.stringify(data, null, 2));
    
    if (data.errors) {
      console.error('❌ GraphQL errors:', data.errors);
      return NextResponse.json(
        { 
          error: 'GraphQL errors',
          errors: data.errors
        },
        { status: 400 }
      );
    }

    const variants = data.data?.nodes || [];
    console.log(`📦 Found ${variants.length} variants directly from Shopify`);
    
    // Debug: Show which variant IDs were found vs requested
    const foundVariantIds = variants.map((variant: any) => variant.id.split('/').pop());
    console.log('Found variant IDs:', foundVariantIds);
    console.log('Requested variant IDs:', stringVariantIds);
    const missingIds = stringVariantIds.filter(id => !foundVariantIds.includes(id));
    if (missingIds.length > 0) {
      console.log('Missing variant IDs:', missingIds.slice(0, 5)); // Show first 5
    }

    // Transform the variants to our expected product format
    const transformedProducts = variants.map((variant: any) => {
      const product = variant.product;
      
      return {
        id: product.id.split('/').pop() || product.id,
        title: product.title,
        vendor: product.vendor,
        product_type: product.productType || 'Skincare',
        tags: product.tags.join(', '),
        variants: [{
          id: variant.id.split('/').pop() || variant.id,
          title: variant.title,
          price: variant.price.amount,
          inventory_quantity: variant.availableForSale ? 1 : 0
        }],
        images: [{
          id: 1,
          src: variant.image?.src || product.images.edges[0]?.node.src || 'https://via.placeholder.com/300x300/f0f0f0/999999?text=Product+Image',
          alt: variant.image?.altText || product.images.edges[0]?.node.altText || product.title
        }],
        body_html: product.description || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });

    console.log(`✅ Successfully transformed ${transformedProducts.length} products`);

    return NextResponse.json({
      success: true,
      products: transformedProducts,
      total: transformedProducts.length,
      debug: {
        requestedVariantIds: stringVariantIds.length,
        foundVariants: variants.length,
        transformedProducts: transformedProducts.length
      }
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch products from Shopify',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
