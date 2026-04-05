import Link from 'next/link'
import { Banner } from '@/lib/banner'

interface BannerSectionUIProps {
  banners: Banner[]
}

export default function BannerSectionUI({ banners }: BannerSectionUIProps) {
  const withImage = banners.filter((b) => b.image_url && String(b.image_url).trim())

  if (withImage.length === 0) {
    return null
  }

  return (
    <div className="container mx-auto px-0 lg:px-2">
      <div className="grid gap-0 lg:gap-2 lg:grid-cols-3">
        {withImage.map((banner) => {
          const alt =
            banner.title || banner.subtitle_black || banner.subtitle_red || '배너'

          const card = (
            <div className="relative aspect-[2/1] w-full overflow-hidden rounded-none bg-neutral-100 lg:rounded-lg">
              <img
                src={banner.image_url!}
                alt={alt}
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
          )

          if (banner.slug) {
            const href = banner.slug.startsWith('/') ? banner.slug : `/banners/${banner.slug}`
            return (
              <Link key={banner.id} href={href} prefetch={false} className="block">
                {card}
              </Link>
            )
          }

          return (
            <div key={banner.id}>
              {card}
            </div>
          )
        })}
      </div>
    </div>
  )
}
