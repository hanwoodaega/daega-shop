'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface HeroSlide {
  id: string
  image_url: string
  link_url: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function HeroManagementPage() {
  const router = useRouter()
  const [slides, setSlides] = useState<HeroSlide[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingSlide, setEditingSlide] = useState<HeroSlide | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const imageFileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    image_url: '',
    link_url: '',
    sort_order: 0,
    is_active: true,
  })

  useEffect(() => {
    fetchSlides()
  }, [])

  const fetchSlides = async () => {
    try {
      const res = await fetch('/api/admin/hero')
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드 가능합니다.')
      return
    }

    setUploadingImage(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/upload-image', { method: 'POST', body: fd })
      const data = await res.json()
      
      if (!res.ok) {
        toast.error(data.error || '이미지 업로드 실패')
        return
      }
      
      setFormData({ ...formData, image_url: data.url })
      toast.success('이미지가 업로드되었습니다.')
    } catch (error) {
      console.error('이미지 업로드 실패:', error)
      toast.error('이미지 업로드에 실패했습니다.')
    } finally {
      setUploadingImage(false)
    }
  }

  const resetForm = () => {
    setFormData({
      image_url: '',
      link_url: '',
      sort_order: 0,
      is_active: true,
    })
    setEditingSlide(null)
    if (imageFileInputRef.current) imageFileInputRef.current.value = ''
  }

  const openEditModal = (slide: HeroSlide) => {
    setEditingSlide(slide)
    setFormData({
      image_url: slide.image_url,
      link_url: slide.link_url || '',
      sort_order: slide.sort_order,
      is_active: slide.is_active,
    })
    setShowCreateModal(true)
  }

  const handleCreate = async () => {
    if (!formData.image_url.trim()) {
      toast.error('이미지를 업로드하세요')
      return
    }

    try {
      const res = await fetch('/api/admin/hero', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('히어로 슬라이드가 생성되었습니다')
        setShowCreateModal(false)
        resetForm()
        await fetchSlides()
      } else {
        toast.error(data.error || '히어로 슬라이드 생성에 실패했습니다')
      }
    } catch (error) {
      console.error('히어로 슬라이드 생성 실패:', error)
      toast.error('히어로 슬라이드 생성에 실패했습니다')
    }
  }

  const handleUpdate = async () => {
    if (!editingSlide) return

    if (!formData.image_url.trim()) {
      toast.error('이미지를 업로드하세요')
      return
    }

    try {
      const res = await fetch(`/api/admin/hero/${editingSlide.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('히어로 슬라이드가 수정되었습니다')
        setShowCreateModal(false)
        resetForm()
        await fetchSlides()
      } else {
        toast.error(data.error || '히어로 슬라이드 수정에 실패했습니다')
      }
    } catch (error) {
      console.error('히어로 슬라이드 수정 실패:', error)
      toast.error('히어로 슬라이드 수정에 실패했습니다')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/admin/hero/${id}`, {
        method: 'DELETE',
      })

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

  const handleToggleActive = async (slide: HeroSlide) => {
    try {
      const res = await fetch(`/api/admin/hero/${slide.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...slide,
          is_active: !slide.is_active,
        }),
      })

      if (res.ok) {
        toast.success(`히어로 슬라이드가 ${!slide.is_active ? '활성화' : '비활성화'}되었습니다`)
        await fetchSlides()
      }
    } catch (error) {
      console.error('히어로 슬라이드 상태 변경 실패:', error)
      toast.error('히어로 슬라이드 상태 변경에 실패했습니다')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <p>로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">히어로 이미지 관리</h1>
            <p className="text-gray-600 mt-1">메인페이지 히어로 섹션 이미지를 관리합니다</p>
          </div>
          <button
            onClick={() => {
              resetForm()
              setShowCreateModal(true)
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + 새 이미지 추가
          </button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="divide-y divide-gray-200">
            {slides.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                등록된 히어로 이미지가 없습니다
              </div>
            ) : (
              slides.map((slide) => (
                <div key={slide.id} className="p-6 flex items-center gap-6">
                  <div className="flex-shrink-0">
                    <img
                      src={slide.image_url}
                      alt={`히어로 슬라이드 ${slide.sort_order}`}
                      className="w-32 h-20 object-cover rounded"
                    />
                  </div>
                    <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-1 text-xs rounded ${
                        slide.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {slide.is_active ? '활성' : '비활성'}
                      </span>
                      <span className="text-sm text-gray-600">순서: {slide.sort_order}</span>
                      {slide.link_url && (
                        <span className="text-xs text-blue-600">링크 있음</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{slide.image_url}</p>
                    {slide.link_url && (
                      <p className="text-xs text-blue-600 truncate mt-1">→ {slide.link_url}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleActive(slide)}
                      className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                    >
                      {slide.is_active ? '비활성화' : '활성화'}
                    </button>
                    <button
                      onClick={() => openEditModal(slide)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(slide.id)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 생성/수정 모달 */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">
                  {editingSlide ? '히어로 이미지 수정' : '새 히어로 이미지 추가'}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    resetForm()
                  }}
                  className="text-2xl text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">이미지 *</label>
                  <input
                    ref={imageFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  {uploadingImage && <p className="text-sm text-gray-500 mt-1">업로드 중...</p>}
                  {formData.image_url && (
                    <div className="mt-3">
                      <img
                        src={formData.image_url}
                        alt="미리보기"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">링크 URL (선택사항)</label>
                  <input
                    type="text"
                    value={formData.link_url}
                    onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="예: /products/hanwoo 또는 https://example.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">슬라이드 클릭 시 이동할 경로를 입력하세요</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">순서</label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">숫자가 작을수록 먼저 표시됩니다</p>
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">활성화</span>
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={editingSlide ? handleUpdate : handleCreate}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingSlide ? '수정' : '생성'}
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateModal(false)
                      resetForm()
                    }}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

