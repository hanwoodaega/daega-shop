'use client'

import type { Banner } from '../_types'

interface BannerListProps {
  banners: Banner[]
  selectedBanner: Banner | null
  onSelectBanner: (banner: Banner) => void
}

export default function BannerList({ banners, selectedBanner, onSelectBanner }: BannerListProps) {
  if (banners.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h2 className="text-lg font-bold mb-4">배너 목록</h2>
        <div className="text-center py-8 text-gray-500">
          배너가 없습니다
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h2 className="text-lg font-bold mb-4">배너 목록</h2>
      <div className="space-y-2">
        {banners.map((banner) => (
          <div
            key={banner.id}
            onClick={() => onSelectBanner(banner)}
            className={`p-3 rounded-lg cursor-pointer transition ${
              selectedBanner?.id === banner.id
                ? 'bg-blue-100 border-2 border-blue-500'
                : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-1 rounded ${
                    banner.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {banner.is_active ? '활성' : '비활성'}
                  </span>
                  <span className="text-xs text-gray-500">순서: {banner.sort_order}</span>
                </div>
                {banner.title && (
                  <h3 className="font-medium text-sm text-gray-900 line-clamp-1">{banner.title}</h3>
                )}
                {banner.subtitle_black && (
                  <h3 className="font-medium text-sm text-black line-clamp-1">{banner.subtitle_black}</h3>
                )}
                {banner.subtitle_red && (
                  <h3 className="font-medium text-sm text-red-600 line-clamp-1">{banner.subtitle_red}</h3>
                )}
                {!banner.title && !banner.subtitle_black && !banner.subtitle_red && (
                  <h3 className="font-medium text-sm text-gray-400">타이틀 없음</h3>
                )}
                {banner.slug && (
                  <p className="text-xs text-blue-600 mt-1">/{banner.slug}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

