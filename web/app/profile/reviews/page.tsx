'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import ReviewWriteModal from '@/components/review/ReviewWriteModal'
import ReviewStars from '@/components/review/ReviewStars'
import { useAuth } from '@/lib/auth/auth-context'
import { formatDate, formatPrice } from '@/lib/utils/utils'
import toast from 'react-hot-toast'
import { ReviewableProduct, MyReview } from '@/lib/types/review'
import { isValidImageUrl } from '@/lib/product/product-utils'
import { showError, showSuccess } from '@/lib/utils/error-handler'
import { useCartStore } from '@/lib/store'

export default function ProfileReviewsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const userId = user?.id // ✅ user.id를 별도로 추출
  const cartCount = useCartStore((state) => state.getTotalItems())
  
  const [activeTab, setActiveTab] = useState<'reviewable' | 'written'>('reviewable')
  const [reviewableProducts, setReviewableProducts] = useState<ReviewableProduct[]>([])
  const [myReviews, setMyReviews] = useState<MyReview[]>([])
  const [reviewableCount, setReviewableCount] = useState(0)
  const [myReviewsCount, setMyReviewsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ReviewableProduct | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingReview, setEditingReview] = useState<MyReview | null>(null)
  const isFetchingReviewableRef = useRef(false) // 중복 호출 방지
  const isFetchingMyReviewsRef = useRef(false) // 중복 호출 방지
  const isFetchingMyReviewsCountRef = useRef(false) // 탭 개수 중복 호출 방지

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error('로그인이 필요합니다.', { duration: 3000 })
      router.push('/auth/login?next=/profile/reviews')
    }
  }, [user, authLoading, router])

  // 초기 로드 시 작성한 리뷰 개수만 가져오기 (탭 표시용) - 최적화된 API 사용
  useEffect(() => {
    if (!userId) return
    
    const fetchMyReviewsCount = async () => {
      if (isFetchingMyReviewsCountRef.current) return
      isFetchingMyReviewsCountRef.current = true
      try {
        // 개수만 가져오는 최적화된 API 호출
        const response = await fetch('/api/reviews/my-reviews?countOnly=true')
        if (response.ok) {
          const data = await response.json()
          setMyReviewsCount(data.count || 0)
        }
      } catch (error) {
        // 개수 조회 실패는 무시 (탭 표시에만 사용)
      } finally {
        isFetchingMyReviewsCountRef.current = false
      }
    }
    
    fetchMyReviewsCount()
  }, [userId])

  // 초기 로드 시 작성 가능한 리뷰만 가져오기
  useEffect(() => {
    if (!userId || activeTab !== 'reviewable') return
    
    const fetchReviewable = async () => {
      // 중복 호출 방지
      if (isFetchingReviewableRef.current) return
      
      isFetchingReviewableRef.current = true
      try {
        setLoading(true)
        const response = await fetch('/api/reviews/reviewable')
        
        if (!response.ok) {
          if (response.status === 401) {
            return
          }
          throw new Error('Failed to fetch reviewable products')
        }

        const data = await response.json()
        setReviewableProducts(data.reviewableProducts || [])
        setReviewableCount(data.reviewableProducts?.length || 0)
      } catch (error) {
        showError(error)
      } finally {
        setLoading(false)
        isFetchingReviewableRef.current = false
      }
    }
    
    fetchReviewable()
  }, [userId, activeTab])

  // 작성한 리뷰 탭 클릭 시에만 호출
  useEffect(() => {
    if (!userId || activeTab !== 'written') return
    
    const fetchMyReviews = async () => {
      // 중복 호출 방지
      if (isFetchingMyReviewsRef.current) return
      
      isFetchingMyReviewsRef.current = true
      try {
        setLoading(true)
        const response = await fetch('/api/reviews/my-reviews')
        
        if (!response.ok) {
          if (response.status === 401) {
            return
          }
          throw new Error('Failed to fetch my reviews')
        }

        const data = await response.json()
        setMyReviews(data.reviews || [])
        setMyReviewsCount(data.reviews?.length || 0)
      } catch (error) {
        showError(error)
      } finally {
        setLoading(false)
        isFetchingMyReviewsRef.current = false
      }
    }
    
    fetchMyReviews()
  }, [userId, activeTab])

  const handleWriteReview = (product: ReviewableProduct) => {
    setSelectedProduct(product)
    setShowReviewModal(true)
  }

  const handleReviewSuccess = async () => {
    setShowReviewModal(false)
    setSelectedProduct(null)
    
    try {
      // 작성 가능한 리뷰만 새로고침 (현재 탭이 reviewable이면)
      if (activeTab === 'reviewable') {
        const reviewableRes = await fetch('/api/reviews/reviewable')
        if (reviewableRes.ok) {
          const data = await reviewableRes.json()
          setReviewableProducts(data.reviewableProducts || [])
          setReviewableCount(data.reviewableProducts?.length || 0)
        }
      }
      // 작성한 리뷰 탭이 활성화되어 있으면 새로고침
      if (activeTab === 'written') {
        const myReviewsRes = await fetch('/api/reviews/my-reviews')
        if (myReviewsRes.ok) {
          const data = await myReviewsRes.json()
          setMyReviews(data.reviews || [])
          setMyReviewsCount(data.reviews?.length || 0)
        }
      }
    } catch (error) {
      showError(error)
    }
    
    showSuccess('리뷰가 작성되었습니다!')
  }

  const handleEditReview = (review: MyReview) => {
    setEditingReview(review)
    setShowEditModal(true)
  }

  const handleEditSuccess = async () => {
    setShowEditModal(false)
    setEditingReview(null)
    
    try {
      const response = await fetch('/api/reviews/my-reviews')
      if (response.ok) {
        const data = await response.json()
        setMyReviews(data.reviews || [])
        setMyReviewsCount(data.reviews?.length || 0)
      }
    } catch (error) {
      showError(error)
    }
    
    showSuccess('리뷰가 수정되었습니다!')
  }

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('리뷰를 삭제하시겠습니까?')) return
    
    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('리뷰 삭제 실패')
      }
      
      showSuccess('리뷰가 삭제되었습니다.')
      
      const myReviewsRes = await fetch('/api/reviews/my-reviews')
      if (myReviewsRes.ok) {
        const data = await myReviewsRes.json()
        setMyReviews(data.reviews || [])
        setMyReviewsCount(data.reviews?.length || 0)
      }
    } catch (error) {
      showError(error)
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-800"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* 모바일 전용 헤더 */}
      <header className="lg:hidden sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="container mx-auto px-2 h-14 md:h-16 relative flex items-center">
          <button
            onClick={() => router.back()}
            aria-label="뒤로가기"
            className="p-2 text-gray-700 hover:text-gray-900"
          >
            <svg className="w-7 h-7 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <h1 className="text-lg md:text-xl font-normal text-gray-900 whitespace-nowrap">나의 리뷰</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 pb-24 lg:py-6 lg:pb-6 lg:max-w-none">
        {/* PC 전용: 상단 카드 "나의 리뷰" + 탭, 아래 본문 */}
        <div className="hidden lg:block">
          <div className="bg-white rounded-lg border border-gray-200 p-5 pb-0 mb-4 shadow-sm">
            <h2 className="text-2xl font-bold text-primary-900 mb-4 text-center">나의 리뷰</h2>
            <div className="border-t border-gray-200">
              <div className="flex border-b border-gray-200 -mb-px">
                <button
                  onClick={() => setActiveTab('reviewable')}
                  className={`flex-1 py-3 text-center font-medium transition ${
                    activeTab === 'reviewable'
                      ? 'text-primary-800 border-b-2 border-primary-800'
                      : 'text-gray-600'
                  }`}
                >
                  작성 가능한 리뷰
                  {reviewableCount > 0 && <span className="ml-1 text-red-500">({reviewableCount})</span>}
                </button>
                <button
                  onClick={() => setActiveTab('written')}
                  className={`flex-1 py-3 text-center font-medium transition ${
                    activeTab === 'written'
                      ? 'text-primary-800 border-b-2 border-primary-800'
                      : 'text-gray-600'
                  }`}
                >
                  작성한 리뷰
                  {myReviewsCount > 0 && <span className="ml-1">({myReviewsCount})</span>}
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-800 mx-auto"></div>
            </div>
          ) : activeTab === 'reviewable' ? (
            reviewableProducts.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center shadow-sm">
                <div className="flex justify-center mb-4">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <p className="text-gray-600 mb-2">작성 가능한 리뷰가 없습니다.</p>
                <p className="text-sm text-gray-500">배송 완료된 상품에 대해 리뷰를 작성할 수 있습니다.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviewableProducts.map((product) => (
                  <div
                    key={product.order_item_id}
                    className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50 transition shadow-sm"
                    onClick={() => router.push(`/product/${product.product_id}`)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-20 h-20 bg-gray-200 rounded flex-shrink-0 overflow-hidden flex items-center justify-center">
                        {product.product_image && isValidImageUrl(product.product_image) ? (
                          <img src={product.product_image} alt={product.product_name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs text-gray-500">이미지 없음</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {product.product_brand && <p className="text-xs text-gray-600 mb-1">{product.product_brand}</p>}
                        <p className="text-sm font-medium text-gray-900 mb-1 truncate w-full">{product.product_name}</p>
                        <p className="text-xs text-gray-500 mb-2">주문번호: {product.order_number}</p>
                        <p className="text-xs text-gray-500">구매일: {formatDate(product.order_date)}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleWriteReview(product) }}
                        className="px-3 py-1.5 bg-white text-red-600 border border-red-600 rounded text-sm font-medium hover:bg-blue-50 transition whitespace-nowrap flex-shrink-0 self-start"
                      >
                        리뷰 작성
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            myReviews.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center shadow-sm">
                <div className="flex justify-center mb-4">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <p className="text-gray-600 mb-2">작성한 리뷰가 없습니다.</p>
                <p className="text-sm text-gray-500">구매한 상품에 대한 리뷰를 작성해보세요.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myReviews.map((review) => (
                  <div key={review.id} className="bg-white rounded-lg border border-gray-200 p-4 overflow-hidden shadow-sm">
                    <div className="flex-1">
                      {review.product.brand && <p className="text-xs text-gray-600 mb-1">{review.product.brand}</p>}
                      <button
                        onClick={() => router.push(`/product/${review.product_id}`)}
                        className="text-sm font-medium mb-2 text-blue-600 hover:underline text-left block"
                      >
                        {review.product.name}
                      </button>
                      <ReviewStars rating={review.rating} size="sm" />
                      {review.title && <h4 className="text-sm font-semibold text-gray-900 mt-2 mb-1">{review.title}</h4>}
                      <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{review.content}</p>
                      {review.images && review.images.length > 0 && (
                        <div className="mt-2 overflow-x-auto">
                          <div className="flex gap-2 w-max py-1 px-1">
                            {review.images.map((image, index) => (
                              <div key={index} className="w-16 h-16 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                                <img src={image} alt={`리뷰 이미지 ${index + 1}`} className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-2">{formatDate(review.created_at)}</p>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleEditReview(review)}
                          className="px-4 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
                        >
                          수정
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* 모바일 전용 */}
        <div className="lg:hidden">
          <div className="flex border-b border-gray-300 mb-6">
            <button
              onClick={() => setActiveTab('reviewable')}
              className={`flex-1 py-3 text-center font-medium ${
                activeTab === 'reviewable'
                  ? 'text-primary-800 border-b-2 border-primary-800'
                  : 'text-gray-600'
              }`}
            >
              작성 가능한 리뷰
              {reviewableCount > 0 && <span className="ml-1 text-red-500">({reviewableCount})</span>}
            </button>
            <button
              onClick={() => setActiveTab('written')}
              className={`flex-1 py-3 text-center font-medium ${
                activeTab === 'written'
                  ? 'text-primary-800 border-b-2 border-primary-800'
                  : 'text-gray-600'
              }`}
            >
              작성한 리뷰
              {myReviewsCount > 0 && <span className="ml-1">({myReviewsCount})</span>}
            </button>
          </div>

          {loading ? (
            <div className="py-20 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-800 mx-auto"></div>
            </div>
          ) : activeTab === 'reviewable' ? (
            reviewableProducts.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">📝</div>
                <p className="text-gray-600 mb-2">작성 가능한 리뷰가 없습니다.</p>
                <p className="text-sm text-gray-500">배송 완료된 상품에 대해 리뷰를 작성할 수 있습니다.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviewableProducts.map((product) => (
                  <div
                    key={product.order_item_id}
                    className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition"
                    onClick={() => router.push(`/product/${product.product_id}`)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-20 h-20 bg-gray-200 rounded flex-shrink-0 overflow-hidden flex items-center justify-center">
                        {product.product_image && isValidImageUrl(product.product_image) ? (
                          <img src={product.product_image} alt={product.product_name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs text-gray-500">이미지 없음</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {product.product_brand && <p className="text-xs text-gray-600 mb-1">{product.product_brand}</p>}
                        <p className="text-sm font-medium text-gray-900 mb-1 truncate w-full">{product.product_name}</p>
                        <p className="text-xs text-gray-500 mb-2">주문번호: {product.order_number}</p>
                        <p className="text-xs text-gray-500">구매일: {formatDate(product.order_date)}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleWriteReview(product) }}
                        className="px-3 py-1.5 bg-white text-red-600 border border-red-600 rounded text-sm font-medium hover:bg-blue-50 transition whitespace-nowrap flex-shrink-0 self-start"
                      >
                        리뷰 작성
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            myReviews.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">✍️</div>
                <p className="text-gray-600 mb-2">작성한 리뷰가 없습니다.</p>
                <p className="text-sm text-gray-500">구매한 상품에 대한 리뷰를 작성해보세요.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myReviews.map((review) => (
                  <div key={review.id} className="border border-gray-200 rounded-lg p-4 overflow-hidden">
                    <div className="flex-1">
                      {review.product.brand && <p className="text-xs text-gray-600 mb-1">{review.product.brand}</p>}
                      <button
                        onClick={() => router.push(`/product/${review.product_id}`)}
                        className="text-sm font-medium mb-2 text-blue-600 hover:underline text-left block"
                      >
                        {review.product.name}
                      </button>
                      <ReviewStars rating={review.rating} size="sm" />
                      {review.title && <h4 className="text-sm font-semibold text-gray-900 mt-2 mb-1">{review.title}</h4>}
                      <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{review.content}</p>
                      {review.images && review.images.length > 0 && (
                        <div className="mt-2 overflow-x-auto">
                          <div className="flex gap-2 w-max py-1 px-1">
                            {review.images.map((image, index) => (
                              <div key={index} className="w-16 h-16 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                                <img src={image} alt={`리뷰 이미지 ${index + 1}`} className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-2">{formatDate(review.created_at)}</p>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleEditReview(review)}
                          className="px-4 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
                        >
                          수정
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </main>

      {/* 리뷰 작성 모달 */}
      {selectedProduct && (
        <ReviewWriteModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false)
            setSelectedProduct(null)
          }}
          productId={selectedProduct.product_id}
          orderId={selectedProduct.order_id}
          productName={selectedProduct.product_name}
          productImage={selectedProduct.product_image}
          onSuccess={handleReviewSuccess}
        />
      )}

      {/* 리뷰 수정 모달 */}
      {editingReview && (
        <ReviewWriteModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setEditingReview(null)
          }}
          productId={editingReview.product_id}
          orderId={editingReview.order_id}
          productName={editingReview.product.name}
          productImage={editingReview.product.image_url}
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

