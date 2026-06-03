import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@crm/shared'],
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
