'use client'

import { useEffect, useState } from 'react'
import { supabase, Product, isSupabaseConfigured } from '@/lib/supabase/supabase'
import { getRecentlyViewed } from '@/lib/recently-viewed/recently-viewed'
import { enrichProducts } from '@/lib/product/product-client'
import ProductCardSkeleton from './skeletons/ProductCardSkeleton'
import ProductCard from './ProductCard'

export default function RecentlyViewedSection() {
  const [recentProducts, setRecentProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRecentProducts = async () => {
      if (!isSupabaseConfigured) {
        setLoading(false)
        return
      }

      try {
        const recentIds = getRecentlyViewed()
        
        if (recentIds.length === 0) {
          setRecentProducts([])
          setLoading(false)
          return
        }

        // UUID 형식인지 확인하는 함수
        const isUUID = (str: string): boolean => {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          return uuidRegex.test(str)
        }

        // UUID와 slug 분리
        const uuids = recentIds.filter(id => isUUID(id))
        const slugs = recentIds.filter(id => !isUUID(id))

        let allProducts: Product[] = []

        // 프로모션 정보도 포함하여 조회
        const selectFields = `
          id,
          slug,
          brand,
          name,
          price,
          category,
          average_rating,
          review_count,
          weight_gram,
          status,
          promotion_products (
            promotion_id,
            promotions (
              id,
              type,
              buy_qty,
              discount_percent,
              is_active
            )
          )
        `

        // UUID로 조회
        if (uuids.length > 0) {
          const { data: uuidData, error: uuidError } = await supabase
            .from('products')
            .select(selectFields)
            .in('id', uuids)
          
          if (uuidError) throw uuidError
          if (uuidData) allProducts = [...allProducts, ...uuidData]
        }

        // slug로 조회
        if (slugs.length > 0) {
          const { data: slugData, error: slugError } = await supabase
            .from('products')
            .select(selectFields)
            .in('slug', slugs)
          
          if (slugError) throw slugError
          if (slugData) {
            // 중복 제거: 이미 UUID로 조회된 상품은 제외
            const existingIds = new Set(allProducts.map(p => p.id))
            const newProducts = slugData.filter((p: Product) => !existingIds.has(p.id))
            allProducts = [...allProducts, ...newProducts]
          }
        }

        // 중복 제거 (같은 상품이 UUID와 slug로 각각 조회될 수 있음)
        const uniqueProducts = new Map<string, Product>()
        allProducts.forEach((p: Product) => {
          if (!uniqueProducts.has(p.id)) {
            uniqueProducts.set(p.id, p)
          }
        })

        // 최근 본 순서대로 정렬 (localStorage 순서 유지)
        let orderedProducts = recentIds
          .map(id => {
            // UUID인 경우 id로 찾기, slug인 경우 slug로 찾기
            return Array.from(uniqueProducts.values()).find((p: Product) => 
              isUUID(id) ? p.id === id : p.slug === id
            )
          })
          .filter((p): p is Product => p !== undefined)
          // 중복 제거 (같은 상품이 여러 번 나타날 수 있음)
          .filter((p, index, self) => index === self.findIndex(pr => pr.id === p.id))

        // 이미지 보강 (product_images에서 가져오기)
        if (orderedProducts.length > 0) {
          try {
            const productIds = orderedProducts.map((p: Product) => p.id)
            const { data: imagesData } = await supabase
              .from('product_images')
              .select('product_id, image_url, priority')
              .in('product_id', productIds)
              .order('priority', { ascending: true })
              .order('created_at', { ascending: true })
            
            if (imagesData && imagesData.length > 0) {
              const imageMap = new Map<string, string>()
              for (const img of imagesData) {
                const existing = imageMap.get(img.product_id)
                if (!existing) {
                  imageMap.set(img.product_id, img.image_url)
                } else {
                  const existingImg = imagesData.find((i: any) => i.product_id === img.product_id && i.image_url === existing)
                  if (existingImg && img.priority < existingImg.priority) {
                    imageMap.set(img.product_id, img.image_url)
                  }
                }
              }
              
              orderedProducts = orderedProducts.map((p: Product) => ({
                ...p,
                image_url: imageMap.get(p.id) || null
              }))
            } else {
              orderedProducts = orderedProducts.map((p: Product) => ({ ...p, image_url: null }))
            }
          } catch (error) {
            console.error('이미지 보강 실패:', error)
            orderedProducts = orderedProducts.map((p: Product) => ({ ...p, image_url: null }))
          }
        }

        // 공통 유틸리티 함수로 상품 데이터 보강
        const enrichedProducts = await enrichProducts(orderedProducts)
        setRecentProducts(enrichedProducts as Product[])
      } catch (error) {
        console.error('최근 본 상품 조회 실패:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRecentProducts()
  }, [])

  if (loading) {
    return (
      <section className="py-4 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-bold text-primary-900">최근 본 상품</h2>
          </div>
          <div className="flex gap-4 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[180px]">
                <ProductCardSkeleton />
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (recentProducts.length === 0) {
    return null
  }

  return (
    <section className="py-4 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-bold text-primary-900">최근 본 상품</h2>
        </div>

        <div
          className="flex gap-4 overflow-x-auto pb-2"
          style={{ 
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {recentProducts.map((product) => (
            <div key={product.id} className="flex-shrink-0 w-[180px]">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        [class*="overflow-x-auto"]::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  )
}

