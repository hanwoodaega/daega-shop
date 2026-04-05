import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { adminApiFetch } from '@/lib/admin/admin-api-fetch'
import { HeroSlide, HeroFormData } from '../_types'

export interface UseHeroSlidesReturn {
  slides: HeroSlide[]
  loading: boolean
  uploadingImage: boolean
  showModal: boolean
  editingSlide: HeroSlide | null
  openCreateModal: () => void
  openEditModal: (slide: HeroSlide) => void
  closeModal: () => void
  handleImageUpload: (file: File) => Promise<string | null>
  handleSave: (formData: HeroFormData) => Promise<boolean>
  handleDelete: (id: string) => Promise<void>
  refresh: () => Promise<void>
}

export function useHeroSlides(): UseHeroSlidesReturn {
  const router = useRouter()
  const [slides, setSlides] = useState<HeroSlide[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingImage, setUploadingImage] = useState(false)
  
  // 모달 및 수정 관련 상태
  const [showModal, setShowModal] = useState(false)
  const [editingSlide, setEditingSlide] = useState<HeroSlide | null>(null)

  const redirectToLogin = () => {
    router.push('/admin/login?next=/admin/hero')
  }

  const fetchSlides = async () => {
    try {
      setLoading(true)
      const res = await adminApiFetch('/api/admin/hero')
      if (res.status === 401) {
        redirectToLogin()
        return
      }
      const data = await res.json()
      if (res.ok) {
        setSlides(data.slides || [])
      } else {
        toast.error('히어로 슬라이드 조회에 실패했습니다')
      }
    } catch (error) {
      console.error('히어로 슬라이드 조회 실패:', error)
      toast.error('히어로 슬라이드 조회에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSlides()
  }, [])

  const openCreateModal = () => {
    setEditingSlide(null)
    setShowModal(true)
  }

  const openEditModal = (slide: HeroSlide) => {
    setEditingSlide(slide)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingSlide(null)
  }

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드 가능합니다.')
      return null
    }

    setUploadingImage(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('kind', 'hero')
      const res = await adminApiFetch('/api/admin/upload-image', { method: 'POST', body: fd })
      if (res.status === 401) {
        redirectToLogin()
        return null
      }
      const data = await res.json()
      
      if (!res.ok) {
        toast.error(data.error || '이미지 업로드 실패')
        return null
      }
      
      toast.success('이미지가 업로드되었습니다.')
      return data.url
    } catch (error) {
      console.error('이미지 업로드 실패:', error)
      toast.error('이미지 업로드에 실패했습니다.')
      return null
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSave = async (formData: HeroFormData) => {
    if (!formData.image_url.trim()) {
      toast.error('이미지를 업로드하세요')
      return false
    }

    const isEdit = !!editingSlide
    const url = isEdit ? `/api/admin/hero/${editingSlide.id}` : '/api/admin/hero'
    const method = isEdit ? 'PUT' : 'POST'

    try {
      const res = await adminApiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.status === 401) {
        redirectToLogin()
        return false
      }

      const data = await res.json()

      if (res.ok) {
        toast.success(`히어로 슬라이드가 ${isEdit ? '수정' : '생성'}되었습니다`)
        await fetchSlides()
        closeModal()
        return true
      } else {
        toast.error(data.error || `히어로 슬라이드 ${isEdit ? '수정' : '생성'}에 실패했습니다`)
        return false
      }
    } catch (error) {
      console.error(`히어로 슬라이드 ${isEdit ? '수정' : '생성'} 실패:`, error)
      toast.error(`히어로 슬라이드 ${isEdit ? '수정' : '생성'}에 실패했습니다`)
      return false
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const res = await adminApiFetch(`/api/admin/hero/${id}`, {
        method: 'DELETE',
      })

      if (res.status === 401) {
        redirectToLogin()
        return
      }

      if (res.ok) {
        toast.success('히어로 슬라이드가 삭제되었습니다')
        await fetchSlides()
      } else {
        const data = await res.json()
        toast.error(data.error || '히어로 슬라이드 삭제에 실패했습니다')
      }
    } catch (error) {
      console.error('히어로 슬라이드 삭제 실패:', error)
      toast.error('히어로 슬라이드 삭제에 실패했습니다')
    }
  }

  return {
    slides,
    loading,
    uploadingImage,
    showModal,
    editingSlide,
    openCreateModal,
    openEditModal,
    closeModal,
    handleImageUpload,
    handleSave,
    handleDelete,
    refresh: fetchSlides,
  }
}
