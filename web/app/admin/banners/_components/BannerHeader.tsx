'use client'

interface BannerHeaderProps {
  onCreateClick: () => void
}

export default function BannerHeader({ onCreateClick }: BannerHeaderProps) {

  return (
    <div className="flex items-center justify-end mb-6">
      <button
        onClick={onCreateClick}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      >
        새 배너
      </button>
    </div>
  )
}

