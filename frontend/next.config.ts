import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    // Get allowed domains from environment variable
    const allowedDomains = process.env.ALLOWED_FRAME_DOMAINS || 'https://dermaself-dev.myshopify.com'
    
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'same-origin'
          },
          {
            key: 'Content-Security-Policy',
            value: `frame-ancestors 'self' ${allowedDomains}`
          }
        ],
      },
    ]
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't resolve 'fs' module on the client to prevent this error on build
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        encoding: false,
      };
    }
    return config;
  },
  /* config options here */
};

export default nextConfig;
