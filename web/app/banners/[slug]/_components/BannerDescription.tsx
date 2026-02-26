interface BannerDescriptionProps {
  subtitle_black?: string | null
  subtitle_red?: string | null
  description?: string | null
}

export default function BannerDescription({
  subtitle_black,
  subtitle_red,
  description,
}: BannerDescriptionProps) {
  if (!subtitle_black && !subtitle_red && !description) {
    return null
  }

  return (
    <div className="mb-6">
      <div className="mb-3">
        {subtitle_black && (
          <h2 className="text-xl md:text-2xl font-bold text-black mb-1 whitespace-pre-line tracking-tight leading-tight">
            {subtitle_black}
          </h2>
        )}
        {subtitle_red && (
          <h2 className="text-xl md:text-2xl font-bold text-red-600 mb-0 whitespace-pre-line tracking-tight leading-tight">
            {subtitle_red}
          </h2>
        )}
      </div>
      {description && (
        <p className="text-sm md:text-base text-gray-600 whitespace-pre-line leading-relaxed">
          {description}
        </p>
      )}
    </div>
  )
}

