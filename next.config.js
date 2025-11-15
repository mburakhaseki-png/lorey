/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/server/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Server-side'da Konva'yı ignore et
      config.externals = [...(config.externals || []), 'canvas', 'konva'];
    }
    return config;
  },
};

module.exports = nextConfig;
