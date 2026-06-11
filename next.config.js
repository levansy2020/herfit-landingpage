/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
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
