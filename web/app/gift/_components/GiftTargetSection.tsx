'use client'

import { Product } from '@/lib/supabase/supabase'
import { GiftTarget } from '@/lib/gift'
import GiftProductCard, { GiftProductWithPromotion } from './GiftProductCard'

interface GiftTargetSectionProps {
  selectedTarget: GiftTarget | null
  products: Product[]
  loading: boolean
  onTargetChange: (target: GiftTarget | null) => void
}

const TARGETS: GiftTarget[] = ['아이', '부모님', '연인', '친구']

export default function GiftTargetSection({
  selectedTarget,
  products,
  loading,
  onTargetChange,
}: GiftTargetSectionProps) {
  return (
    <section className="container mx-auto px-4 mb-8">
      <h2 className="text-lg font-semibold mb-4">맞춤 선물이 고민된다면</h2>
      <div className="flex gap-2 mb-4">
        {TARGETS.map((target) => (
          <button
            key={target}
            onClick={() => onTargetChange(selectedTarget === target ? null : target)}
            className={`px-4 py-2.5 text-base rounded-lg font-medium transition flex-shrink-0 ${
              selectedTarget === target
                ? 'bg-red-600 text-white hover:bg-red-600'
                : 'bg-white border border-gray-300 text-gray-900 hover:bg-gray-50'
            }`}
          >
            {target}
          </button>
        ))}
      </div>
      {selectedTarget && (
        <>
          {loading ? (
            <div>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-4 mb-4">
                  <div className="w-28 h-28 bg-gray-200 rounded-md animate-pulse"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {products.map((product) => (
                <GiftProductCard
                  key={product.id}
                  product={product as GiftProductWithPromotion}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>{selectedTarget}에게 추천하는 선물세트가 없습니다.</p>
            </div>
          )}
        </>
      )}
    </section>
  )
}

