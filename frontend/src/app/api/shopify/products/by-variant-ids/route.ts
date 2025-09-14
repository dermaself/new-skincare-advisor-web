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

    // Instead of fetching by variant ID directly, fetch products and filter by variant
    // This is more reliable since Storefront API doesn't have a direct productVariant query
    const query = `
      query getProducts {
        products(first: 50) {
          edges {
            node {
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
        }
      }
    `;

    console.log('🔍 Fetching all products to filter by variant IDs...');

    const response = await fetch(`https://${SHOPIFY_DOMAIN}/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
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

    const allProducts = data.data?.products?.edges || [];
    console.log(`📦 Found ${allProducts.length} total products`);
    
    // Debug: Show all available variant IDs in the store
    const allAvailableVariantIds = allProducts.flatMap((productEdge: any) => 
      productEdge.node.variants.edges.map((variantEdge: any) => variantEdge.node.id.split('/').pop())
    );
    console.log('All available variant IDs in store:', allAvailableVariantIds.slice(0, 10)); // Show first 10
    console.log('Total available variants:', allAvailableVariantIds.length);

    // Find products that contain any of the requested variant IDs
    const matchingProducts = allProducts.filter((productEdge: any) => {
      const product = productEdge.node;
      const hasMatchingVariant = product.variants.edges.some((variantEdge: any) => {
        const variantId = variantEdge.node.id.split('/').pop(); // Extract numeric ID
        const isMatch = stringVariantIds.includes(variantId);
        if (isMatch) {
          console.log(`✅ Found matching variant ${variantId} in product: ${product.title}`);
        }
        return isMatch;
      });
      return hasMatchingVariant;
    });

    console.log(`🔍 Found ${matchingProducts.length} products matching variant IDs`);
    
    // Debug: Show which variant IDs were found vs requested
    const foundVariantIds = matchingProducts.flatMap((productEdge: any) => 
      productEdge.node.variants.edges.map((variantEdge: any) => variantEdge.node.id.split('/').pop())
    );
    console.log('Found variant IDs:', foundVariantIds);
    console.log('Requested variant IDs:', stringVariantIds);
    const missingIds = stringVariantIds.filter(id => !foundVariantIds.includes(id));
    if (missingIds.length > 0) {
      console.log('Missing variant IDs:', missingIds.slice(0, 5)); // Show first 5
    }

    // Transform the matching products to our expected format
    const transformedProducts = matchingProducts.map((productEdge: any) => {
      const product = productEdge.node;
      
      return {
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
          let imageUrl = imageNode.url;
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = `https:${imageUrl}`;
          }
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
    });

    console.log(`✅ Successfully transformed ${transformedProducts.length} products`);

    return NextResponse.json({
      success: true,
      products: transformedProducts,
      total: transformedProducts.length,
      debug: {
        requestedVariantIds: stringVariantIds.length,
        totalProducts: allProducts.length,
        matchingProducts: transformedProducts.length
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
