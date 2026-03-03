import { useState, useEffect, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { Product } from '@/lib/supabase/supabase'
import { throttle } from '@/lib/utils/utils'
import { Collection } from './collection.types'
import { fetchCollection, fetchCollectionSection } from './collection.service'

interface UseCollectionProductsReturn {
  collection: Collection | null
  products: Product[]
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  sortOrder: 'default' | 'price_asc' | 'price_desc'
  setSortOrder: (sort: 'default' | 'price_asc' | 'price_desc') => void
  loadMore: () => void
}

export function useCollectionProducts(
  slug: string,
  initialData?: { collection: Collection | null; products: Product[]; totalPages?: number }
): UseCollectionProductsReturn {
  const hasInitialData = typeof initialData !== 'undefined'
  const [collection, setCollection] = useState<Collection | null>(initialData?.collection ?? null)
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>(initialData?.products ?? [])
  const [loading, setLoading] = useState(!hasInitialData)
  const [loadingMore, setLoadingMore] = useState(false)
  const [sortOrder, setSortOrder] = useState<'default' | 'price_asc' | 'price_desc'>('default')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(
    hasInitialData ? (initialData?.totalPages ?? 0) > 1 : true
  )
  const isFetchingRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const requestIdRef = useRef(0) // Race Condition 방지용
  const initialSlugRef = useRef(slug)
  const initialDataUsedRef = useRef(hasInitialData)

  const fetchCollectionData = useCallback(async (pageNum: number = 1, sort: 'default' | 'price_asc' | 'price_desc' = 'default') => {
    // 중복 요청 방지: 무한스크롤만 차단, 초기 로딩/sort 변경은 항상 실행
    const isInitialLoad = pageNum === 1
    if (isFetchingRef.current && !isInitialLoad) return
    
    // 이전 요청이 있으면 abort
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // 새로운 요청 ID 생성 (Race Condition 방지)
    const requestId = ++requestIdRef.current
    
    isFetchingRef.current = true
    setLoading(pageNum === 1)
    setLoadingMore(pageNum > 1)
    
    const controller = new AbortController()
    abortControllerRef.current = controller
    let timeoutId: NodeJS.Timeout | null = null
    
    try {
      timeoutId = setTimeout(() => controller.abort(), 10000)

      const data = await fetchCollection({
        slug,
        page: pageNum,
        sort,
        signal: controller.signal,
      })

      // 요청 완료 시 timeout 정리
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }

      // Race Condition 체크: 이 요청이 더 이상 최신 요청이 아니면 무시
      if (requestId !== requestIdRef.current) {
        return // 오래된 요청 응답 → 무시
      }

      if (!data.collection) {
        if (requestId === requestIdRef.current) {
          setCollection(null)
          setDisplayedProducts([])
          setLoading(false)
          setLoadingMore(false)
          isFetchingRef.current = false
        }
        return
      }
      
      if (pageNum === 1) {
        setCollection(data.collection)
        setDisplayedProducts(data.products || [])
      } else {
        setDisplayedProducts(prev => {
          const seen = new Set(prev.map((p: any) => p.id))
          const result = [...prev] // 기존 배열 복사
          for (const p of data.products || []) {
            if (!seen.has(p.id)) {
              result.push(p)
              seen.add(p.id) // 다음 중복 체크를 위해 추가
            }
          }
          return result
        })
      }
      
      setHasMore(pageNum < data.totalPages)
    } catch (error: any) {
      // AbortError는 정상적인 취소 (페이지 이동 등)이므로 무시
      if (error.name === 'AbortError') {
        // 최신 요청이 abort된 경우에만 로딩 상태 해제
        if (requestId === requestIdRef.current) {
          isFetchingRef.current = false
          setLoading(false)
          setLoadingMore(false)
        }
        return // AbortError는 조용히 반환
      }
      
      // 사용자에게 에러 알림 (최신 요청일 때만)
      if (requestId === requestIdRef.current) {
        toast.error(error.message || '컬렉션을 불러오는데 실패했습니다')
      }
    } finally {
      // timeout 정리 보장
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      
      // 현재 요청이 마지막 요청인 경우에만 ref 초기화
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
      }
      
      // 이 요청이 최신 요청일 때만 로딩 상태 해제
      if (requestId === requestIdRef.current) {
        isFetchingRef.current = false
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }, [slug])

  // slug나 sortOrder 변경 시 첫 페이지부터 다시 로드
  useEffect(() => {
    if (slug) {
      if (
        initialDataUsedRef.current &&
        slug === initialSlugRef.current &&
        sortOrder === 'default'
      ) {
        setPage(1)
        setHasMore((initialData?.totalPages ?? 0) > 1)
        setLoading(false)
        initialDataUsedRef.current = false
        return
      }

      setPage(1)
      setDisplayedProducts([])
      fetchCollectionData(1, sortOrder)
    }
    
    // cleanup: 컴포넌트 언마운트나 의존성 변경 시 이전 요청 취소
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
      isFetchingRef.current = false
    }
  }, [slug, sortOrder, fetchCollectionData])

  // page 변경 시 추가 데이터 로드
  useEffect(() => {
    if (page > 1) {
      fetchCollectionData(page, sortOrder)
    }
  }, [page, sortOrder, fetchCollectionData])

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      setPage(prev => prev + 1)
    }
  }, [loadingMore, hasMore])

  // 무한 스크롤 처리
  useEffect(() => {
    const handleScroll = throttle(() => {
      if (loadingMore || !hasMore) return
      
      const scrollHeight = document.documentElement.scrollHeight
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop
      const clientHeight = document.documentElement.clientHeight
      
      if (scrollTop + clientHeight >= scrollHeight - 500) {
        handleLoadMore()
      }
    }, 300) // 300ms마다 최대 한 번만 실행

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [loadingMore, hasMore, handleLoadMore])

  const handleSortOrderChange = useCallback((newSort: 'default' | 'price_asc' | 'price_desc') => {
    setSortOrder(newSort)
    setPage(1)
    setDisplayedProducts([])
  }, [])

  return {
    collection,
    products: displayedProducts,
    loading,
    loadingMore,
    hasMore,
    sortOrder,
    setSortOrder: handleSortOrderChange,
    loadMore: handleLoadMore,
  }
}

// 홈페이지용: 컬렉션 섹션 훅
interface UseCollectionSectionReturn {
  products: Product[]
  loading: boolean
}

export function useCollectionSection(collectionType: string): UseCollectionSectionReturn {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProducts = useCallback(async () => {
    try {
      const data = await fetchCollectionSection({
        collectionType,
      })

      setProducts(data.products || [])
    } catch (error) {
      console.error('상품 조회 실패:', error)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [collectionType])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  return {
    products,
    loading,
  }
}

// 홈페이지용: 컬렉션 섹션 데이터(컬렉션 정보 포함)
interface UseCollectionSectionDataReturn {
  collection: Collection | null
  products: Product[]
  loading: boolean
}

export function useCollectionSectionData(collectionType: string): UseCollectionSectionDataReturn {
  const [collection, setCollection] = useState<Collection | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProducts = useCallback(async () => {
    try {
      const data = await fetchCollectionSection({
        collectionType,
      })

      setCollection(data.collection || null)
      setProducts(data.products || [])
    } catch (error) {
      console.error('컬렉션 섹션 조회 실패:', error)
      setCollection(null)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [collectionType])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  return {
    collection,
    products,
    loading,
  }
}
