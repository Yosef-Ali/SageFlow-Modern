/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['localhost'],
  },
  experimental: {
    serverComponentsExternalPackages: ['odbc'],
  },
}

module.exports = nextConfig
