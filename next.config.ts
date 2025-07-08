import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  }/*,
  dev: {
    allowedDevOrigins: [
      "http://localhost:9002",        // local access
      "http://192.168.0.172:9002",    // your LAN IP, adjust port if needed
      // Add more origins if needed
    ],
  },*/
};

export default nextConfig;