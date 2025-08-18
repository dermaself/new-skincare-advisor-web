# DermaSelf Skin Analysis - Shopify Embedding Guide

This guide explains how to embed the DermaSelf Skin Analysis modal in your Shopify store.

## Overview

The DermaSelf Skin Analysis app has been optimized for embedding in Shopify stores. It provides a seamless experience where customers can:

1. Complete a skin assessment questionnaire
2. Take a photo for AI analysis
3. Receive personalized skincare recommendations
4. Add recommended products directly to their Shopify cart

## Deployment

### 1. Deploy to Hosting Service

Deploy your Next.js app to a hosting service like Vercel, Netlify, or Azure:

```bash
# For Vercel
npm install -g vercel
vercel

# For Netlify
npm run build
# Upload the .next folder to Netlify
```

### 2. Get Your Embed URL

After deployment, your embed URL will be:
```
https://your-domain.com/embed
```

## Shopify Integration

### Method 1: Simple Button Integration

Add this code to your Shopify theme (e.g., in `product.liquid` or `index.liquid`):

```html
<!-- Skin Analysis Button -->
<button onclick="openSkinAnalysis()" class="skin-analysis-btn">
    🧴 Get Personalized Skincare Recommendations
</button>

<script>
function openSkinAnalysis() {
    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.src = 'https://your-domain.com/embed';
    iframe.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;border:none;background:white;';
    
    // Add to page
    document.body.appendChild(iframe);
    
    // Listen for close message
    window.addEventListener('message', function(event) {
        if (event.data.type === 'SKIN_ANALYSIS_CLOSED') {
            document.body.removeChild(iframe);
        }
    });
}
</script>

<style>
.skin-analysis-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 15px 30px;
    border-radius: 25px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    transition: transform 0.2s;
    margin: 20px 0;
}

.skin-analysis-btn:hover {
    transform: translateY(-2px);
}
</style>
```

### Method 2: Product Page Integration

For better integration on product pages, add this to your `product.liquid`:

```html
{% comment %} Add this after the product description {% endcomment %}
<div class="skin-analysis-section">
    <h3>Get Personalized Recommendations</h3>
    <p>Not sure if this product is right for your skin? Get AI-powered recommendations!</p>
    <button onclick="openSkinAnalysis()" class="skin-analysis-btn">
        🧴 Analyze My Skin
    </button>
</div>

<script>
function openSkinAnalysis() {
    const iframe = document.createElement('iframe');
    iframe.src = 'https://your-domain.com/embed';
    iframe.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;border:none;background:white;';
    document.body.appendChild(iframe);
    
    window.addEventListener('message', function(event) {
        if (event.data.type === 'SKIN_ANALYSIS_CLOSED') {
            document.body.removeChild(iframe);
        }
    });
}
</script>
```

### Method 3: Floating Button

Add a floating button that appears on all pages:

```html
<!-- Add this to your theme.liquid or layout file -->
<div id="floating-skin-analysis" style="position:fixed;bottom:20px;right:20px;z-index:1000;">
    <button onclick="openSkinAnalysis()" style="background:#667eea;color:white;border:none;padding:15px;border-radius:50%;box-shadow:0 4px 12px rgba(0,0,0,0.15);cursor:pointer;">
        🧴
    </button>
</div>

<script>
function openSkinAnalysis() {
    const iframe = document.createElement('iframe');
    iframe.src = 'https://your-domain.com/embed';
    iframe.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;border:none;background:white;';
    document.body.appendChild(iframe);
    
    window.addEventListener('message', function(event) {
        if (event.data.type === 'SKIN_ANALYSIS_CLOSED') {
            document.body.removeChild(iframe);
        }
    });
}
</script>
```

## Cart Integration

The embedded app automatically integrates with your Shopify cart. When customers add products from the recommendations:

1. Products are added to the cart with custom attributes
2. The cart is updated in real-time
3. Customers can continue shopping or proceed to checkout

### Custom Attributes Added

Each product added from the skin analysis includes these attributes:

- `source`: "dermaself_recommendation"
- `recommendation_type`: "skin_analysis" or "skin_analysis_routine"
- `skin_concerns`: Selected skin concerns
- `skin_type`: Selected skin type
- `age_group`: Selected age group
- `added_at`: Timestamp

## Communication Protocol

The embedded app communicates with the parent Shopify page using postMessage:

### Messages from App to Shopify

```javascript
// When modal is closed
{
  type: 'SKIN_ANALYSIS_CLOSED',
  payload: {}
}

// When adding to cart
{
  type: 'SHOPIFY_ADD_TO_CART',
  payload: {
    variantId: '123456789',
    quantity: 1,
    customAttributes: [...],
    productInfo: {...}
  }
}

// When adding routine to cart
{
  type: 'SHOPIFY_ADD_ROUTINE_TO_CART',
  payload: {
    products: [...]
  }
}
```

### Messages from Shopify to App

```javascript
// To open the modal
{
  type: 'OPEN_SKIN_ANALYSIS'
}

// To close the modal
{
  type: 'CLOSE_SKIN_ANALYSIS'
}

// Cart update response
{
  type: 'CART_UPDATE_SUCCESS',
  payload: {
    cart: {...}
  }
}
```

## Customization

### Styling the Button

You can customize the button appearance by modifying the CSS:

```css
.skin-analysis-btn {
    /* Your custom styles */
    background: linear-gradient(135deg, #your-color-1 0%, #your-color-2 100%);
    font-family: 'Your Font', sans-serif;
    /* ... */
}
```

### Positioning

Adjust the iframe positioning for different layouts:

```javascript
// For centered modal
iframe.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:90%;height:90%;max-width:500px;max-height:800px;z-index:9999;border:none;background:white;border-radius:12px;';

// For side panel
iframe.style.cssText = 'position:fixed;top:0;right:0;width:400px;height:100%;z-index:9999;border:none;background:white;box-shadow:-2px 0 10px rgba(0,0,0,0.1);';
```

## Testing

### Local Testing

1. Run your Next.js app locally: `npm run dev`
2. Open `http://localhost:3000/shopify-embed-example.html`
3. Test the embed functionality

### Production Testing

1. Deploy your app
2. Test the embed URL: `https://your-domain.com/embed`
3. Test cart integration in your Shopify store

## Troubleshooting

### Common Issues

1. **Iframe not loading**: Check CORS settings and ensure your domain allows embedding
2. **Cart not updating**: Verify Shopify cart integration is properly configured
3. **Modal not closing**: Check postMessage communication is working

### Debug Mode

Add this to your Shopify theme for debugging:

```javascript
// Debug postMessage communication
window.addEventListener('message', function(event) {
    console.log('Message received:', event.data);
});
```

## Support

For technical support or customization requests, contact the DermaSelf team.

## Security Notes

- The app processes images locally on the user's device
- No personal data is stored or transmitted
- All communication with Shopify uses secure postMessage API
- HTTPS is required for production deployment 