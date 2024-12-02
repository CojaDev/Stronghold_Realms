/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', process.env.VERCEL_URL].filter(Boolean),
    loader: 'default',
    path: '/_next/image',
  },
  webpack: (config:any) => {
    config.module.rules.push({
      test: /\.(png|jpg|gif|webp)$/i,
      type: 'asset/resource',
    })
    return config
  },
}

module.exports = nextConfig

