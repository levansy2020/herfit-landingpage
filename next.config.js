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
      {
        source: '/san-pham/herfit-home-gym',
        destination: '/san-pham/herfit-home-gym/index.html',
      },
      {
        source: '/san-pham/herfit-home-gym/checkout',
        destination: '/san-pham/herfit-home-gym/checkout.html',
      },
      {
        source: '/san-pham/herfit-home-gym/cam-on',
        destination: '/san-pham/herfit-home-gym/cam-on.html',
      },
    ]
  },
}

module.exports = nextConfig
