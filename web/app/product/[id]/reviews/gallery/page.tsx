'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import BottomNavbar from '@/components/layout/BottomNavbar'
import { showError } from '@/lib/utils/error-handler'

export default function ReviewGalleryPage() {
  const params = useParams()
  const router = useRouter()
  const productId = params.id as string
  const [allImages, setAllImages] = useState<string[]>([])
  const [imageReviewMap, setImageReviewMap] = useState<{ [key: string]: string }>({})
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [showImageModal, setShowImageModal] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  
  const observerTarget = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)

  const fetchImages = useCallback(async (pageNum: number) => {
    if (loadingRef.current) return
    
    try {
      loadingRef.current = true
      if (pageNum === 1) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }

      const response = await fetch(`/api/reviews/images?productId=${productId}&page=${pageNum}&limit=30`)
      
      if (!response.ok) {
        throw new Error('이미지 조회 실패')
      }

      const data = await response.json()
      
      if (pageNum === 1) {
        setAllImages(data.images || [])
        setImageReviewMap(data.imageReviewMap || {})
      } else {
        setAllImages(prev => [...prev, ...(data.images || [])])
        setImageReviewMap(prev => ({ ...prev, ...(data.imageReviewMap || {}) }))
      }
      
      setHasMore(data.hasMore || false)
    } catch (error) {
      showError(error)
    } finally {
      loadingRef.current = false
      setLoading(false)
      setLoadingMore(false)
    }
  }, [productId])

  useEffect(() => {
    fetchImages(1)
  }, [productId, fetchImages])

  // 무한 스크롤
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
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
  }, [hasMore, loading, loadingMore])

  useEffect(() => {
    if (page > 1) {
      fetchImages(page)
    }
  }, [page, fetchImages])

  const handleImageClick = (image: string) => {
    setSelectedImage(image)
    setShowImageModal(true)
  }

  const handleGoToReview = () => {
    if (selectedImage && imageReviewMap[selectedImage]) {
      router.push(`/product/${productId}/reviews#${imageReviewMap[selectedImage]}`)
    }
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
          <h1 className="text-lg font-semibold">포토 리뷰</h1>
        </button>

        {loading ? (
          <div className="py-20 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-800 mx-auto"></div>
          </div>
        ) : allImages.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📷</div>
            <p className="text-gray-600">포토 리뷰가 없습니다.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 lg:grid-cols-5 gap-2">
              {allImages.map((image, index) => (
                <div 
                  key={index} 
                  className="aspect-square bg-gray-200 rounded overflow-hidden cursor-pointer"
                  onClick={() => handleImageClick(image)}
                >
                  <img 
                    src={image} 
                    alt={`리뷰 사진 ${index + 1}`}
                    className="w-full h-full object-cover hover:opacity-80 transition"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>

            {/* 무한 스크롤 트리거 */}
            <div ref={observerTarget} className="h-10" />

            {/* 로딩 더 보기 */}
            {loadingMore && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-800 mx-auto"></div>
              </div>
            )}

            {/* 모두 로드됨 */}
            {!hasMore && allImages.length > 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">모든 사진을 확인하셨습니다 ✨</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* 이미지 확대 모달 */}
      {showImageModal && selectedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 flex flex-col items-center justify-center p-4"
          onClick={() => {
            setShowImageModal(false)
            setSelectedImage(null)
          }}
        >
          <button
            onClick={() => {
              setShowImageModal(false)
              setSelectedImage(null)
            }}
            className="absolute top-4 right-4 text-white p-2 hover:bg-white/20 rounded-full"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="flex flex-col items-center">
            <img 
              src={selectedImage} 
              alt="확대 이미지"
              className="max-w-full max-h-[80vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* 리뷰 더보기 링크 - 이미지 밑 오른쪽 */}
            {imageReviewMap[selectedImage] && (
              <div className="w-full flex justify-end mt-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleGoToReview()
                  }}
                  className="text-blue-500 font-bold underline hover:text-blue-400 transition text-base"
                >
                  리뷰 더보기 ❯
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <BottomNavbar />
      <Footer />
    </div>
  )
}

