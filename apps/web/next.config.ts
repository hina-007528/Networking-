import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/get-stormfiber-2', destination: '/get-stormfiber', permanent: false },
      { source: '/get-majawar-x', destination: '/get-stormfiber', permanent: false },
      { source: '/portal', destination: '/dashboard', permanent: false },
      { source: '/portal/:path*', destination: '/dashboard/:path*', permanent: false },
      { source: '/support/get-in-touch/', destination: '/support/get-in-touch', permanent: false },
    ];
  },
  output: 'standalone',
  transpilePackages: ['@stormfiber/config', '@stormfiber/types', '@stormfiber/ui', '@stormfiber/validation'],
  images: {
    remotePatterns: [{ protocol: 'http', hostname: 'localhost' }, { protocol: 'https', hostname: '**' }],
  },
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
