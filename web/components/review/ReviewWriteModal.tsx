'use client'

import { useState, useRef, useEffect } from 'react'
import ReviewStars from './ReviewStars'
import toast from 'react-hot-toast'
import { ReviewWriteModalProps } from '@/lib/types/review'
import { handleApiError, showSuccessMessage } from '@/lib/api-error-handler'

export default function ReviewWriteModal({
  isOpen,
  onClose,
  productId,
  orderId,
  productName,
  productImage,
  onSuccess,
  editMode = false,
  reviewId,
  initialRating = 5,
  initialTitle = '',
  initialContent = '',
  initialImages = []
}: ReviewWriteModalProps) {
  const [rating, setRating] = useState(initialRating || 5)
  const [title, setTitle] = useState(initialTitle || '')
  const [content, setContent] = useState(initialContent || '')
  const [images, setImages] = useState<string[]>(initialImages || [])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editMode) {
      setRating(initialRating || 5)
      setTitle(initialTitle || '')
      setContent(initialContent || '')
      setImages(initialImages || [])
    }
  }, [editMode, initialRating, initialTitle, initialContent, initialImages])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!content.trim()) {
      toast.error('리뷰 내용을 입력해주세요.')
      return
    }

    if (content.length < 10) {
      toast.error('리뷰는 최소 10자 이상 작성해주세요.')
      return
    }

    try {
      setSubmitting(true)

      if (editMode && reviewId) {
        const response = await fetch(`/api/reviews/${reviewId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            rating,
            title: title.trim() || null,
            content: content.trim(),
            images: images
          })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || '리뷰 수정 실패')
        }

        showSuccessMessage('리뷰가 수정되었습니다!')
      } else {
        const response = await fetch('/api/reviews', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            product_id: productId,
            order_id: orderId,
            rating,
            title: title.trim() || null,
            content: content.trim(),
            images: images
          })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || '리뷰 작성 실패')
        }

        showSuccessMessage('리뷰가 작성되었습니다!')
      }
      
      setRating(5)
      setTitle('')
      setContent('')
      setImages([])
      onSuccess()
      onClose()
    } catch (error: any) {
      handleApiError(error, editMode ? '리뷰 수정' : '리뷰 작성')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!submitting && !uploading) {
      setRating(5)
      setTitle('')
      setContent('')
      setImages([])
      onClose()
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // 최대 5장 제한
    if (images.length + files.length > 5) {
      toast.error('이미지는 최대 5장까지 업로드 가능합니다.')
      return
    }

    try {
      setUploading(true)
      const uploadedUrls: string[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name}은(는) 5MB를 초과합니다.`)
          continue
        }

        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/reviews/upload-image', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || '업로드 실패')
        }

        const data = await response.json()
        uploadedUrls.push(data.url)
      }

      setImages([...images, ...uploadedUrls])
      showSuccessMessage(`${uploadedUrls.length}장의 이미지가 업로드되었습니다.`)
    } catch (error: any) {
      handleApiError(error, '이미지 업로드')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto relative">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold">{editMode ? '리뷰 수정' : '리뷰 작성'}</h2>
          <button
            onClick={handleClose}
            disabled={submitting}
            className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 내용 */}
        <form id="review-form" onSubmit={handleSubmit} className="p-6 pb-24">
          {/* 상품 정보 */}
          <div className="mb-3 pb-3 border-b border-gray-200">
            <p className="text-sm font-medium text-gray-900">{productName}</p>
          </div>

          {/* 별점 */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              별점을 선택해주세요
            </label>
            <div className="flex items-center gap-4">
              <ReviewStars
                rating={rating}
                interactive={true}
                onRatingChange={setRating}
                size="lg"
              />
            </div>
          </div>

          {/* 리뷰 제목 */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              리뷰 제목 <span className="text-gray-500 text-xs font-normal">(선택)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력해주세요."
              maxLength={50}
              className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-800 focus:border-transparent text-sm placeholder:text-sm"
              disabled={submitting}
            />
            <div className="mt-2 text-xs text-gray-500 text-right">
              {title.length} / 50
            </div>
          </div>

          {/* 리뷰 내용 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              리뷰 내용
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="상품 리뷰를 남겨주세요. (최소 10자)"
              rows={8}
              maxLength={1000}
              className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-800 focus:border-transparent resize-none text-sm placeholder:text-sm"
              disabled={submitting}
            />
            <div className="mt-2 text-xs text-gray-500 text-right">
              {content.length} / 1000
            </div>
          </div>

          {/* 이미지 업로드 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              사진 첨부 (선택, 최대 5장)
            </label>
            <div className="flex gap-2 flex-wrap">
              {/* 업로드된 이미지 미리보기 */}
              {images.map((image, index) => (
                <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden">
                  <img src={image} alt={`리뷰 이미지 ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-0 right-0 bg-red-500 text-white rounded-bl-lg p-1 hover:bg-red-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              
              {/* 업로드 버튼 */}
              {images.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || submitting}
                  className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-primary-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-800"></div>
                  ) : (
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  )}
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
            <p className="mt-2 text-xs text-gray-500">
              * 이미지당 최대 5MB, JPG/PNG 형식
            </p>
          </div>

        </form>

        {/* 하단 고정 버튼 */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
          <button
            type="submit"
            form="review-form"
            disabled={submitting || uploading}
            className="w-full px-4 py-3 bg-primary-800 text-white rounded-lg text-base font-semibold hover:bg-primary-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (editMode ? '수정 중...' : '작성 중...') : uploading ? '업로드 중...' : (editMode ? '수정하기' : '등록하기')}
          </button>
        </div>
      </div>
    </div>
  )
}

