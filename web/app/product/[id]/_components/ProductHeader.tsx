'use client'

import { useRouter } from 'next/navigation'
import { Product } from '@/lib/supabase/supabase'
import { useCartStore } from '@/lib/store'
import { formatWeightGram } from '@/lib/utils/utils'

interface ProductHeaderProps {
  product: Product | null
  cartCount: number
  mounted: boolean
}

export default function ProductHeader({ product, cartCount, mounted }: ProductHeaderProps) {
  const router = useRouter()

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
      <div className="container mx-auto px-4 h-14 md:h-16 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-800 hover:text-gray-900 transition max-w-[70%]"
          aria-label="뒤로가기"
        >
          <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {product && (
            <div className="flex flex-col leading-tight overflow-hidden">
              {product.brand && (
                <span className="hidden md:block text-sm md:text-base font-medium text-gray-700 truncate">
                  {product.brand}
                </span>
              )}
              <span className="text-lg md:text-3xl font-semibold text-gray-900 truncate">
                {product.name}
                {product.weight_gram && product.weight_gram > 0 && (
                  <span className="ml-1 font-normal text-gray-700">
                    {formatWeightGram(product.weight_gram)}
                  </span>
                )}
              </span>
            </div>
          )}
        </button>
        
        {/* 장바구니 버튼 */}
        <button
          onClick={() => router.push('/cart')}
          className="p-2 hover:bg-gray-100 rounded-full transition relative"
          aria-label="장바구니"
        >
          <svg className="w-8 h-8 md:w-9 md:h-9 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {mounted && cartCount > 0 && (
            <span
              className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
              suppressHydrationWarning
              aria-hidden={cartCount <= 0}
            >
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}

