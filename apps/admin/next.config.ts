import path from 'node:path';
import type { NextConfig } from 'next';

const adminBasePath =
  process.env.NODE_ENV === 'production' ? process.env.NEXT_PUBLIC_ADMIN_BASE_PATH : undefined;

const nextConfig: NextConfig = {
  output: 'standalone',
  ...(adminBasePath ? { basePath: adminBasePath } : {}),
  transpilePackages: ['@stormfiber/config', '@stormfiber/types', '@stormfiber/ui', '@stormfiber/validation'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@stormfiber/config': path.resolve(__dirname, '../../packages/config/src'),
      '@stormfiber/types': path.resolve(__dirname, '../../packages/types/src'),
      '@stormfiber/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@stormfiber/validation': path.resolve(__dirname, '../../packages/validation/src'),
    };
    return config;
  },
};

export default nextConfig;
