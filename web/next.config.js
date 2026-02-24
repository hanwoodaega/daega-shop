/** @type {import('next').NextConfig} */
const nextConfig = {
  // 꼬인 캐시로 인한 404 / ENOENT 방지 (개발 시에만 비활성화해도 됨)
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false
    }
    return config
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,
  optimizeFonts: true,
}

module.exports = nextConfig

