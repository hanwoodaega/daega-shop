'use client'

import { Collection } from '@/lib/collection'
import { useCollectionSection } from '@/lib/collection'
import CollectionSectionUI from '@/components/collection/CollectionSectionUI'

interface CollectionSectionContainerProps {
  collection: Collection & {
    color_theme?: any
  }
}

export default function CollectionSectionContainer({ collection }: CollectionSectionContainerProps) {
  const { products, loading } = useCollectionSection(collection.type || '')

  return (
    <CollectionSectionUI
      collection={collection}
      products={products}
      loading={loading}
    />
  )
}

