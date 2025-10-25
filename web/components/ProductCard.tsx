'use client'

import Link from 'next/link'
import { Product } from '@/lib/supabase'
import { useCartStore } from '@/lib/store'

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price)
  }

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (product.stock <= 0) {
      alert('품절된 상품입니다.')
      return
    }

    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      imageUrl: product.image_url,
      unit: product.unit,
    })

    alert('장바구니에 추가되었습니다.')
  }

  return (
    <Link href={`/products/${product.id}`}>
      <div className="bg-white rounded-lg overflow-hidden transition group border border-gray-100 shadow-sm hover:shadow-md">
        <div className="relative h-40 bg-gray-200 overflow-hidden">
          {product.stock <= 0 && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <span className="text-white text-xl font-bold">품절</span>
            </div>
          )}
          {/* 장바구니 버튼 */}
          <button
            onClick={handleAddToCart}
            className="absolute bottom-2 right-2 bg-white p-2 rounded-full shadow-md hover:bg-primary-800 hover:text-white transition z-10"
            aria-label="장바구니에 담기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </button>
        </div>
        <div className="p-4 group-active:bg-black group-active:text-white transition-colors duration-150">
          <h3 className="text-sm font-medium mb-3 line-clamp-1 text-primary-900">
            {product.name}
          </h3>
          <div className="flex justify-between items-center">
            <div>
              <span className="text-base font-bold text-primary-900">
                {formatPrice(product.price)}
              </span>
              <span className="text-gray-600 ml-1 text-sm">원</span>
              <span className="text-gray-500 text-xs ml-1">
                / {product.unit}
              </span>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {product.origin}
          </div>
        </div>
      </div>
    </Link>
  )
}

