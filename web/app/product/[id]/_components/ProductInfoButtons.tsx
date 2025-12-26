'use client'

import { useRouter } from 'next/navigation'
import { Product } from '@/lib/supabase/supabase'

interface ProductInfoButtonsProps {
  product: Product
}

export default function ProductInfoButtons({ product }: ProductInfoButtonsProps) {
  const router = useRouter()

  return (
    <div className="container mx-auto px-2 py-2">
      <div className="grid grid-cols-2 gap-2">
        {/* 상품고시정보 */}
        <button
          onClick={() => {
            const slugOrId = product?.slug || product?.id
            if (slugOrId) {
              router.push(`/product/${slugOrId}/product-info`)
            }
          }}
          className="bg-white border border-gray-300 py-2 px-2 flex items-center justify-between hover:bg-gray-50 transition"
        >
          <span className="text-sm text-gray-900 font-medium">상품고시정보</span>
          <span className="text-gray-600 text-lg">❯</span>
        </button>

        {/* 교환/반품/환불 안내 */}
        <button
          onClick={() => router.push('/refund')}
          className="bg-white border border-gray-300 py-2 px-2 flex items-center justify-between hover:bg-gray-50 transition"
        >
          <span className="text-sm text-gray-900 font-medium">교환/반품/환불 안내</span>
          <span className="text-gray-600 text-lg">❯</span>
        </button>
      </div>
    </div>
  )
}

