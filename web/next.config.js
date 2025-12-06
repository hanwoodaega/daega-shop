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
    // sharp 사용 명시
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // 프로덕션 최적화
  poweredByHeader: false,
  compress: true,
  // 불필요한 에러 메시지 제거
  reactStrictMode: true,
  // 폰트 최적화 설정
  optimizeFonts: true,
}

module.exports = nextConfig

