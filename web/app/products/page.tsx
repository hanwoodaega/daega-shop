'use client'

import { useEffect, useState, Suspense, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import BottomNavbar from '@/components/BottomNavbar'
import ScrollToTop from '@/components/common/ScrollToTop'
import { supabase, Product } from '@/lib/supabase'
import ProductCard from '@/components/ProductCard'
import ProductCardSkeleton from '@/components/skeletons/ProductCardSkeleton'
import CategoryGrid from '@/components/CategoryGrid'
import { CATEGORIES } from '@/lib/constants'

function ProductsContent() {
  const searchParams = useSearchParams()
  const category = searchParams.get('category')
  const searchQuery = searchParams.get('search')
  const filter = searchParams.get('filter')
  
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(category || '전체')
  const [sortOrder, setSortOrder] = useState<'default' | 'price_asc' | 'price_desc'>('default')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const PAGE_SIZE = 20

  // URL 파라미터가 변경되면 selectedCategory 업데이트
  useEffect(() => {
    setSelectedCategory(category || '전체')
  }, [category])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase.from('products').select('*')
      
      // 검색어가 있으면 검색어 필터만 적용 (카테고리 무시)
      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,origin.ilike.%${searchQuery}%`)
      } else if (filter) {
        // 필터가 있으면 필터 적용
        if (filter === 'new') {
          query = query.eq('is_new', true)
        } else if (filter === 'best') {
          query = query.eq('is_best', true)
        } else if (filter === 'sale') {
          query = query.eq('is_sale', true)
        } else if (filter === 'budget') {
          query = query.eq('is_budget', true)
        }
      } else {
        // 검색어가 없을 때만 카테고리 필터 적용
        if (selectedCategory && selectedCategory !== '전체') {
          query = query.eq('category', selectedCategory)
        }
      }
      
      const { data, error } = await query.order('created_at', { ascending: false })
      
      if (error) throw error
      setAllProducts(data || [])
      // 처음 20개만 표시
      setDisplayedProducts((data || []).slice(0, PAGE_SIZE))
      setPage(1)
      setHasMore((data || []).length > PAGE_SIZE)
    } catch (error) {
      console.error('상품 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedCategory, searchQuery, filter])

  // 카테고리나 검색어가 변경되면 상품 조회
  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // 더 보기 함수
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return
    
    setLoadingMore(true)
    setTimeout(() => {
      const nextPage = page + 1
      const start = 0
      const end = nextPage * PAGE_SIZE
      
      let sortedProducts = [...allProducts]
      if (sortOrder === 'price_asc') {
        sortedProducts.sort((a, b) => a.price - b.price)
      } else if (sortOrder === 'price_desc') {
        sortedProducts.sort((a, b) => b.price - a.price)
      }
      
      setDisplayedProducts(sortedProducts.slice(start, end))
      setPage(nextPage)
      setHasMore(sortedProducts.length > end)
      setLoadingMore(false)
    }, 500)
  }, [allProducts, page, sortOrder, loadingMore, hasMore, PAGE_SIZE])

  // 정렬 변경 시 처음부터 다시 표시
  useEffect(() => {
    let sortedProducts = [...allProducts]
    if (sortOrder === 'price_asc') {
      sortedProducts.sort((a, b) => a.price - b.price)
    } else if (sortOrder === 'price_desc') {
      sortedProducts.sort((a, b) => b.price - a.price)
    }
    
    setDisplayedProducts(sortedProducts.slice(0, PAGE_SIZE))
    setPage(1)
    setHasMore(sortedProducts.length > PAGE_SIZE)
  }, [sortOrder, allProducts, PAGE_SIZE])

  // 무한 스크롤 감지
  useEffect(() => {
    const handleScroll = () => {
      // 페이지 맨 아래에서 300px 전에 로드 시작
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 300) {
        loadMore()
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [loadMore])

  const products = displayedProducts

  const categories = CATEGORIES

  const getPageTitle = () => {
    if (searchQuery) return `"${searchQuery}" 검색 결과`
    if (filter === 'new') return '신상품'
    if (filter === 'best') return '베스트'
    if (filter === 'sale') return '전단행사'
    if (filter === 'budget') return '알뜰상품'
    return selectedCategory
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* 히어로 섹션 - 신상품 */}
        {filter === 'new' && (
          <section className="bg-gradient-to-r from-green-600 to-green-700 text-white py-16">
            <div className="container mx-auto px-4 text-center">
              <h1 className="text-4xl font-bold mb-2">
                ✨ 신상품
              </h1>
              <p className="text-sm tracking-widest text-green-100">
                NEW ARRIVALS
              </p>
            </div>
          </section>
        )}

        {/* 히어로 섹션 - 베스트 */}
        {filter === 'best' && (
          <section className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white py-16">
            <div className="container mx-auto px-4 text-center">
              <h1 className="text-4xl font-bold mb-2">
                👑 베스트
              </h1>
              <p className="text-sm tracking-widest text-yellow-100">
                BEST SELLERS
              </p>
            </div>
          </section>
        )}

        {/* 히어로 섹션 - 전단행사 */}
        {filter === 'sale' && (
          <section className="bg-gradient-to-r from-red-600 to-red-700 text-white py-16">
            <div className="container mx-auto px-4 text-center">
              <h1 className="text-4xl font-bold mb-2">
                🔥 전단행사
              </h1>
              <p className="text-sm tracking-widest text-red-100">
                HOT DEALS
              </p>
            </div>
          </section>
        )}

        {/* 히어로 섹션 - 알뜰상품 */}
        {filter === 'budget' && (
          <section className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-16">
            <div className="container mx-auto px-4 text-center">
              <h1 className="text-4xl font-bold mb-2">
                💰 알뜰상품
              </h1>
              <p className="text-sm tracking-widest text-blue-100">
                BUDGET FRIENDLY
              </p>
            </div>
          </section>
        )}

        {/* 카테고리 - 모바일만 표시 */}
        {!searchQuery && !filter && (
          <section className="py-3 bg-gray-100 md:hidden">
            <div className="container mx-auto px-4">
              <CategoryGrid selectedCategory={selectedCategory} />
            </div>
          </section>
        )}
      
        <div className="container mx-auto px-4 py-4 pt-6">
        {/* 페이지 제목 & 정렬 */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-xl font-bold mb-1">
              {getPageTitle()}
            </h1>
            {searchQuery && (
              <p className="text-gray-600 text-sm">
                총 <span className="font-semibold text-primary-800">{products.length}</span>개의 상품을 찾았습니다
              </p>
            )}
          </div>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'default' | 'price_asc' | 'price_desc')}
            className="px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-800 focus:border-transparent transition"
          >
            <option value="default">최신순</option>
            <option value="price_asc">낮은 가격순</option>
            <option value="price_desc">높은 가격순</option>
          </select>
        </div>
        
        {/* 카테고리 필터 - 데스크탑만 표시 */}
        {!searchQuery && !filter && (
          <div className="hidden md:flex flex-wrap gap-2 mb-8">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  selectedCategory === cat
                    ? 'bg-primary-800 text-white shadow-md'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* 상품 그리드 */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-3 sm:gap-4">
            {[...Array(8)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-xl text-gray-600 mb-2">
              {searchQuery ? '검색 결과가 없습니다' : '등록된 상품이 없습니다'}
            </p>
            {searchQuery && (
              <Link href="/products">
                <button className="mt-4 px-6 py-2 bg-primary-800 text-white rounded-lg hover:bg-primary-900 transition">
                  전체 상품 보기
                </button>
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-3 sm:gap-4">
              {products.map((product) => (
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
            {!hasMore && products.length > 0 && (
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
    </div>
  )
}

export default function ProductsPage() {
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
      <ProductsContent />
    </Suspense>
  )
}

