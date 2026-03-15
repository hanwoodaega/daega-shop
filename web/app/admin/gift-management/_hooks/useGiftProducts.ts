import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Product } from '@/lib/supabase/supabase'
import { fetchAllCategories, fetchCategoryProducts, normalizeCategoryProduct } from '../_utils/fetchers'
import { getTargetSlug } from '../_utils/categorySlug'
import { GiftTarget } from '../_types'

const ALL = '전체'
const TARGET_SLUGS = ['child', 'parent', 'lover', 'friend'] as const

export function useGiftProducts(selectedTarget: string) {
  const [giftProducts, setGiftProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      // 모든 카테고리 조회 (한 번만)
      const allCategories = await fetchAllCategories()
      const targetCategories = allCategories.filter((c: any) =>
        TARGET_SLUGS.includes(c.slug as any)
      )

      // 선택된 대상에 따라 필터링
      let categoriesToFetch = targetCategories
      if (selectedTarget !== ALL) {
        const targetSlug = getTargetSlug(selectedTarget as GiftTarget)
        categoriesToFetch = targetCategories.filter((c: any) => c.slug === targetSlug)
      }

      // 병렬로 모든 카테고리의 상품 조회
      const productPromises = categoriesToFetch.map(async (category: any) => {
        const products = await fetchCategoryProducts(category.id)
        return products.map((cp: any) => {
          const product = normalizeCategoryProduct(cp)
          if (!product) return null
          return {
            ...product,
            gift_display_order: cp.priority,
            gift_target: [category.slug], // slug로 통일
          }
        })
      })

      const allProductsArrays = await Promise.all(productPromises)
      const allProducts = allProductsArrays.flat().filter((p): p is Product & { gift_display_order: number; gift_target: string[] } => p !== null)

      // 중복 제거 (id 기준) - 불변성 유지
      const uniqueProductsMap = new Map<string, Product & { gift_display_order: number; gift_target: string[] }>()
      for (const product of allProducts) {
        const existing = uniqueProductsMap.get(product.id)
        if (!existing) {
          uniqueProductsMap.set(product.id, { ...product })
        } else {
          // 같은 상품이 여러 카테고리에 있으면 새로운 객체로 병합
          uniqueProductsMap.set(product.id, {
            ...existing,
            gift_target: Array.from(
              new Set([...existing.gift_target, ...product.gift_target])
            ),
            gift_display_order: Math.min(existing.gift_display_order, product.gift_display_order),
          })
        }
      }

      const uniqueProducts = Array.from(uniqueProductsMap.values())

      // 정렬 (created_at 안전성 보장)
      uniqueProducts.sort((a, b) => {
        const orderA = a.gift_display_order ?? 999999
        const orderB = b.gift_display_order ?? 999999
        if (orderA !== orderB) return orderA - orderB
        const dateA = new Date(a.created_at ?? 0).getTime()
        const dateB = new Date(b.created_at ?? 0).getTime()
        return dateB - dateA
      })

      setGiftProducts(uniqueProducts as Product[])
    } catch (error) {
      console.error('상품 조회 실패:', error)
      toast.error('상품 조회에 실패했습니다', { duration: 3000 })
    } finally {
      setLoading(false)
    }
  }, [selectedTarget])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  return {
    giftProducts,
    loading,
    refetch: loadProducts,
  }
}
