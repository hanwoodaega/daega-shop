import { HeroSlide } from '../_types'
import HeroItem from './HeroItem'

interface HeroListProps {
  slides: HeroSlide[]
  onEdit: (slide: HeroSlide) => void
  onDelete: (id: string) => void
}

export default function HeroList({ slides, onEdit, onDelete }: HeroListProps) {
  if (slides.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        등록된 히어로 이미지가 없습니다
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="divide-y divide-gray-200">
        {slides.map((slide) => (
          <HeroItem
            key={slide.id}
            slide={slide}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  )
}

