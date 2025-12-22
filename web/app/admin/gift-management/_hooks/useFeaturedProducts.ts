import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Product } from '@/lib/supabase/supabase'
import { fetchCategoryBySlug, fetchCategoryProducts, normalizeCategoryProduct } from '../_utils/fetchers'

export function useFeaturedProducts() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const featuredCategory = await fetchCategoryBySlug('featured')

      const products = featuredCategory
        ? await fetchCategoryProducts(featuredCategory.id)
        : []

      const featured = products
        .map((cp: any) => {
          const product = normalizeCategoryProduct(cp)
          if (!product) return null
          return {
            ...product,
            gift_featured_order: cp.priority,
            gift_featured: true,
          }
        })
        .filter((p: Product & { gift_featured_order: number; gift_featured: boolean } | null): p is Product & { gift_featured_order: number; gift_featured: boolean } => p !== null)

      // 정렬 (created_at 안전성 보장)
      featured.sort((a: Product & { gift_featured_order: number; gift_featured: boolean }, b: Product & { gift_featured_order: number; gift_featured: boolean }) => {
        const orderA = a.gift_featured_order ?? 999999
        const orderB = b.gift_featured_order ?? 999999
        if (orderA !== orderB) return orderA - orderB
        const dateA = new Date(a.created_at ?? 0).getTime()
        const dateB = new Date(b.created_at ?? 0).getTime()
        return dateB - dateA
      })

      setFeaturedProducts(featured as Product[])
    } catch (error) {
      console.error('상품 조회 실패:', error)
      toast.error('상품 조회에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  return {
    featuredProducts,
    loading,
    refetch: loadProducts,
  }
}

