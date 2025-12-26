'use client'

import { Product } from '@/lib/supabase/supabase'
import ProductCard from '@/components/ProductCard'
import ProductCardSkeleton from '@/components/skeletons/ProductCardSkeleton'

interface ProductsGridProps {
  products: Product[]
  loading: boolean
  loadingMore?: boolean
}

export default function ProductsGrid({ products, loading, loadingMore = false }: ProductsGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {[...Array(8)].map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return null // 빈 상태는 ProductsEmpty 컴포넌트에서 처리
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      
      {loadingMore && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-800"></div>
        </div>
      )}
    </>
  )
}

