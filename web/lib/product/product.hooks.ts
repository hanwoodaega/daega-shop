import { useState, useEffect, useCallback, useRef } from 'react'
import { Product } from '@/lib/supabase/supabase'
import { ProductSortOrder, ProductFilter, FetchProductsParams } from './product.types'
import { DEFAULT_PAGE_SIZE } from '@/lib/utils/constants'

interface UseProductsQueryParams {
  category?: string
  search?: string
  filter?: ProductFilter
  sort?: ProductSortOrder
}

interface UseProductsQueryReturn {
  products: Product[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useProductsQuery(params: UseProductsQueryParams): UseProductsQueryReturn {
  const { category, search, filter, sort = 'default' } = params
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const isFetchingRef = useRef(false)

  const refetch = useCallback(async () => {
    if (isFetchingRef.current) return

    isFetchingRef.current = true
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('page', String(1))
      params.set('limit', String(DEFAULT_PAGE_SIZE))
      if (sort) params.set('sort', sort)
      if (category) params.set('category', category)
      if (search) params.set('search', search)
      if (filter) params.set('filter', filter)

      const response = await fetch(`/api/products?${params.toString()}`)
      if (!response.ok) {
        throw new Error('상품을 불러오는데 실패했습니다.')
      }
      const data = await response.json()
      setProducts(data.products || [])
    } catch (err: any) {
      setError(err)
      setProducts([])
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }, [category, search, filter, sort])

  useEffect(() => {
    refetch()
  }, [refetch])

  return {
    products,
    loading,
    error,
    refetch,
  }
}

interface UseInfiniteProductsParams {
  category?: string
  search?: string
  filter?: ProductFilter
  sort?: ProductSortOrder
}

interface UseInfiniteProductsReturn {
  displayedProducts: Product[]
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  loadMore: () => void
  reset: () => void
}

export function useInfiniteProducts(params: UseInfiniteProductsParams): UseInfiniteProductsReturn {
  const { category, search, filter, sort = 'default' } = params
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const isFetchingRef = useRef(false)

  const fetchProductsPage = useCallback(async (pageNum: number) => {
    if (isFetchingRef.current) return

    isFetchingRef.current = true
    setLoading(pageNum === 1)
    setLoadingMore(pageNum > 1)

    try {
      const params = new URLSearchParams()
      params.set('page', String(pageNum))
      params.set('limit', String(DEFAULT_PAGE_SIZE))
      if (sort) params.set('sort', sort)
      if (category) params.set('category', category)
      if (search) params.set('search', search)
      if (filter) params.set('filter', filter)

      const response = await fetch(`/api/products?${params.toString()}`)
      if (!response.ok) {
        throw new Error('상품을 불러오는데 실패했습니다.')
      }
      const data = await response.json()

      const products = data.products || []

      if (pageNum === 1) {
        setDisplayedProducts(products)
      } else {
        // 중복 방지: 이미 있는 상품은 제외하고 추가
        setDisplayedProducts(prev => {
          const existingIds = new Set(prev.map((p: Product) => p.id))
          const newProducts = products.filter((p: Product) => !existingIds.has(p.id))
          return [...prev, ...newProducts]
        })
      }

      setHasMore(pageNum < data.totalPages)
    } catch (error: any) {
      console.error('상품 조회 실패:', error)
      if (error.name === 'AbortError') {
        alert('상품 목록을 불러오는데 시간이 오래 걸립니다. 잠시 후 다시 시도해주세요.')
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
      isFetchingRef.current = false
    }
  }, [category, search, filter, sort])

  // 초기 로드 및 파라미터 변경 시 리셋
  useEffect(() => {
    setPage(1)
    setDisplayedProducts([])
    fetchProductsPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, search, filter])

  // 정렬 변경 시 리셋
  useEffect(() => {
    setPage(1)
    setDisplayedProducts([])
    fetchProductsPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort])

  // 더 보기 함수
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || isFetchingRef.current) return

    const nextPage = page + 1
    setPage(nextPage)
    fetchProductsPage(nextPage)
  }, [page, loadingMore, hasMore, fetchProductsPage])

  // 리셋 함수
  const reset = useCallback(() => {
    setPage(1)
    setDisplayedProducts([])
    setHasMore(true)
    fetchProductsPage(1)
  }, [fetchProductsPage])

  // 무한 스크롤 감지
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 300) {
        loadMore()
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [loadMore])

  return {
    displayedProducts,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    reset,
  }
}

