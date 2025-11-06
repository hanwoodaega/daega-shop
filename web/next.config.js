/** @type {import('next').NextConfig} */
const nextConfig = {
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
  },
  // 프로덕션 최적화
  poweredByHeader: false,
  compress: true,
  // 불필요한 에러 메시지 제거
  reactStrictMode: true,
}

module.exports = nextConfig

