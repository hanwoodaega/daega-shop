import { HeroSlide } from '../_types'

interface HeroItemProps {
  slide: HeroSlide
  onEdit: (slide: HeroSlide) => void
  onDelete: (id: string) => void
}

export default function HeroItem({ slide, onEdit, onDelete }: HeroItemProps) {
  return (
    <div className="p-6 flex items-center gap-6">
      <div className="flex-shrink-0 w-40 aspect-[5/3] rounded overflow-hidden bg-white border border-gray-200">
        <img
          src={slide.image_url}
          alt={`히어로 슬라이드 ${slide.sort_order}`}
          className="h-full w-full object-contain object-center"
        />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-sm text-gray-600">순서: {slide.sort_order}</span>
          {slide.link_url && (
            <span className="text-xs text-blue-600">링크 있음</span>
          )}
        </div>
        <p className="text-xs text-gray-500 truncate max-w-[200px]" title={slide.image_url}>{slide.image_url}</p>
        {slide.link_url && (
          <p className="text-xs text-blue-600 truncate max-w-[200px] mt-1" title={slide.link_url}>
            → {slide.link_url.length > 45 ? `${slide.link_url.slice(0, 42)}…` : slide.link_url}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onEdit(slide)}
          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
        >
          수정
        </button>
        <button
          onClick={() => onDelete(slide.id)}
          className="px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200"
        >
          삭제
        </button>
      </div>
    </div>
  )
}

