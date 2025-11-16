'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import BottomNavbar from '@/components/BottomNavbar'
import ReviewWriteModal from '@/components/review/ReviewWriteModal'
import ReviewStars from '@/components/review/ReviewStars'
import { useAuth } from '@/lib/auth-context'
import { formatDate, formatPrice } from '@/lib/utils'
import toast from 'react-hot-toast'
import { ReviewableProduct, MyReview } from '@/lib/types/review'
import { isValidImageUrl } from '@/lib/product-utils'
import { handleApiError, showSuccessMessage } from '@/lib/api-error-handler'

export default function ProfileReviewsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const userId = user?.id // ✅ user.id를 별도로 추출
  
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

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error('로그인이 필요합니다.')
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

  // 초기 로드 시 양쪽 개수 모두 가져오기
  useEffect(() => {
    if (!userId) return
    
    const fetchCounts = async () => {
      try {
        // 작성 가능한 리뷰 개수
        const reviewableRes = await fetch('/api/reviews/reviewable')
        if (reviewableRes.ok) {
          const data = await reviewableRes.json()
          setReviewableCount(data.reviewableProducts?.length || 0)
        }
        
        // 작성한 리뷰 개수
        const myReviewsRes = await fetch('/api/reviews/my-reviews')
        if (myReviewsRes.ok) {
          const data = await myReviewsRes.json()
          setMyReviewsCount(data.reviews?.length || 0)
        }
      } catch (error) {
        handleApiError(error, '리뷰 개수 조회')
      }
    }
    
    fetchCounts()
  }, [userId])

  useEffect(() => {
    if (!userId) return
    
    const fetchData = async () => {
      try {
        setLoading(true)
        
        if (activeTab === 'reviewable') {
          const response = await fetch('/api/reviews/reviewable')
          
          if (!response.ok) {
            if (response.status === 401) {
              console.log('로그인이 필요합니다.')
              return
            }
            throw new Error('Failed to fetch reviewable products')
          }

          const data = await response.json()
          setReviewableProducts(data.reviewableProducts || [])
          setReviewableCount(data.reviewableProducts?.length || 0)
        } else {
          // 내가 작성한 리뷰 목록 조회
          const response = await fetch('/api/reviews/my-reviews')
          
          if (!response.ok) {
            if (response.status === 401) {
              console.log('로그인이 필요합니다.')
              return
            }
            throw new Error('Failed to fetch my reviews')
          }

          const data = await response.json()
          setMyReviews(data.reviews || [])
          setMyReviewsCount(data.reviews?.length || 0)
        }
      } catch (error) {
        handleApiError(error, '데이터 조회')
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [userId, activeTab])

  const handleWriteReview = (product: ReviewableProduct) => {
    setSelectedProduct(product)
    setShowReviewModal(true)
  }

  const handleReviewSuccess = async () => {
    setShowReviewModal(false)
    setSelectedProduct(null)
    
    try {
      const [reviewableRes, myReviewsRes] = await Promise.all([
        fetch('/api/reviews/reviewable'),
        fetch('/api/reviews/my-reviews')
      ])
      
      if (reviewableRes.ok) {
        const data = await reviewableRes.json()
        setReviewableProducts(data.reviewableProducts || [])
        setReviewableCount(data.reviewableProducts?.length || 0)
      }
      
      if (myReviewsRes.ok) {
        const data = await myReviewsRes.json()
        setMyReviews(data.reviews || [])
        setMyReviewsCount(data.reviews?.length || 0)
      }
    } catch (error) {
      handleApiError(error, '리뷰 목록 새로고침')
    }
    
    showSuccessMessage('리뷰가 작성되었습니다!')
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
      handleApiError(error, '리뷰 목록 새로고침')
    }
    
    showSuccessMessage('리뷰가 수정되었습니다!')
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
      
      showSuccessMessage('리뷰가 삭제되었습니다.')
      
      const myReviewsRes = await fetch('/api/reviews/my-reviews')
      if (myReviewsRes.ok) {
        const data = await myReviewsRes.json()
        setMyReviews(data.reviews || [])
        setMyReviewsCount(data.reviews?.length || 0)
      }
    } catch (error) {
      handleApiError(error, '리뷰 삭제')
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
    <div className="min-h-screen flex flex-col">
      <Header hideMainMenu />

      <main className="flex-1 container mx-auto px-4 py-6 pb-24">
        {/* 페이지 제목 */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 mb-6 text-gray-700 hover:text-gray-900"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <h1 className="text-lg font-semibold">나의 리뷰</h1>
        </button>

        {/* 탭 */}
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
            {reviewableCount > 0 && (
              <span className="ml-1 text-red-500">({reviewableCount})</span>
            )}
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
            {myReviewsCount > 0 && (
              <span className="ml-1">({myReviewsCount})</span>
            )}
          </button>
        </div>

        {/* 내용 */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-800 mx-auto"></div>
          </div>
        ) : activeTab === 'reviewable' ? (
          // 작성 가능한 리뷰
          reviewableProducts.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-gray-600 mb-2">작성 가능한 리뷰가 없습니다.</p>
              <p className="text-sm text-gray-500">배송 완료된 상품에 대해 리뷰를 작성할 수 있습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviewableProducts.map((product) => (
                <div key={`${product.order_id}-${product.product_id}`} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start gap-4">
                    {/* 상품 이미지 (없거나 무효면 회색 박스) */}
                    <div className="w-20 h-20 bg-gray-200 rounded flex-shrink-0 overflow-hidden flex items-center justify-center">
                      {product.product_image && isValidImageUrl(product.product_image) ? (
                        <img 
                          src={product.product_image} 
                          alt={product.product_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs text-gray-500">이미지 없음</span>
                      )}
                    </div>

                    {/* 상품 정보 */}
                    <div className="flex-1 min-w-0">
                      {product.product_brand && (
                        <p className="text-xs text-gray-600 mb-1">{product.product_brand}</p>
                      )}
                      <button
                        onClick={() => router.push(`/products/${product.product_id}`)}
                        className="text-sm font-medium text-blue-600 hover:underline text-left block mb-1 truncate w-full"
                      >
                        {product.product_name}
                      </button>
                      <p className="text-xs text-gray-500 mb-2">
                        주문번호: {product.order_number}
                      </p>
                      <p className="text-xs text-gray-500">
                        구매일: {formatDate(product.order_date)}
                      </p>
                    </div>

                    {/* 리뷰 작성 버튼 */}
                    <button
                      onClick={() => handleWriteReview(product)}
                      className="px-4 py-2 bg-primary-800 text-white rounded text-sm font-medium hover:bg-primary-900 transition whitespace-nowrap flex-shrink-0"
                    >
                      리뷰 작성
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          // 작성한 리뷰
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
                  {/* 리뷰 내용 */}
                  <div className="flex-1">
                    {review.product.brand && (
                      <p className="text-xs text-gray-600 mb-1">{review.product.brand}</p>
                    )}
                    <button
                      onClick={() => router.push(`/products/${review.product_id}`)}
                      className="text-sm font-medium mb-2 text-blue-600 hover:underline text-left block"
                    >
                      {review.product.name}
                    </button>
                    <ReviewStars rating={review.rating} size="sm" />
                    {review.title && (
                      <h4 className="text-sm font-semibold text-gray-900 mt-2 mb-1">{review.title}</h4>
                    )}
                    <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{review.content}</p>
                    
                    {/* 리뷰 이미지 */}
                    {review.images && review.images.length > 0 && (
                      <div className="mt-2 overflow-x-auto">
                        <div className="flex gap-2 w-max py-1 px-1">
                          {review.images.map((image, index) => (
                            <div key={index} className="w-16 h-16 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                              <img 
                                src={image} 
                                alt={`리뷰 이미지 ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-500 mt-2">{formatDate(review.created_at)}</p>
                    
                    {/* 수정/삭제 버튼 */}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleEditReview(review)}
                        className="px-4 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDeleteReview(review.id)}
                        className="px-4 py-1.5 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
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

      <BottomNavbar />
      <Footer />

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

