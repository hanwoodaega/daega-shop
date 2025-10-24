'use client'

import Link from 'next/link'
import { Product } from '@/lib/supabase'

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price)
  }

  return (
    <Link href={`/products/${product.id}`}>
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition group">
        <div className="relative h-64 bg-gray-200 overflow-hidden">
          <img
            src={product.image_url || 'https://via.placeholder.com/400x300?text=상품이미지'}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
          />
          {product.stock <= 0 && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <span className="text-white text-xl font-bold">품절</span>
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="text-sm text-primary-600 font-medium mb-1">
            {product.category}
          </div>
          <h3 className="text-lg font-semibold mb-2 line-clamp-1">
            {product.name}
          </h3>
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {product.description}
          </p>
          <div className="flex justify-between items-center">
            <div>
              <span className="text-2xl font-bold text-gray-900">
                {formatPrice(product.price)}
              </span>
              <span className="text-gray-600 ml-1">원</span>
              <span className="text-gray-500 text-sm ml-1">
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

