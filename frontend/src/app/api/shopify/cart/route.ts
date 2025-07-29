import { NextRequest, NextResponse } from 'next/server';

const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN;
const SHOPIFY_STOREFRONT_ACCESS_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

export async function POST(request: NextRequest) {
  try {
    if (!SHOPIFY_DOMAIN || !SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: 'Missing Shopify Storefront credentials' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { action, cartId, lineId, variantId, quantity } = body;

    switch (action) {
      case 'create_cart':
        return await createCart(variantId, quantity);
      
      case 'add_to_cart':
        return await addToCart(cartId, variantId, quantity);
      
      case 'update_cart_item':
        return await updateCartItem(cartId, lineId, quantity);
      
      case 'remove_from_cart':
        return await removeFromCart(cartId, lineId);
      
      case 'get_cart':
        return await getCart(cartId);
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Cart API error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      domain: SHOPIFY_DOMAIN,
      hasToken: !!SHOPIFY_STOREFRONT_ACCESS_TOKEN
    });
    return NextResponse.json(
      { 
        error: 'Failed to process cart request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function createCart(variantId: string, quantity: number = 1) {
  const mutation = `
    mutation cartCreate($input: CartInput!) {
      cartCreate(input: $input) {
        cart {
          id
          checkoutUrl
          lines(first: 10) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    product {
                      title
                      images(first: 1) {
                        edges {
                          node {
                            url
                            altText
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
          cost {
            subtotalAmount {
              amount
              currencyCode
            }
            totalAmount {
              amount
              currencyCode
            }
          }
        }
        userErrors {
          field
          message
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
      query: mutation,
      variables: {
        input: {
          lines: [
            {
              merchandiseId: variantId,
              quantity: quantity
            }
          ]
        }
      }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Shopify API error response:', errorText);
    throw new Error(`Cart creation failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  if (data.data?.cartCreate?.userErrors?.length > 0) {
    throw new Error(data.data.cartCreate.userErrors[0].message);
  }

  if (data.errors) {
    console.error('GraphQL errors:', data.errors);
    throw new Error(data.errors[0]?.message || 'GraphQL error occurred');
  }

  return NextResponse.json({
    success: true,
    cart: data.data.cartCreate.cart
  });
}

async function addToCart(cartId: string, variantId: string, quantity: number = 1) {
  const mutation = `
    mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart {
          id
          checkoutUrl
          lines(first: 10) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    product {
                      title
                      images(first: 1) {
                        edges {
                          node {
                            url
                            altText
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
          cost {
            subtotalAmount {
              amount
              currencyCode
            }
            totalAmount {
              amount
              currencyCode
            }
          }
        }
        userErrors {
          field
          message
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
      query: mutation,
      variables: {
        cartId: cartId,
        lines: [
          {
            merchandiseId: variantId,
            quantity: quantity
          }
        ]
      }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Shopify API error response:', errorText);
    throw new Error(`Add to cart failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  if (data.data?.cartLinesAdd?.userErrors?.length > 0) {
    throw new Error(data.data.cartLinesAdd.userErrors[0].message);
  }

  if (data.errors) {
    console.error('GraphQL errors:', data.errors);
    throw new Error(data.errors[0]?.message || 'GraphQL error occurred');
  }

  return NextResponse.json({
    success: true,
    cart: data.data.cartLinesAdd.cart
  });
}

async function updateCartItem(cartId: string, lineId: string, quantity: number) {
  const mutation = `
    mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart {
          id
          checkoutUrl
          lines(first: 10) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    product {
                      title
                      images(first: 1) {
                        edges {
                          node {
                            url
                            altText
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
          cost {
            subtotalAmount {
              amount
              currencyCode
            }
            totalAmount {
              amount
              currencyCode
            }
          }
        }
        userErrors {
          field
          message
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
      query: mutation,
      variables: {
        cartId: cartId,
        lines: [
          {
            id: lineId,
            quantity: quantity
          }
        ]
      }
    }),
  });

  if (!response.ok) {
    throw new Error(`Update cart item failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  if (data.data?.cartLinesUpdate?.userErrors?.length > 0) {
    throw new Error(data.data.cartLinesUpdate.userErrors[0].message);
  }

  return NextResponse.json({
    success: true,
    cart: data.data.cartLinesUpdate.cart
  });
}

async function removeFromCart(cartId: string, lineId: string) {
  const mutation = `
    mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart {
          id
          checkoutUrl
          lines(first: 10) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    product {
                      title
                      images(first: 1) {
                        edges {
                          node {
                            url
                            altText
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
          cost {
            subtotalAmount {
              amount
              currencyCode
            }
            totalAmount {
              amount
              currencyCode
            }
          }
        }
        userErrors {
          field
          message
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
      query: mutation,
      variables: {
        cartId: cartId,
        lineIds: [lineId]
      }
    }),
  });

  if (!response.ok) {
    throw new Error(`Remove from cart failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  if (data.data?.cartLinesRemove?.userErrors?.length > 0) {
    throw new Error(data.data.cartLinesRemove.userErrors[0].message);
  }

  return NextResponse.json({
    success: true,
    cart: data.data.cartLinesRemove.cart
  });
}

async function getCart(cartId: string) {
  const query = `
    query cart($id: ID!) {
      cart(id: $id) {
        id
        checkoutUrl
        lines(first: 10) {
          edges {
            node {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  price {
                    amount
                    currencyCode
                  }
                  product {
                    title
                    images(first: 1) {
                      edges {
                        node {
                          url
                          altText
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        cost {
          subtotalAmount {
            amount
            currencyCode
          }
          totalAmount {
            amount
            currencyCode
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
      query: query,
      variables: {
        id: cartId
      }
    }),
  });

  if (!response.ok) {
    throw new Error(`Get cart failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  return NextResponse.json({
    success: true,
    cart: data.data.cart
  });
} 