import { HeroSlide } from '../_types'

interface HeroItemProps {
  slide: HeroSlide
  onEdit: (slide: HeroSlide) => void
  onDelete: (id: string) => void
  onToggleActive: (slide: HeroSlide) => void
}

export default function HeroItem({ slide, onEdit, onDelete, onToggleActive }: HeroItemProps) {
  return (
    <div className="p-6 flex items-center gap-6">
      <div className="flex-shrink-0">
        <img
          src={slide.image_url}
          alt={`히어로 슬라이드 ${slide.sort_order}`}
          className="w-32 h-20 object-cover rounded"
        />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-2">
          <span className={`px-2 py-1 text-xs rounded ${
            slide.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
          }`}>
            {slide.is_active ? '활성' : '비활성'}
          </span>
          <span className="text-sm text-gray-600">순서: {slide.sort_order}</span>
          {slide.link_url && (
            <span className="text-xs text-blue-600">링크 있음</span>
          )}
        </div>
        <p className="text-xs text-gray-500 truncate">{slide.image_url}</p>
        {slide.link_url && (
          <p className="text-xs text-blue-600 truncate mt-1">→ {slide.link_url}</p>
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onToggleActive(slide)}
          className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
        >
          {slide.is_active ? '비활성화' : '활성화'}
        </button>
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

