# Shopify Cart Functionality

This document describes the cart functionality implementation that syncs with your Shopify store.

## Features

### ✅ Implemented Features

1. **Cart Management**
   - Add products to cart
   - Remove products from cart
   - Update product quantities
   - Clear entire cart
   - Persistent cart state (localStorage)

2. **Cart Display**
   - Real-time cart count badge
   - Cart dropdown with full cart view
   - Product images, titles, and prices
   - Quantity controls
   - Subtotal and total calculations

3. **Product Cards**
   - Add to cart functionality
   - Variant selection (if multiple variants)
   - Quantity selection
   - Stock availability checking
   - Success feedback

4. **Shopify Integration**
   - Uses Shopify Storefront API
   - GraphQL mutations for cart operations
   - Secure checkout redirect
   - Error handling and loading states

## API Endpoints

### `/api/shopify/cart` (POST)

Handles all cart operations:

- `create_cart` - Create new cart with items
- `add_to_cart` - Add items to existing cart
- `update_cart_item` - Update item quantity
- `remove_from_cart` - Remove items from cart
- `get_cart` - Retrieve cart details

## Components

### CartContext (`/components/CartContext.tsx`)
- Manages cart state globally
- Provides cart operations (add, remove, update, clear)
- Handles localStorage persistence
- Error handling and loading states

### Cart (`/components/Cart.tsx`)
- Displays cart items
- Quantity controls
- Remove item functionality
- Checkout button
- Cart summary with totals

### ProductCard (`/components/ProductCard.tsx`)
- Product display with images
- Variant selection
- Quantity selection
- Add to cart functionality
- Stock availability

### CartIcon (`/components/CartIcon.tsx`)
- Cart count badge
- Cart dropdown
- Quick cart access

## Environment Variables

Make sure you have these environment variables set:

```env
# Shopify Storefront API (for cart operations)
SHOPIFY_DOMAIN=your-store.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=your-storefront-access-token

# Shopify Admin API (for product fetching)
SHOPIFY_ACCESS_TOKEN=your-admin-access-token
```

## Usage

### Basic Cart Operations

```typescript
import { useCart } from '../components/CartContext';

function MyComponent() {
  const { addToCart, removeFromCart, updateCartItem, state } = useCart();
  
  // Add item to cart
  await addToCart('gid://shopify/ProductVariant/123', 2);
  
  // Update quantity
  await updateCartItem('cart-line-id', 3);
  
  // Remove item
  await removeFromCart('cart-line-id');
  
  // Access cart state
  const { cart, loading, error } = state;
}
```

### Product Display

```typescript
import ProductCard from '../components/ProductCard';

function ProductList({ products }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

## Testing

Visit `/shopify-test` to test the cart functionality:

1. Test Shopify connection
2. View products with add-to-cart buttons
3. Add products to cart
4. View cart contents
5. Update quantities
6. Remove items
7. Proceed to checkout

## Cart State Persistence

The cart state is automatically saved to localStorage and restored on page reload. This ensures users don't lose their cart when navigating or refreshing the page.

## Error Handling

The cart system includes comprehensive error handling:

- Network errors
- Shopify API errors
- Invalid product/variant IDs
- Out-of-stock items
- Rate limiting

All errors are displayed to users with appropriate messaging.

## Security

- Uses Shopify's secure Storefront API
- No sensitive data stored in localStorage
- Secure checkout redirect to Shopify
- Proper error handling without exposing sensitive information

## Future Enhancements

Potential improvements:

1. **Cart Recovery** - Email cart to user
2. **Wishlist** - Save items for later
3. **Product Recommendations** - Based on cart contents
4. **Discount Codes** - Apply coupons
5. **Shipping Calculator** - Real-time shipping costs
6. **Guest Checkout** - Allow checkout without account
7. **Cart Abandonment** - Email reminders
8. **Inventory Sync** - Real-time stock updates 