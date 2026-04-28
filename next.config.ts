/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://hiring-platform-beta.onrender.com/api/:path*', // Proxy to backend
      },
    ];
  },
};

module.exports = nextConfig;