import { getShopifyDomain } from './shopify';

const SHOPIFY_STOREFRONT_ACCESS_TOKEN = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;

export interface ShopifyProductVariant {
  id: string;
  title: string;
  price: {
    amount: string;
    currencyCode: string;
  };
  availableForSale: boolean;
}

export interface ShopifyProductImage {
  url: string;
  altText: string | null;
}

export interface ShopifyProduct {
  id: string;
  title: string;
  vendor: string;
  description: string;
  images: ShopifyProductImage[];
  variants: ShopifyProductVariant[];
}

export interface TransformedProduct {
  id: string;
  title: string;
  vendor: string;
  product_type: string;
  tags: string;
  variants: Array<{
    id: string;
    title: string;
    price: string;
    inventory_quantity: number;
  }>;
  images: Array<{
    id: number;
    src: string;
    alt: string;
  }>;
  body_html: string;
  created_at: string;
  updated_at: string;
}

/**
 * Fetches product information from Shopify Storefront API by variant ID
 */
export async function fetchProductByVariantId(variantId: string): Promise<TransformedProduct | null> {
  const shopifyDomain = getShopifyDomain();
  
  if (!shopifyDomain || !SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
    console.error('Missing Shopify credentials');
    return null;
  }

  // Convert variant ID to Shopify GraphQL format if needed
  const graphqlVariantId = variantId.startsWith('gid://') 
    ? variantId 
    : `gid://shopify/ProductVariant/${variantId}`;

  const query = `
    query getProductByVariant($variantId: ID!) {
      productVariant(id: $variantId) {
        id
        title
        price {
          amount
          currencyCode
        }
        availableForSale
        product {
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
  `;

  try {
    const response = await fetch(`https://${shopifyDomain}/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          variantId: graphqlVariantId
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      return null;
    }

    const variant = data.data?.productVariant;
    if (!variant || !variant.product) {
      console.error('Product not found for variant:', variantId);
      return null;
    }

    const product = variant.product;
    
    // Transform the Shopify product to our expected format
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
        return {
          id: index + 1,
          src: imageNode.url,
          alt: imageNode.altText || product.title
        };
      }),
      body_html: product.description || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

  } catch (error) {
    console.error('Failed to fetch product by variant ID:', error);
    return null;
  }
}

/**
 * Fetches multiple products by their variant IDs
 */
export async function fetchProductsByVariantIds(variantIds: string[]): Promise<TransformedProduct[]> {
  const products = await Promise.all(
    variantIds.map(id => fetchProductByVariantId(id))
  );
  
  return products.filter((product): product is TransformedProduct => product !== null);
}
