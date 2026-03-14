'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import BottomNavbar from '@/components/layout/BottomNavbar'
import ReviewItem from '@/components/review/ReviewItem'
import ReviewWriteModal from '@/components/review/ReviewWriteModal'
import StarIcons from '@/components/review/StarIcons'
import ReviewItemSkeleton from '@/components/skeletons/ReviewItemSkeleton'
import { useAuth } from '@/lib/auth/auth-context'
import toast from 'react-hot-toast'
import { Review } from '@/lib/types/review'
import { showError, showSuccess } from '@/lib/utils/error-handler'

export default function AllReviewsPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const productId = params.id as string
  
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [productName, setProductName] = useState('')
  const [averageRating, setAverageRating] = useState(0)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingReview, setEditingReview] = useState<Review | null>(null)
  const [targetReviewId, setTargetReviewId] = useState<string | null>(null)
  
  // 필터 및 정렬 상태
  const [photoOnly, setPhotoOnly] = useState(false)
  const [sortBy, setSortBy] = useState<'latest' | 'recommended'>('latest')
  
  const observerTarget = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)

  const fetchReviews = useCallback(async (pageNum: number) => {
    // loading 상태를 ref로 체크하여 의존성 배열에서 제거
    if (loadingRef.current) return
    
    try {
      loadingRef.current = true
      setLoading(true)
      // 해시로 특정 리뷰 접근 시 초기 로드량 3배 증가
      const initialLimit = targetReviewId ? 30 : 10
      const limit = pageNum === 1 ? initialLimit : 10
      const params = new URLSearchParams({
        productId,
        page: pageNum.toString(),
        limit: limit.toString(),
        photoOnly: photoOnly.toString(),
        sortBy,
      })
      const response = await fetch(`/api/reviews?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('리뷰 조회 실패')
      }

      const data = await response.json()
      
      if (pageNum === 1) {
        setReviews(data.reviews || [])
        if (typeof data.averageApprovedRating === 'number') {
          setAverageRating(data.averageApprovedRating || 0)
        }
      } else {
        setReviews(prev => [...prev, ...(data.reviews || [])])
      }
      
      setTotal(data.total || 0)
      setHasMore(pageNum < data.totalPages)
    } catch (error: any) {
      showError(error)
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [productId, targetReviewId, photoOnly, sortBy])

  // 상품 정보 가져오기 (이름만)
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`/api/products/${productId}`)
        if (response.ok) {
          const data = await response.json()
          setProductName(data.name || '')
        }
      } catch (error) {
        console.error('상품 정보 로드 실패:', error)
      }
    }
    
    fetchProduct()
  }, [productId])

  // 초기 로드 시 해시 확인
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash
      if (hash) {
        setTargetReviewId(hash.substring(1))
      }
    }
  }, [])

  // 필터 변경 시 페이지 리셋 및 재로드
  useEffect(() => {
    setPage(1)
    setReviews([])
    fetchReviews(1)
  }, [productId, photoOnly, sortBy])

  // 필터 변경 핸들러
  const handlePhotoOnlyChange = (checked: boolean) => {
    setPhotoOnly(checked)
  }

  const handleSortChange = (sort: 'latest' | 'recommended') => {
    setSortBy(sort)
  }

  // 특정 리뷰로 스크롤 (재시도 로직 포함)
  useEffect(() => {
    if (!targetReviewId || reviews.length === 0) return

    let attempts = 0
    const maxAttempts = 10

    const tryScroll = () => {
      const element = document.getElementById(targetReviewId)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        element.classList.add('bg-yellow-50')
        setTimeout(() => {
          element.classList.remove('bg-yellow-50')
        }, 2000)
        setTargetReviewId(null) // 스크롤 완료
      } else if (attempts < maxAttempts && hasMore) {
        // 요소가 아직 없고 더 로드할 게 있으면 재시도
        attempts++
        setTimeout(tryScroll, 500)
      } else {
        // 더 이상 로드할 게 없으면 포기
        setTargetReviewId(null)
      }
    }

    // 첫 시도는 조금 지연
    setTimeout(tryScroll, 300)
  }, [reviews, targetReviewId, hasMore])

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage(prev => prev + 1)
        }
      },
      { threshold: 0.1 }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [hasMore, loading])

  useEffect(() => {
    if (page > 1) {
      fetchReviews(page)
    }
  }, [page, fetchReviews])

  // 최적화: 이미지 배열을 메모이제이션
  const allImages = useMemo(() => {
    const images: string[] = []
    reviews.forEach((review) => {
      if (review.images && review.images.length > 0) {
        images.push(...review.images)
      }
    })
    return images
  }, [reviews])

  const handleEdit = useCallback((review: Review) => {
    setEditingReview(review)
    setShowEditModal(true)
  }, [])

  const handleEditSuccess = useCallback(async () => {
    setShowEditModal(false)
    setEditingReview(null)
    
    // 승인 리뷰 기준 평균/개수 갱신
    const reviewsRes = await fetch(`/api/reviews?productId=${productId}&page=1&limit=10`)
    if (reviewsRes.ok) {
      const j = await reviewsRes.json()
      if (typeof j.averageApprovedRating === 'number') {
        setAverageRating(j.averageApprovedRating || 0)
      }
      setTotal(j.total || 0)
    }
    
    fetchReviews(1)
    setPage(1)
  }, [productId, fetchReviews])

  const handleDelete = useCallback(async (reviewId: string) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('리뷰 삭제 실패')
      }

      showSuccess('리뷰가 삭제되었습니다.')
      
      const reviewsRes = await fetch(`/api/reviews?productId=${productId}&page=1&limit=10`)
      if (reviewsRes.ok) {
        const j = await reviewsRes.json()
        if (typeof j.averageApprovedRating === 'number') {
          setAverageRating(j.averageApprovedRating || 0)
        }
        setTotal(j.total || 0)
      }
      
      setReviews(prev => prev.filter(r => r.id !== reviewId))
    } catch (error) {
      showError(error)
    }
  }, [productId])

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold">상품 리뷰</h1>
        </div>
      </div>

      <main className="flex-1 container mx-auto py-4">
        {productName && (
          <h2 className="text-sm font-bold text-gray-900 mb-3 px-3">{productName}</h2>
        )}
        
        {/* 별점과 평균 */}
        {total > 0 && (
          <div className="flex items-center gap-1 mb-4 px-3">
            {/* 별점 */}
            <StarIcons rating={averageRating} size="lg" />
            {/* 평균 별점 */}
            <span className="text-xl text-gray-900 font-extrabold">{averageRating.toFixed(1)}</span>
            {/* 리뷰수 */}
            <span className="text-base text-gray-500">({total})</span>
          </div>
        )}

        {/* 필터 및 정렬 UI */}
        <div className="mb-4 px-3">
          <div className="flex items-center justify-between gap-4">
            {/* 포토 리뷰만 보기 */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={photoOnly}
                onChange={(e) => handlePhotoOnlyChange(e.target.checked)}
                className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700">포토 리뷰만 보기</span>
            </label>

            {/* 정렬 드롭다운 */}
            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value as 'latest' | 'recommended')}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              >
                <option value="latest">최신순</option>
                <option value="recommended">추천순</option>
              </select>
            </div>
          </div>
        </div>

        {/* 리뷰 사진 갤러리 (4x2) */}
        {allImages.length > 0 && (
          <div className="mb-4 pb-4 border-b border-gray-200 px-3">
            <div className="grid grid-cols-4 gap-1">
              {allImages.slice(0, 7).map((image, index) => (
                <div key={index} className="aspect-square bg-gray-200 rounded overflow-hidden">
                  <img 
                    src={image} 
                    alt={`리뷰 사진 ${index + 1}`}
                    loading="lazy"
                    className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition"
                    onClick={() => router.push(`/product/${productId}/reviews/gallery`)}
                  />
                </div>
              ))}
              
              {/* 8번째 칸: +더보기 버튼 */}
              {allImages.length > 0 && (
                <button
                  onClick={() => router.push(`/product/${productId}/reviews/gallery`)}
                  className="aspect-square bg-gray-400 rounded flex flex-col items-center justify-center text-white hover:bg-gray-500 transition"
                >
                  <span className="text-2xl mb-1">+</span>
                  <span className="text-xs font-medium">더보기</span>
                </button>
              )}
            </div>
          </div>
        )}

        {reviews.length === 0 && !loading ? (
          <div className="text-center py-12 px-3">
            <p className="text-gray-600">작성된 리뷰가 없습니다.</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg px-3">
              {reviews.map((review) => (
                <div key={review.id} id={review.id} className="transition-colors duration-500">
                  <ReviewItem
                    review={review}
                    isOwner={user?.id === review.user_id}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                </div>
              ))}
              
              {/* 로딩 중일 때 Skeleton 표시 */}
              {loading && (
                <>
                  {[1, 2, 3].map((i) => (
                    <ReviewItemSkeleton key={`skeleton-${i}`} />
                  ))}
                </>
              )}
            </div>

            {/* 무한 스크롤 트리거 */}
            <div ref={observerTarget} className="h-10" />

            {!hasMore && reviews.length > 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">모든 리뷰를 확인하셨습니다 ✨</p>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
      <BottomNavbar />

      {/* 리뷰 수정 모달 */}
      {editingReview && (
        <ReviewWriteModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setEditingReview(null)
          }}
          productId={productId}
          orderId={editingReview.id} // 수정 시 order_id는 필요 없지만 props로 필요
          productName={productName}
          onSuccess={handleEditSuccess}
          editMode={true}
          reviewId={editingReview.id}
          initialRating={editingReview.rating}
          initialTitle={editingReview.title || ''}
          initialContent={editingReview.content || ''}
          initialImages={editingReview.images || []}
        />
      )}
    </div>
  )
}

