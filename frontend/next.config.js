/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't resolve 'fs' module on the client to prevent this error on build
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        // Handle encoding module gracefully
        encoding: false,
      };
      
      // Add alias for encoding to prevent build errors
      config.resolve.alias = {
        ...config.resolve.alias,
        encoding: false,
      };
    }
    return config;
  },
  // Disable telemetry
  experimental: {
    telemetry: false,
  },
  // Other configuration options if needed
};

module.exports = nextConfig;
