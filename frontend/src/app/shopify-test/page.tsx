'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface ShopifyProduct {
  id: number;
  title: string;
  vendor: string;
  product_type: string;
  tags: string;
  variants: Array<{
    id: number;
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

interface TestResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export default function ShopifyTestPage() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [shopifyDomain, setShopifyDomain] = useState('');
  const [accessToken, setAccessToken] = useState('');

  // Test Shopify API connection
  const testShopifyAPI = async () => {
    setIsLoading(true);
    const results: TestResult[] = [];

    try {
      console.log("env",process.env);
      // Test 1: Check environment variables
      const accessToken = process.env.NEXT_PUBLIC_SHOPIFY_ACCESS_TOKEN;
      const domain = process.env.NEXT_PUBLIC_SHOPIFY_DOMAIN;
      
      results.push({
        success: !!(accessToken && domain),
        message: 'Environment Variables Check',
        data: { 
          accessToken: accessToken ? 'Set' : 'Not set',
          domain: domain || 'Not set'
        }
      });

      if (!accessToken || !domain) {
        throw new Error('Missing Shopify environment variables');
      }

      // Test 2: Test API connection via backend
      const response = await fetch('/api/shopify', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      results.push({
        success: data.success,
        message: 'API Connection Test',
        data: { 
          status: response.status,
          productCount: data.total || 0 
        }
      });

      // Test 3: Check products data
      if (data.products && data.products.length > 0) {
        setProducts(data.products);
        results.push({
          success: true,
          message: 'Products Data Test',
          data: { 
            totalProducts: data.products.length,
            sampleProduct: {
              id: data.products[0].id,
              title: data.products[0].title,
              vendor: data.products[0].vendor
            }
          }
        });
      } else {
        results.push({
          success: false,
          message: 'Products Data Test',
          error: 'No products found in store'
        });
      }

    } catch (error) {
      results.push({
        success: false,
        message: 'API Connection Test',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    setTestResults(results);
    setIsLoading(false);
  };

  // Manual test with custom credentials
  const testWithCredentials = async () => {
    if (!shopifyDomain || !accessToken) {
      alert('Please enter both domain and access token');
      return;
    }

    setIsLoading(true);
    const results: TestResult[] = [];

    try {
      // Call our backend API route instead of direct Shopify API
      const response = await fetch('/api/shopify', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || `API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      results.push({
        success: true,
        message: 'Manual API Test (via Backend)',
        data: { 
          status: response.status,
          productCount: data.products?.length || 0 
        }
      });

      if (data.products && data.products.length > 0) {
        setProducts(data.products);
      }

    } catch (error) {
      results.push({
        success: false,
        message: 'Manual API Test (via Backend)',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    setTestResults(results);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-lg p-6 mb-8"
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Shopify API Test</h1>
              <p className="text-gray-600">Test your Shopify API connection and fetch products</p>
            </div>
          </div>

          {/* Environment Variables Section */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Environment Variables</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  NEXT_PUBLIC_SHOPIFY_DOMAIN
                </label>
                <input
                  type="text"
                  value={process.env.NEXT_PUBLIC_SHOPIFY_DOMAIN || 'Not set'}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  NEXT_PUBLIC_SHOPIFY_ACCESS_TOKEN
                </label>
                <input
                  type="text"
                  value={process.env.NEXT_PUBLIC_SHOPIFY_ACCESS_TOKEN ? 'Set' : 'Not set'}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Backend SHOPIFY_ACCESS_TOKEN
                </label>
                <input
                  type="text"
                  value="Check .env.local file"
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
              </div>
            </div>
          </div>

          {/* Test Buttons */}
          <div className="flex flex-wrap gap-4 mb-6">
            <button
              onClick={testShopifyAPI}
              disabled={isLoading}
              className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <CheckCircle className="w-5 h-5" />
              )}
              <span>Test with Environment Variables</span>
            </button>
          </div>

          {/* Manual Test Section */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">Manual Test</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shopify Domain
                </label>
                <input
                  type="text"
                  placeholder="your-store.myshopify.com"
                  value={shopifyDomain}
                  onChange={(e) => setShopifyDomain(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Access Token
                </label>
                <input
                  type="password"
                  placeholder="shpat_..."
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <button
              onClick={testWithCredentials}
              disabled={isLoading || !shopifyDomain || !accessToken}
              className="flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <CheckCircle className="w-5 h-5" />
              )}
              <span>Test with Custom Credentials</span>
            </button>
          </div>

          {/* Test Results */}
          {testResults.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Test Results</h3>
              <div className="space-y-3">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      result.success
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      {result.success ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      )}
                      <span className="font-semibold">{result.message}</span>
                    </div>
                    {result.data && (
                      <div className="text-sm text-gray-600">
                        <pre className="bg-white p-2 rounded border">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </div>
                    )}
                    {result.error && (
                      <div className="text-sm text-red-600">
                        Error: {result.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Products Display */}
          {products.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">
                Products Found ({products.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.slice(0, 9).map((product) => (
                  <div key={product.id} className="border border-gray-200 rounded-lg p-4">
                    {product.images?.[0] && (
                      <img
                        src={product.images[0].src}
                        alt={product.title}
                        className="w-full h-32 object-cover rounded-lg mb-3"
                      />
                    )}
                    <h4 className="font-semibold text-gray-900 mb-1">{product.title}</h4>
                    <p className="text-sm text-gray-600 mb-2">{product.vendor}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        {product.variants?.length || 0} variants
                      </span>
                      {product.variants?.[0] && (
                        <span className="font-semibold text-gray-900">
                          ${parseFloat(product.variants[0].price).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {products.length > 9 && (
                <p className="text-sm text-gray-600 mt-4 text-center">
                  Showing first 9 products of {products.length} total
                </p>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
} 