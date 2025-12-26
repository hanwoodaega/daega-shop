import { useState, useEffect, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { Product } from '@/lib/supabase/supabase'
import { DEFAULT_PAGE_SIZE } from '@/lib/utils/constants'
import { throttle } from '@/lib/utils/utils'
import { Banner } from './banner.types'
import { fetchBannerPage, fetchBanners } from './banner.service'

interface UseBannerProductsReturn {
  banner: Banner | null
  products: Product[]
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  loadMore: () => void
}

export function useBannerProducts(slug: string): UseBannerProductsReturn {
  const [banner, setBanner] = useState<Banner | null>(null)
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const isFetchingRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const requestIdRef = useRef(0)

  const fetchBanner = useCallback(async (pageNum: number = 1) => {
    const isInitialLoad = pageNum === 1
    if (isFetchingRef.current && !isInitialLoad) return

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const requestId = ++requestIdRef.current

    isFetchingRef.current = true
    setLoading(pageNum === 1)
    setLoadingMore(pageNum > 1)

    const controller = new AbortController()
    abortControllerRef.current = controller
    let timeoutId: NodeJS.Timeout | null = null

    try {
      timeoutId = setTimeout(() => controller.abort(), 10000)

      const data = await fetchBannerPage({ slug, page: pageNum, limit: DEFAULT_PAGE_SIZE })

      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }

      if (requestId !== requestIdRef.current) {
        return
      }

      if (!data.banner) {
        setBanner(null)
        setDisplayedProducts([])
        setHasMore(false)
        return
      }

      if (pageNum === 1) {
        setBanner(data.banner)
        setDisplayedProducts(data.products || [])
      } else {
        setDisplayedProducts(prev => {
          const seen = new Set(prev.map((p: any) => p.id))
          const result = [...prev]
          for (const p of data.products || []) {
            if (!seen.has(p.id)) {
              result.push(p)
              seen.add(p.id)
            }
          }
          return result
        })
      }

      setHasMore(pageNum < data.totalPages)
    } catch (error: any) {
      if (error.name === 'AbortError') {
        if (requestId === requestIdRef.current) {
          isFetchingRef.current = false
          setLoading(false)
          setLoadingMore(false)
        }
        return
      }

      if (requestId === requestIdRef.current) {
        toast.error('배너를 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.')
      }
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
      }

      if (requestId === requestIdRef.current) {
        isFetchingRef.current = false
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }, [slug])

  useEffect(() => {
    if (slug) {
      setPage(1)
      setDisplayedProducts([])
      fetchBanner(1)
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
      isFetchingRef.current = false
    }
  }, [slug, fetchBanner])

  useEffect(() => {
    if (page > 1) {
      fetchBanner(page)
    }
  }, [page, fetchBanner])

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      setPage(prev => prev + 1)
    }
  }, [loadingMore, hasMore])

  useEffect(() => {
    const handleScroll = throttle(() => {
      if (loadingMore || !hasMore) return

      const scrollHeight = document.documentElement.scrollHeight
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop
      const clientHeight = document.documentElement.clientHeight

      if (scrollTop + clientHeight >= scrollHeight - 500) {
        handleLoadMore()
      }
    }, 300)

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [loadingMore, hasMore, handleLoadMore])

  return {
    banner,
    products: displayedProducts,
    loading,
    loadingMore,
    hasMore,
    loadMore: handleLoadMore,
  }
}

// 홈페이지용: 배너 목록 훅
interface UseBannersReturn {
  banners: Banner[]
  loading: boolean
}

export function useBanners(): UseBannersReturn {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBannersData = async () => {
      try {
        const data = await fetchBanners()
        setBanners(data.banners || [])
      } catch (error: any) {
        // 빌드 시점 연결 실패는 무시 (정상적인 동작)
        // ECONNREFUSED 에러는 조용히 무시
        const isConnectionRefused = 
          error?.code === 'ECONNREFUSED' || 
          error?.cause?.code === 'ECONNREFUSED' ||
          error?.errno === -111 ||
          error?.cause?.errno === -111
        
        if (!isConnectionRefused) {
          console.error('배너 조회 실패:', error)
        }
        setBanners([])
      } finally {
        setLoading(false)
      }
    }

    fetchBannersData()
  }, [])

  return {
    banners,
    loading,
  }
}
