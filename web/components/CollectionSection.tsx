'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Product, isSupabaseConfigured } from '@/lib/supabase/supabase'
import ProductCard from './ProductCard'
import ProductCardSkeleton from './skeletons/ProductCardSkeleton'

interface ColorTheme {
  background?: string
  accent?: string
  title_color?: string
  description_color?: string
}

interface Collection {
  id: string
  type: string
  title?: string | null
  description?: string | null
  image_url?: string | null
  color_theme?: ColorTheme | null
  sort_order?: number
  is_active?: boolean
}

interface CollectionSectionProps {
  collection: Collection
}

export default function CollectionSection({ collection }: CollectionSectionProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProducts = async () => {
      if (!isSupabaseConfigured) {
        setLoading(false)
        return
      }

      try {
        // 타임딜은 별도 API 사용
        const apiPath = collection.type === 'timedeal' 
          ? '/api/timedeals?limit=4'
          : `/api/collections/${collection.type}?limit=4`
        
        const response = await fetch(apiPath)
        
        if (!response.ok) {
          setProducts([])
          setLoading(false)
          return
        }

        const data = await response.json()
        
        // 타임딜은 timedeal 객체 사용, 다른 컬렉션은 collection 객체 사용
        const collectionData = collection.type === 'timedeal' ? data.timedeal : data.collection
        
        // 컬렉션이 없거나 상품이 없으면 빈 배열 반환
        if (!collectionData || !data.products || data.products.length === 0) {
          setProducts([])
          setLoading(false)
          return
        }

        // 타임딜 종료 시간 체크
        if (collection.type === 'timedeal' && collectionData.end_at) {
          const now = new Date()
          const endTime = new Date(collectionData.end_at)
          if (endTime <= now) {
            setProducts([])
            setLoading(false)
            return
          }
        }

        // 상품 데이터 변환
        const activeProducts = (data.products || []).map((product: any) => ({
          ...product
        } as Product))
        setProducts(activeProducts as any)
      } catch (error) {
        console.error('상품 조회 실패:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
    
    // 타임딜은 1분마다 갱신
    if (collection.type === 'timedeal') {
      const interval = setInterval(fetchProducts, 60000)
      return () => clearInterval(interval)
    }
  }, [collection.type])

  const theme = collection.color_theme || {
    background: '#F3E9D7',
    title_color: '#2A2A2A',
    description_color: '#7A6F62',
    accent: '#D9C79E',
  }

  // 전체보기 링크 생성 (항상 /collections/{type}으로)
  const getViewAllLink = () => {
    return `/collections/${collection.type}`
  }

  if (loading) {
    return (
      <section className="py-6" style={{ backgroundColor: theme.background || '#F3E9D7' }}>
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <div className="flex flex-col gap-2">
              {collection.description && (
                <p 
                  className="md:text-[26px] text-[22px]" 
                  style={{ 
                    color: theme.description_color || '#7A6F62',
                    fontFamily: 'Pretendard, sans-serif',
                    fontWeight: 700,
                    lineHeight: '1.5',
                    letterSpacing: '-0.5px',
                    whiteSpace: 'pre-line'
                  }}
                >
                  {collection.description}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i}>
                <ProductCardSkeleton />
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (products.length === 0) {
    return null
  }

  return (
    <section className="pt-6 overflow-x-hidden" style={{ backgroundColor: theme.background || '#F3E9D7' }}>
      <div className="container mx-auto px-2">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex flex-col gap-1 w-[96%] mx-auto">
              {collection.description && (
                <div className="flex items-center justify-between">
                  <p 
                    className="md:text-[26px] text-[22px] flex-1" 
                    style={{ 
                      color: theme.description_color || '#7A6F62',
                      fontFamily: 'Pretendard, sans-serif',
                      fontWeight: 700,
                      lineHeight: '1.5',
                      letterSpacing: '-0.5px',
                      whiteSpace: 'pre-line'
                    }}
                  >
                    {collection.description}
                  </p>
                  <Link href={getViewAllLink()}>
                    <button className="flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 hover:opacity-80 transition flex-shrink-0" style={{ color: theme.description_color || '#7A6F62' }}>
                      <span>전체보기</span>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </Link>
                </div>
              )}
              {collection.image_url && (
                <div className="mt-2 mb-0 relative w-full" style={{ aspectRatio: '16 / 9' }}>
                  <Image
                    src={collection.image_url}
                    alt={collection.title || collection.description || '컬렉션 이미지'}
                    fill
                    className="object-cover rounded-sm"
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 100vw, 100vw"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white pt-6 pb-4 -mx-2 px-3 relative z-10">
        <div className="grid grid-cols-2 gap-3 px-3 bg-white">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        
        {/* 전체보기 버튼 */}
        <div className="mt-4 px-4 pb-4 bg-white">
          <Link href={getViewAllLink()} className="block">
            <button className="w-full px-2 py-2.5 rounded-lg font-semibold hover:opacity-90 transition flex items-center justify-center gap-2 bg-white text-black border border-gray-300">
              <span>전체보기</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </Link>
        </div>
      </div>
      <div className="bg-white h-8 -mt-4"></div>
    </section>
  )
}

