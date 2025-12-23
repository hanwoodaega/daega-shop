'use client'

import { useState, useRef, useEffect } from 'react'
import toast from 'react-hot-toast'
import type { Banner } from '../_types'

interface BannerFormModalProps {
  editingBanner: Banner | null
  onClose: () => void
  onSuccess: () => void
}

interface FormData {
  title: string
  subtitle_black: string
  subtitle_red: string
  description: string
  image_url: string
  background_color: string
  is_active: boolean
  sort_order: number
  slug: string
}

export default function BannerFormModal({ editingBanner, onClose, onSuccess }: BannerFormModalProps) {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    subtitle_black: '',
    subtitle_red: '',
    description: '',
    image_url: '',
    background_color: '#FFFFFF',
    is_active: true,
    sort_order: 0,
    slug: '',
  })
  const [uploadingImage, setUploadingImage] = useState(false)
  const imageFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingBanner) {
      setFormData({
        title: editingBanner.title || '',
        subtitle_black: editingBanner.subtitle_black || '',
        subtitle_red: editingBanner.subtitle_red || '',
        description: editingBanner.description || '',
        image_url: editingBanner.image_url,
        background_color: editingBanner.background_color,
        is_active: editingBanner.is_active,
        sort_order: editingBanner.sort_order,
        slug: editingBanner.slug || '',
      })
    }
  }, [editingBanner])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 파일 크기 제한 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('파일 크기는 10MB 이하여야 합니다.')
      return
    }

    // 이미지 파일 타입 확인
    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드 가능합니다.')
      return
    }

    setUploadingImage(true)
    try {
      // 서버 API를 통해 이미지 업로드
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', 'banner-images') // 배너 이미지 버킷 지정

      const res = await fetch('/api/admin/upload-image', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '이미지 업로드 실패')
      }

      const data = await res.json()
      setFormData(prev => ({ ...prev, image_url: data.url }))
      toast.success('이미지 업로드 완료')
    } catch (error: any) {
      console.error('이미지 업로드 실패:', error)
      toast.error(error.message || '이미지 업로드에 실패했습니다.')
    } finally {
      setUploadingImage(false)
      if (imageFileInputRef.current) imageFileInputRef.current.value = ''
    }
  }

  const apiCall = async (method: 'PUT' | 'POST', url: string, data: FormData) => {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const responseData = await res.json()

    if (!res.ok) {
      throw new Error(responseData.error || `${method === 'PUT' ? '배너 수정' : '배너 생성'} 실패`)
    }

    return responseData
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.image_url) {
      toast.error('이미지 URL을 입력하세요')
      return
    }

    if (!formData.slug || formData.slug.trim() === '') {
      toast.error('Slug를 입력하세요')
      return
    }

    if (formData.slug.includes(' ')) {
      toast.error('Slug에는 공백을 사용할 수 없습니다.')
      return
    }

    try {
      if (editingBanner) {
        await apiCall('PUT', `/api/admin/banners/${editingBanner.id}`, formData)
        toast.success('배너가 수정되었습니다')
      } else {
        await apiCall('POST', '/api/admin/banners', formData)
        toast.success('배너가 생성되었습니다')
      }
      onSuccess()
    } catch (error: any) {
      console.error('배너 저장 실패:', error)
      toast.error(error.message || '배너 저장에 실패했습니다')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-xl font-bold">
            {editingBanner ? '배너 수정' : '새 배너 만들기'}
          </h2>
          <button
            onClick={onClose}
            className="text-2xl text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">타이틀 (선택, 줄바꿈 가능)</label>
            <textarea
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="타이틀 (Enter로 줄바꿈)"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">검정색 부제목 (선택, 줄바꿈 가능)</label>
            <textarea
              value={formData.subtitle_black}
              onChange={(e) => setFormData(prev => ({ ...prev, subtitle_black: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="검정색 부제목 (Enter로 줄바꿈)"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">빨강색 부제목 (선택, 줄바꿈 가능)</label>
            <textarea
              value={formData.subtitle_red}
              onChange={(e) => setFormData(prev => ({ ...prev, subtitle_red: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="빨강색 부제목 (Enter로 줄바꿈)"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">설명 (선택)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="설명 문구"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              이미지 URL <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={imageFileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => imageFileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {uploadingImage ? '업로드 중...' : '이미지 업로드'}
                </button>
              </div>
              <input
                type="text"
                value={formData.image_url}
                onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="이미지 URL을 입력하거나 업로드하세요"
                required
              />
              {formData.image_url && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1">미리보기:</p>
                  <div className="relative w-full aspect-square max-w-xs border rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={formData.image_url}
                      alt="미리보기"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">배경색</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={formData.background_color}
                onChange={(e) => setFormData(prev => ({ ...prev, background_color: e.target.value }))}
                className="w-16 h-10 border rounded"
              />
              <input
                type="text"
                value={formData.background_color}
                onChange={(e) => setFormData(prev => ({ ...prev, background_color: e.target.value }))}
                className="flex-1 px-3 py-2 border rounded-lg"
                placeholder="#FFFFFF"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              링크 (slug) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="예: best, sale, new-arrivals"
              required
            />
            <p className="text-xs text-gray-500 mt-1">배너 클릭 시 이동할 페이지 경로 (예: best 입력 시 /banners/best로 이동)</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">순서</label>
            <input
              type="number"
              value={formData.sort_order}
              onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">낮은 숫자부터 표시됩니다</p>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="w-5 h-5 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium">활성화</span>
            </label>
            <p className="text-xs text-gray-500 mt-1">비활성화된 배너는 메인 페이지에 표시되지 않습니다</p>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {editingBanner ? '수정' : '생성'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

