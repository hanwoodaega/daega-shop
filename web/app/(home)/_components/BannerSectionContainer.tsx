'use client'

import { useBanners } from '@/lib/banner'
import BannerSectionUI from '@/components/banner/BannerSectionUI'

export default function BannerSectionContainer() {
  const { banners, loading } = useBanners()

  if (loading) {
    return null
  }

  return <BannerSectionUI banners={banners} />
}

