/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', 'your-azure-storage.blob.core.windows.net'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
        ],
      },
    ];
  },
  env: {
    API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:7071/api',
  },
};

module.exports = nextConfig; 