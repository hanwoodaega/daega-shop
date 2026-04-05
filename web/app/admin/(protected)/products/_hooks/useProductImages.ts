import { useState, useEffect, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { adminApiFetch } from '@/lib/admin/admin-api-fetch'
import { ProductImage } from '../_types'

interface UseProductImagesProps {
  productId: string | null
}

export function useProductImages({ productId }: UseProductImagesProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [productImages, setProductImages] = useState<ProductImage[]>([])
  const [loadingImages, setLoadingImages] = useState(false)

  // 이미지 목록 조회
  const fetchProductImages = useCallback(async () => {
    if (!productId) {
      setProductImages([])
      return
    }
    setLoadingImages(true)
    try {
      const res = await adminApiFetch(`/api/admin/products/${productId}/images`)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        console.error('이미지 목록 조회 실패:', errorData)
        toast.error(errorData.error || '이미지 목록을 불러오는데 실패했습니다.')
        // 에러 발생 시 기존 이미지 목록 유지 (빈 배열로 설정하지 않음)
        return
      }
      const data = await res.json()
      setProductImages(data.images || [])
    } catch (error) {
      console.error('이미지 목록 조회 실패:', error)
      toast.error('이미지 목록을 불러오는데 실패했습니다.')
      // 에러 발생 시 기존 이미지 목록 유지 (빈 배열로 설정하지 않음)
    } finally {
      setLoadingImages(false)
    }
  }, [productId])

  useEffect(() => {
    if (productId) {
      fetchProductImages()
    } else {
      setProductImages([])
    }
  }, [productId, fetchProductImages])

  // 단일 이미지 업로드
  const handleImageUpload = useCallback(async (file: File, productIdOverride?: string | null) => {
    const targetProductId = productIdOverride ?? productId
    if (!targetProductId) return false

    setUploadingImage(true)
    try {
      // 1. 이미지 파일 업로드
      const fd = new FormData()
      fd.append('file', file)
      const res = await adminApiFetch('/api/admin/upload-image', { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || '이미지 업로드 실패', { duration: 3000 })
        return false
      }

      // 2. product_images 테이블에 추가 (URL만 저장)
      const addRes = await adminApiFetch(`/api/admin/products/${targetProductId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: data.url }),
      })

      if (addRes.ok) {
        // hook의 productId와 일치하는 경우에만 목록 새로고침
        if (targetProductId === productId) {
          await fetchProductImages()
        }
        if (fileInputRef.current) fileInputRef.current.value = ''
        toast.success('이미지가 업로드되었습니다.', { duration: 2000 })
        return true
      } else {
        const addData = await addRes.json()
        toast.error(addData.error || '이미지 추가 실패', { duration: 3000 })
        return false
      }
    } catch (error) {
      console.error('이미지 업로드 실패:', error)
      toast.error('이미지 업로드에 실패했습니다.', { duration: 3000 })
      return false
    } finally {
      setUploadingImage(false)
    }
  }, [productId, fetchProductImages])


  // 이미지 삭제
  const handleDeleteImage = useCallback(async (imageId: string) => {
    if (!productId) return false

    // confirm은 window.confirm 사용 (중요한 액션이므로)
    if (!window.confirm('이미지를 삭제하시겠습니까?')) return false

    try {
      const res = await adminApiFetch(`/api/admin/products/${productId}/images/${imageId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        // 삭제 후 이미지 목록 새로고침 (에러가 발생해도 시도)
        try {
          await fetchProductImages()
        } catch (fetchError) {
          console.error('이미지 목록 새로고침 실패:', fetchError)
          // 목록 새로고침 실패해도 삭제는 성공했으므로 로컬 상태에서 제거
          setProductImages((prev) => prev.filter((img) => img.id !== imageId))
        }
        toast.success('이미지가 삭제되었습니다.')
        return true
      } else {
        const data = await res.json().catch(() => ({}))
        console.error('이미지 삭제 실패:', data)
        toast.error(data.error || '이미지 삭제 실패')
        return false
      }
    } catch (error) {
      console.error('이미지 삭제 실패:', error)
      toast.error('이미지 삭제에 실패했습니다.')
      return false
    }
  }, [productId, fetchProductImages])

  // 우선순위 변경 (위/아래 이동: 두 이미지의 priority 교환)
  const handlePriorityChange = useCallback(async (imageId: string, newPriority: number) => {
    if (!productId) return false

    try {
      // 최신 이미지 목록 가져오기
      const latestRes = await adminApiFetch(`/api/admin/products/${productId}/images`)
      if (!latestRes.ok) {
        toast.error('이미지 목록을 불러오는데 실패했습니다.')
        return false
      }
      const latestData = await latestRes.json()
      const latestImages = latestData.images || []
      
      const sortedImages = [...latestImages].sort((a, b) => a.priority - b.priority)
      const currentImage = sortedImages.find((img) => img.id === imageId)
      
      if (!currentImage) {
        toast.error('이미지를 찾을 수 없습니다.')
        return false
      }

      const currentIndex = sortedImages.findIndex((img) => img.id === imageId)
      const targetIndex = newPriority

      // 범위 체크
      if (targetIndex < 0 || targetIndex >= sortedImages.length) {
        return false
      }

      // 같은 위치면 변경 불필요
      if (currentIndex === targetIndex) {
        return true
      }

      // 두 이미지의 priority 교환
      const targetImage = sortedImages[targetIndex]
      const currentPriority = currentImage.priority
      const targetPriority = targetImage.priority

      // 두 이미지의 priority 업데이트
      const updatePromises = [
        adminApiFetch(`/api/admin/products/${productId}/images/${imageId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priority: targetPriority }),
        }),
        adminApiFetch(`/api/admin/products/${productId}/images/${targetImage.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priority: currentPriority }),
        }),
      ]

      const results = await Promise.all(updatePromises)
      const allSuccess = results.every((res) => res.ok)

      if (allSuccess) {
        // 목록 새로고침
        try {
          await fetchProductImages()
        } catch (fetchError) {
          console.error('이미지 목록 새로고침 실패:', fetchError)
          // 목록 새로고침 실패해도 로컬 상태 업데이트
          setProductImages((prev) => {
            const updated = [...prev]
            const current = updated.find((img) => img.id === imageId)
            const target = updated.find((img) => img.id === targetImage.id)
            if (current && target) {
              const temp = current.priority
              current.priority = target.priority
              target.priority = temp
            }
            return updated.sort((a, b) => a.priority - b.priority)
          })
        }
        return true
      } else {
        const errors = await Promise.all(
          results.map((res) => res.json().catch(() => ({})))
        )
        console.error('우선순위 변경 실패:', errors)
        toast.error('우선순위 변경에 실패했습니다.')
        return false
      }
    } catch (error) {
      console.error('우선순위 변경 실패:', error)
      toast.error('우선순위 변경에 실패했습니다.')
      return false
    }
  }, [productId, fetchProductImages])


  return {
    fileInputRef,
    uploadingImage,
    productImages,
    loadingImages,
    handleImageUpload,
    handleDeleteImage,
    handlePriorityChange,
    fetchProductImages,
  }
}

