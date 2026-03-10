'use client'

import { Product } from '@/lib/supabase/supabase'

export type ProductDescriptionImage = {
  id: string
  image_url: string
  sort_order: number
}

interface ProductDescriptionProps {
  product: Product
  descriptionComponent: React.ComponentType<{ productId: string; productName?: string }> | null
  descriptionImages?: ProductDescriptionImage[]
}

export default function ProductDescription({ product, descriptionComponent, descriptionImages = [] }: ProductDescriptionProps) {
  return (
    <div id="product-description-section" className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">상품 설명</h2>
      </div>
      <div className="border-b border-gray-200 mb-4"></div>

      {descriptionImages.length > 0 && (
        <div className="space-y-4 mb-8 max-w-[1000px] mx-auto">
          {descriptionImages.map((img) => (
            <img
              key={img.id}
              src={img.image_url}
              alt=""
              className="w-full h-auto"
              width={1000}
              loading="lazy"
            />
          ))}
        </div>
      )}

      {descriptionComponent ? (
        (() => {
          const Component = descriptionComponent
          return <Component productId={product.id} productName={product.name} />
        })()
      ) : descriptionImages.length === 0 ? (
        <p className="text-gray-500 text-sm">상품 설명이 준비 중입니다.</p>
      ) : null}
    </div>
  )
}

