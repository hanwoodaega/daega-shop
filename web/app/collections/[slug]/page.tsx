'use client'

import { useEffect, useState, Suspense, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import BottomNavbar from '@/components/BottomNavbar'
import ScrollToTop from '@/components/common/ScrollToTop'
import PromotionModalWrapper from '@/components/PromotionModalWrapper'
import { Product } from '@/lib/supabase'
import ProductCard from '@/components/ProductCard'
import ProductCardSkeleton from '@/components/skeletons/ProductCardSkeleton'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants'

function CollectionContent({ slug }: { slug: string }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const collectionSlug = slug
  
  const [collection, setCollection] = useState<any>(null)
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [sortOrder, setSortOrder] = useState<'default' | 'price_asc' | 'price_desc'>('default')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const isFetchingRef = useRef(false)

  const fetchCollection = useCallback(async (pageNum: number = 1, sort: 'default' | 'price_asc' | 'price_desc' = 'default') => {
    if (isFetchingRef.current) return
    
    isFetchingRef.current = true
    setLoading(pageNum === 1)
    setLoadingMore(pageNum > 1)
    
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: DEFAULT_PAGE_SIZE.toString(),
        sort: sort,
      })

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(`/api/collections/${collectionSlug}?${params.toString()}`, { 
        cache: 'no-store',
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error('컬렉션 조회 실패')
      }

      const data = await response.json()
      
      if (pageNum === 1) {
        setCollection(data.collection)
        setDisplayedProducts(data.products || [])
      } else {
        setDisplayedProducts(prev => {
          const existingIds = new Set(prev.map((p: any) => p.id))
          const newProducts = (data.products || []).filter((p: any) => !existingIds.has(p.id))
          return [...prev, ...newProducts]
        })
      }
      
      setHasMore(pageNum < data.totalPages)
    } catch (error: any) {
      console.error('컬렉션 조회 실패:', error)
      if (error.name === 'AbortError') {
        alert('컬렉션을 불러오는데 시간이 오래 걸립니다. 잠시 후 다시 시도해주세요.')
      }
    } finally {
      isFetchingRef.current = false
      setLoading(false)
      setLoadingMore(false)
    }
  }, [collectionSlug])

  useEffect(() => {
    if (collectionSlug) {
      setPage(1)
      setDisplayedProducts([])
      fetchCollection(1, sortOrder)
    }
  }, [collectionSlug, sortOrder])

  useEffect(() => {
    if (page > 1) {
      fetchCollection(page, sortOrder)
    }
  }, [page])

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      setPage(prev => prev + 1)
    }
  }

  useEffect(() => {
    const handleScroll = () => {
      if (loadingMore || !hasMore) return
      
      const scrollHeight = document.documentElement.scrollHeight
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop
      const clientHeight = document.documentElement.clientHeight
      
      if (scrollTop + clientHeight >= scrollHeight - 500) {
        handleLoadMore()
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [loadingMore, hasMore])

  if (!collection && !loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-20 text-center">
          <p className="text-xl text-gray-600 mb-4">컬렉션을 찾을 수 없습니다</p>
          <Link href="/">
            <button className="px-6 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800">
              홈으로 가기
            </button>
          </Link>
        </main>
        <Footer />
        <BottomNavbar />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* 히어로 섹션 */}
        {collection && (
          <section className={`${
            collection.type === 'best' 
              ? 'bg-gradient-to-r from-yellow-600 to-orange-600' 
              : collection.type === 'sale'
              ? 'bg-gradient-to-r from-red-600 to-red-700'
              : 'bg-gradient-to-r from-blue-600 to-blue-700'
          } text-white py-16`}>
            <div className="container mx-auto px-4 text-center">
              <h1 className="text-4xl font-bold mb-2">
                {collection.type === 'best' && '👑 '}
                {collection.type === 'sale' && '🔥 '}
                {collection.type === 'best' ? '베스트' :
                 collection.type === 'sale' ? '특가' :
                 collection.type === 'no9' ? '한우대가 NO.9' :
                 collection.type === 'timedeal' ? (collection.title || '타임딜') : ''}
              </h1>
              <p className="text-sm tracking-widest opacity-90">
                {collection.type === 'best' && 'BEST SELLERS'}
                {collection.type === 'sale' && 'HOT DEALS'}
              </p>
            </div>
          </section>
        )}

        <div className="container mx-auto px-4 py-4 pt-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-xl font-bold mb-1">
                {collection?.type === 'best' ? '베스트' :
                 collection?.type === 'sale' ? '특가' :
                 collection?.type === 'no9' ? '한우대가 NO.9' :
                 collection?.type === 'timedeal' ? (collection?.title || '타임딜') : ''}
              </h1>
              {displayedProducts.length > 0 && (
                <p className="text-gray-600 text-sm">
                  {displayedProducts.length}개의 상품
                </p>
              )}
            </div>
            <select
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value as 'default' | 'price_asc' | 'price_desc')
                setPage(1)
                setDisplayedProducts([])
              }}
              className="px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-800 focus:border-transparent transition"
            >
              <option value="default">최신순</option>
              <option value="price_asc">낮은 가격순</option>
              <option value="price_desc">높은 가격순</option>
            </select>
          </div>

          {/* 상품 그리드 */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-3 sm:gap-4">
              {[...Array(8)].map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : displayedProducts.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-xl text-gray-600 mb-2">
                등록된 상품이 없습니다
              </p>
              <Link href="/products">
                <button className="mt-4 px-6 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition">
                  전체 상품 보기
                </button>
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-3 sm:gap-4">
                {displayedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              
              {/* 무한 스크롤 로딩 */}
              {loadingMore && (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-800"></div>
                </div>
              )}
              
              {/* 모든 상품 로드 완료 */}
              {!hasMore && displayedProducts.length > 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500">모든 상품을 확인하셨습니다 ✨</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <ScrollToTop />
      <Footer />
      <BottomNavbar />
      <PromotionModalWrapper />
    </div>
  )
}

export default function CollectionPage({ params }: { params: { slug: string } }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-4 pt-6">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-3 sm:gap-4">
            {[...Array(8)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </main>
        <Footer />
        <BottomNavbar />
      </div>
    }>
      <CollectionContent slug={params.slug} />
    </Suspense>
  )
}

