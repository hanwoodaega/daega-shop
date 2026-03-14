import { useRef, useState, useEffect } from 'react'
import { HeroSlide, HeroFormData } from '../_types'

interface HeroModalProps {
  isOpen: boolean
  onClose: () => void
  editingSlide: HeroSlide | null
  onSave: (formData: HeroFormData) => Promise<boolean>
  onImageUpload: (file: File) => Promise<string | null>
  uploadingImage: boolean
}

export default function HeroModal({
  isOpen,
  onClose,
  editingSlide,
  onSave,
  onImageUpload,
  uploadingImage,
}: HeroModalProps) {
  const imageFileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState<HeroFormData>({
    image_url: '',
    link_url: '',
    sort_order: 0,
    is_active: true,
  })

  useEffect(() => {
    if (editingSlide) {
      setFormData({
        image_url: editingSlide.image_url,
        link_url: editingSlide.link_url || '',
        sort_order: editingSlide.sort_order,
        is_active: editingSlide.is_active,
      })
    } else {
      setFormData({
        image_url: '',
        link_url: '',
        sort_order: 0,
        is_active: true,
      })
    }
  }, [editingSlide, isOpen])

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await onImageUpload(file)
    if (url) {
      setFormData((prev) => ({ ...prev, image_url: url }))
    }
  }

  const handleSubmit = async () => {
    const success = await onSave(formData)
    if (success) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {editingSlide ? '히어로 이미지 수정' : '새 히어로 이미지 추가'}
          </h2>
          <button
            onClick={onClose}
            className="text-2xl text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">이미지 *</label>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2">
              모바일·PC 모두 5:3 비율로 표시됩니다. 가로로 넓은 5:3 이미지를 사용해주세요 (권장: 1920×1152px 또는 1000×600px). 중요한 요소는 가운데에 두는 것을 권장합니다.
            </p>
            <input
              ref={imageFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
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
            <p className="text-xs text-gray-500 mt-1">슬라이드 클릭 시 이동할 경로를 입력해주세요</p>
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

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSubmit}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {editingSlide ? '수정' : '생성'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              취소
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

