import Link from 'next/link'
import { Banner } from '@/lib/banner'

interface BannerSectionUIProps {
  banners: Banner[]
}

export default function BannerSectionUI({ banners }: BannerSectionUIProps) {
  if (banners.length === 0) {
    return null
  }

  return (
    <div className="container mx-auto px-0 lg:px-2">
      <div className="grid gap-0 lg:gap-2 lg:grid-cols-3">
        {banners.map((banner) => {
          const BannerContent = (
            <div
              className="rounded-none lg:rounded-lg px-4 py-4"
              style={{ backgroundColor: banner.background_color }}
            >
              <div className="flex flex-row items-center gap-4">
                {/* 왼쪽: 텍스트 영역 */}
                <div className="flex-1 text-left">
                  {/* 부제목 영역 */}
                  <div className="mb-2">
                    {banner.subtitle_black && (
                      <h2 className="text-base md:text-lg lg:text-[15px] font-bold text-black mb-0 whitespace-pre-line tracking-tight leading-tight">
                        {banner.subtitle_black}
                      </h2>
                    )}
                    {banner.subtitle_red && (
                      <h2 className="text-base md:text-lg lg:text-[15px] font-bold text-red-600 whitespace-pre-line tracking-tight leading-tight">
                        {banner.subtitle_red}
                      </h2>
                    )}
                  </div>
                  
                  {/* 설명 */}
                  {banner.description && (
                    <p className="text-xs md:text-sm text-gray-700 whitespace-pre-line">
                      {banner.description}
                    </p>
                  )}
                </div>

                {/* 오른쪽: 이미지 */}
                <div className="flex-shrink-0">
                  {banner.image_url ? (
                    <img
                      src={banner.image_url}
                      alt={banner.title || banner.subtitle_black || banner.subtitle_red || '배너'}
                      className="w-24 h-24 md:w-28 md:h-28 lg:w-24 lg:h-24 object-contain"
                    />
                  ) : null}
                </div>
              </div>
            </div>
          )

          if (banner.slug) {
            // slug가 /로 시작하면 절대 경로, 아니면 /banners/ 접두사 추가
            const href = banner.slug.startsWith('/') ? banner.slug : `/banners/${banner.slug}`
            return (
              <Link key={banner.id} href={href} prefetch={false} className="block">
                {BannerContent}
              </Link>
            )
          }

          return <div key={banner.id}>{BannerContent}</div>
        })}
      </div>
    </div>
  )
}

