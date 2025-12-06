'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import ReviewItem from './ReviewItem'
import ReviewStars from './ReviewStars'
import StarIcons from './StarIcons'
import ReviewWriteModal from './ReviewWriteModal'
import ReviewItemSkeleton from '../skeletons/ReviewItemSkeleton'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Review, ReviewListProps } from '@/lib/types/review'
import { handleApiError, showSuccessMessage } from '@/lib/error-handler'

// 키보드 네비게이션 hook
function useKeyboardNavigation(
  isOpen: boolean,
  onPrev: () => void,
  onNext: () => void,
  onClose: () => void
) {
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        onPrev()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        onNext()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onPrev, onNext, onClose])
}

export default function ReviewList({ productId, onWriteReview, limit = 10, showViewAllButton = false }: ReviewListProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [averageRating, setAverageRating] = useState(0)
  const [allImages, setAllImages] = useState<string[]>([])
  const [productName, setProductName] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingReview, setEditingReview] = useState<Review | null>(null)
  const [showImageModal, setShowImageModal] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const isFetchingReviewsRef = useRef(false) // 중복 호출 방지

  // 키보드 네비게이션
  useKeyboardNavigation(
    showImageModal,
    () => setCurrentImageIndex(prev => Math.max(0, prev - 1)),
    () => setCurrentImageIndex(prev => Math.min(allImages.length - 1, prev + 1)),
    () => setShowImageModal(false)
  )

  // 모달 열릴 때 스크롤 방지
  useEffect(() => {
    if (showImageModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showImageModal])

  const fetchReviews = useCallback(async () => {
    // 중복 호출 방지
    if (isFetchingReviewsRef.current) return
    
    isFetchingReviewsRef.current = true
    try {
      setLoading(true)
      const response = await fetch(`/api/reviews?productId=${productId}&page=${page}&limit=${limit}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        if (response.status === 500 && errorData.details?.includes('does not exist')) {
          setReviews([])
          setTotal(0)
          setTotalPages(1)
          return
        }
        
        throw new Error(errorData.error || '리뷰 조회 실패')
      }

      const data = await response.json()
      setReviews(data.reviews || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
      if (typeof data.averageApprovedRating === 'number') {
        setAverageRating(data.averageApprovedRating || 0)
      }
      
      if (data.reviews && data.reviews.length > 0) {
        const images: string[] = []
        data.reviews.forEach((review: Review) => {
          if (review.images && review.images.length > 0) {
            images.push(...review.images)
          }
        })
        setAllImages(images)
      } else {
        setAllImages([])
      }
    } catch (error: any) {
      // Silent fail
    } finally {
      setLoading(false)
      isFetchingReviewsRef.current = false
    }
  }, [productId, page, limit])

  useEffect(() => {
    const fetchProductData = async () => {
      // UUID 형식인지 확인
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId)
      
      let query = supabase
        .from('products')
        .select('average_rating, name')
      
      if (isUUID) {
        query = query.eq('id', productId)
      } else {
        // slug로 조회
        query = query.eq('slug', productId)
      }
      
      const { data } = await query.single()
      
      if (data) {
        setAverageRating(data.average_rating || 0)
        setProductName(data.name || '')
      }
    }
    
    fetchProductData()
  }, [productId])

  useEffect(() => {
    let mounted = true
    
    const loadReviews = async () => {
      if (mounted) {
        await fetchReviews()
      }
    }
    
    loadReviews()
    
    return () => {
      mounted = false
    }
  }, [fetchReviews])

  const handleEdit = (review: Review) => {
    setEditingReview(review)
    setShowEditModal(true)
  }

  const handleEditSuccess = async () => {
    setShowEditModal(false)
    setEditingReview(null)
    
    const { data: productData } = await supabase
      .from('products')
      .select('average_rating, review_count')
      .eq('id', productId)
      .single()
    
    if (productData) {
      setAverageRating(productData.average_rating || 0)
      setTotal(productData.review_count || 0)
    }
    
    fetchReviews()
  }

  const handleDelete = async (reviewId: string) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('리뷰 삭제 실패')
      }

      showSuccessMessage('리뷰가 삭제되었습니다.')
      
      const { data: productData } = await supabase
        .from('products')
        .select('average_rating, review_count')
        .eq('id', productId)
        .single()
      
      if (productData) {
        setAverageRating(productData.average_rating || 0)
        setTotal(productData.review_count || 0)
      }
      
      fetchReviews()
    } catch (error) {
      handleApiError(error, '리뷰 삭제')
    }
  }

  if (loading && page === 1) {
    return (
      <div className="py-6">
        {/* 리뷰 제목과 전체보기 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">상품 리뷰</h2>
        </div>

        {/* 구분선 */}
        <div className="border-b border-gray-200 mb-4"></div>

        {/* Skeleton 로딩 */}
        <div className="space-y-0 border-t border-gray-200">
          {[1, 2, 3].map((i) => (
            <ReviewItemSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="py-6">
      {/* 리뷰 제목과 전체보기 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">상품 리뷰</h2>
        {total > 0 && (
          <button
            onClick={() => {
              router.push(`/product/${productId}/reviews`)
            }}
            className="text-sm text-blue-600 font-bold hover:underline"
            suppressHydrationWarning
          >
            전체보기 ❯
          </button>
        )}
      </div>

      {/* 구분선 */}
      <div className="border-b border-gray-200 mb-4"></div>

      {/* 별점과 리뷰 작성 버튼 */}
      <div className="flex items-center justify-between mb-6">
        {total > 0 ? (
          <div className="flex items-center gap-1">
            {/* 별점 */}
            <StarIcons rating={averageRating} size="lg" />
            {/* 평균 별점 */}
            <span className="text-xl text-gray-900 font-extrabold">{averageRating.toFixed(1)}</span>
            {/* 리뷰수 */}
            <span className="text-base text-gray-500">({total})</span>
          </div>
        ) : (
          <div></div>
        )}
        
        {/* 리뷰 작성하기 버튼 */}
        {user && (
          <button
            onClick={() => {
              router.push('/profile/reviews')
            }}
            className="text-sm text-blue-600 font-bold hover:underline"
          >
            리뷰 작성하기
          </button>
        )}
      </div>

      {/* 리뷰 사진 갤러리 (4x2) */}
      {allImages.length > 0 && (
        <div className="mb-4 pb-4">
          <div className="grid grid-cols-4 gap-1">
            {allImages.slice(0, 7).map((image, index) => (
              <div key={index} className="aspect-square bg-gray-200 rounded overflow-hidden">
                <img 
                  src={image} 
                  alt={`리뷰 사진 ${index + 1}`}
                  loading="lazy"
                  className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition"
                  onClick={() => {
                    setCurrentImageIndex(index)
                    setShowImageModal(true)
                  }}
                />
              </div>
            ))}
            
            {/* 8번째 칸: +더보기 버튼 */}
            {allImages.length > 0 && (
              <button
                onClick={() => router.push(`/products/${productId}/reviews/gallery`)}
                className="aspect-square bg-blue-600 rounded flex flex-col items-center justify-center text-white hover:bg-blue-700 transition"
              >
                <span className="text-2xl mb-1">+</span>
                <span className="text-xs font-medium">더보기</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 리뷰 목록 */}
      {reviews.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">아직 작성된 리뷰가 없습니다.</p>
        </div>
      ) : (
        <>
          <div className="space-y-0 border-t border-gray-200">
            {reviews.map((review) => (
              <ReviewItem
                key={review.id}
                review={review}
                isOwner={user?.id === review.user_id}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {/* 전체 보기 버튼 */}
          {showViewAllButton && total > limit && (
            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  router.push(`/product/${productId}/reviews`)
                }}
                className="px-6 py-3 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
              >
                리뷰 전체 보기 ({total})
              </button>
            </div>
          )}

          {/* 페이지네이션 */}
          {!showViewAllButton && totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                이전
              </button>
              <span className="px-3 py-1 text-sm text-gray-600">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}

      {/* 리뷰 수정 모달 */}
      {editingReview && (
        <ReviewWriteModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setEditingReview(null)
          }}
          productId={productId}
          orderId={editingReview.id}
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

      {/* 이미지 확대 모달 */}
      {showImageModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center"
          onClick={() => setShowImageModal(false)}
        >
          {/* 닫기 버튼 */}
          <button
            onClick={() => setShowImageModal(false)}
            className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300 z-10"
          >
            ×
          </button>

          {/* 이전 버튼 */}
          {currentImageIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setCurrentImageIndex(prev => Math.max(0, prev - 1))
              }}
              className="absolute left-4 text-white text-6xl hover:text-gray-300 z-10"
            >
              ‹
            </button>
          )}

          {/* 이미지 */}
          <img
            src={allImages[currentImageIndex]}
            alt={`리뷰 사진 ${currentImageIndex + 1}`}
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* 다음 버튼 */}
          {currentImageIndex < allImages.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setCurrentImageIndex(prev => Math.min(allImages.length - 1, prev + 1))
              }}
              className="absolute right-4 text-white text-6xl hover:text-gray-300 z-10"
            >
              ›
            </button>
          )}

          {/* 이미지 인덱스 */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded">
            {currentImageIndex + 1} / {allImages.length}
          </div>
        </div>
      )}
    </div>
  )
}

