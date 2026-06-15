/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/index.html',
      },
      {
        source: '/admin',
        destination: '/admin.html',
      },
      {
        source: '/checkout',
        destination: '/checkout.html',
      },
    ]
  },
}

module.exports = nextConfig
