'use client'

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
    <>
      {banners.map((banner) => {
        const BannerContent = (
          <div
            className="container mx-auto px-4 py-3"
            style={{ backgroundColor: banner.background_color }}
          >
            <div className="flex flex-row items-center gap-6 md:gap-8">
              {/* 왼쪽: 텍스트 영역 */}
              <div className="flex-1 text-left">
                {/* 부제목 영역 */}
                <div className="mb-3">
                  {banner.subtitle_black && (
                    <h2 className="text-2xl md:text-3xl font-bold text-black mb-0 whitespace-pre-line tracking-tight leading-tight">
                      {banner.subtitle_black}
                    </h2>
                  )}
                  {banner.subtitle_red && (
                    <h2 className="text-2xl md:text-3xl font-bold text-red-600 whitespace-pre-line tracking-tight leading-tight">
                      {banner.subtitle_red}
                    </h2>
                  )}
                </div>
                
                {/* 설명 */}
                {banner.description && (
                  <p className="text-sm md:text-base text-gray-700 mt-2 whitespace-pre-line">
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
                    className="w-40 h-40 md:w-60 md:h-60 object-contain"
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
            <Link key={banner.id} href={href} className="block">
              {BannerContent}
            </Link>
          )
        }

        return <div key={banner.id}>{BannerContent}</div>
      })}
    </>
  )
}

