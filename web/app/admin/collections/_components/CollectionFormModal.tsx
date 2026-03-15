'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useImageUpload } from '../_hooks/useImageUpload'
import type { Collection, ColorTheme } from '../_types'

interface CollectionFormModalProps {
  editingCollection: Collection | null
  onClose: () => void
  onSuccess: () => void
}

interface FormData {
  type: string
  title: string
  description: string
  image_url: string
  color_theme: ColorTheme
  sort_order: number
  is_active: boolean
}

// 기본 색상 테마 (설명은 항상 검정으로 표시되며 DB에 저장하지 않음)
const defaultColorTheme: ColorTheme = {
  background: '#FFFFFF',
  accent: '#C02020',
  title_color: '#111111',
}

export default function CollectionFormModal({
  editingCollection,
  onClose,
  onSuccess,
}: CollectionFormModalProps) {
  const [formData, setFormData] = useState<FormData>({
    type: '',
    title: '',
    description: '',
    image_url: '',
    color_theme: defaultColorTheme,
    sort_order: 0,
    is_active: true,
  })

  const { uploading, fileInputRef, handleFileSelect } = useImageUpload({
    bucket: 'product-images',
    maxSizeMB: 10,
    useServerUpload: true, // RLS 회피를 위해 관리자 API로 업로드
    preserveAspect: true, // 비율 유지하며 압축만 (잘리지 않음)
  })

  useEffect(() => {
    if (editingCollection) {
      setFormData({
        type: editingCollection.type,
        title: editingCollection.title || '',
        description: editingCollection.description || '',
        image_url: editingCollection.image_url || '',
        color_theme: {
          ...defaultColorTheme,
          ...(editingCollection.color_theme || {}),
        },
        sort_order: editingCollection.sort_order ?? 0,
        is_active: editingCollection.is_active ?? true,
      })
    }
  }, [editingCollection])

  const apiCall = async (method: 'PUT' | 'POST', url: string, data: FormData) => {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: data.type,
        title: data.title || null,
        description: data.description || null,
        image_url: data.image_url || null,
        color_theme: { background: data.color_theme.background },
        sort_order: data.sort_order ?? 0,
        is_active: data.is_active ?? true,
      }),
    })

    const responseData = await res.json()

    if (!res.ok) {
      throw new Error(responseData.error || `${method === 'PUT' ? '컬렉션 수정' : '컬렉션 생성'} 실패`)
    }

    return responseData
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.type) {
      toast.error('타입을 입력해주세요', { duration: 3000 })
      return
    }

    try {
      if (editingCollection) {
        await apiCall('PUT', `/api/admin/collections/${editingCollection.id}`, formData)
        toast.success('컬렉션이 수정되었습니다', { duration: 2000 })
      } else {
        await apiCall('POST', '/api/admin/collections', formData)
        toast.success('컬렉션이 생성되었습니다', { duration: 2000 })
      }
      onSuccess()
    } catch (error: any) {
      console.error('컬렉션 저장 실패:', error)
      toast.error(error.message || '컬렉션 저장에 실패했습니다', { duration: 3000 })
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = await handleFileSelect(e)
    if (url) {
      setFormData(prev => ({ ...prev, image_url: url }))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {editingCollection ? '컬렉션 수정' : '새 컬렉션 만들기'}
          </h2>
          <button
            onClick={onClose}
            className="text-2xl text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium mb-2">타입 (고유 키) *</label>
            <input
              type="text"
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="예: best, sale, no9"
              disabled={!!editingCollection}
              required
            />
            {editingCollection && (
              <p className="text-xs text-gray-500 mt-1">타입은 수정할 수 없습니다</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">타이틀</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="섹션 타이틀"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">설명 (줄바꿈 가능)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="타이틀 아래 설명 (Enter로 줄바꿈)"
              rows={5}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              대표 이미지
              <span className="text-xs text-gray-500 ml-2">(권장: 1200×675px, 16:9 비율)</span>
            </label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {uploading ? '업로드 중...' : '이미지 업로드'}
                </button>
              </div>
              <input
                type="text"
                value={formData.image_url}
                onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="이미지 URL을 입력하거나 업로드하세요"
              />
              {formData.image_url && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1">미리보기:</p>
                  <div className="relative w-full aspect-[16/9] border rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={formData.image_url}
                      alt="미리보기"
                      className="w-full h-full object-cover"
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
            <label className="block text-sm font-medium mb-2">순서</label>
            <input
              type="number"
              value={formData.sort_order}
              onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div className="border-t pt-4">
            <label className="block text-sm font-medium mb-3">색상 테마</label>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">배경색</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.color_theme.background}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      color_theme: { ...prev.color_theme, background: e.target.value }
                    }))}
                    className="w-12 h-10 border rounded"
                  />
                  <input
                    type="text"
                    value={formData.color_theme.background}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      color_theme: { ...prev.color_theme, background: e.target.value }
                    }))}
                    className="flex-1 px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              {editingCollection ? '수정' : '생성'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
