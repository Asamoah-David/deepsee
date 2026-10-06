import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@deepsee/ui', '@deepsee/shared'],
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: { reactCompiler: false },
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
};

export default nextConfig;
