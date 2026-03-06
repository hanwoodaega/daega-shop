'use client'

import { ADMIN_CATEGORIES } from '@/lib/utils/constants'
import { Product } from '../_types'
import { useProductImages } from '../_hooks/useProductImages'
import ImageItem from './ImageItem'

interface ProductEditModalProps {
  editing: Product | null
  setEditing: (value: Product | null) => void
  saveEdit: () => Promise<boolean>
  savingEdit: boolean
  allProducts: Product[]
}

export default function ProductEditModal({
  editing,
  setEditing,
  saveEdit,
  savingEdit,
  allProducts,
}: ProductEditModalProps) {
  // 이미지 관리 hook
  const {
    fileInputRef,
    uploadingImage,
    productImages,
    loadingImages,
    handleImageUpload,
    handleDeleteImage,
    handlePriorityChange,
  } = useProductImages({ productId: editing?.id || null })

  if (!editing) return null

  const onImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await handleImageUpload(file)
  }

  // priority 순으로 정렬된 이미지 목록
  const sortedImages = [...productImages].sort((a, b) => a.priority - b.priority)

  const handleSave = async () => {
    const success = await saveEdit()
    if (success) {
      setEditing(null)
    }
  }

  return (
    <>
      {editing && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-4 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold mb-3">상품 수정</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">브랜드</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={editing.brand || ''}
                  onChange={(e) => setEditing({ ...editing, brand: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">이름</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Slug (URL)</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={editing.slug || ''}
                  onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                  placeholder="비워두면 상품명에서 자동 생성"
                />
                <p className="text-xs text-gray-500 mt-1">예: hanwoo-daega-no9-premium</p>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">가격</label>
                <input
                  type="number"
                  className="w-full border rounded px-3 py-2"
                  value={editing.price}
                  onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">카테고리</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={editing.category}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                >
                  {ADMIN_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">무게 (그램, 선택사항)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="w-full border rounded px-3 py-2"
                  value={editing.weight_gram || ''}
                  onChange={(e) =>
                    setEditing({ ...editing, weight_gram: e.target.value ? Number(e.target.value) : null })
                  }
                  placeholder="예: 300, 700"
                />
                <p className="text-xs text-gray-500 mt-1">상품 무게를 그램 단위로 입력하세요</p>
              </div>
              <div className="border-t pt-3 mt-3">
                <label className="block text-xs text-gray-600 mb-2 font-semibold">상품 이미지 관리</label>
                <div className="mb-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={onImageUpload}
                    className="w-full text-sm border rounded px-3 py-2"
                    disabled={uploadingImage}
                  />
                  {uploadingImage && (
                    <p className="text-xs text-gray-500 mt-1">업로드 중... (서버에서 1:1 비율로 자동 압축됩니다)</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    이미지를 하나씩 업로드할 수 있습니다. 권장: 800×800px 이상 (1:1 비율). 서버에서 1:1로 자동 압축됩니다.
                  </p>
                </div>

                {loadingImages ? (
                  <p className="text-xs text-gray-500">이미지 목록 불러오는 중...</p>
                ) : sortedImages.length === 0 ? (
                  <p className="text-xs text-gray-500">등록된 이미지가 없습니다.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {sortedImages.map((img, index) => (
                      <ImageItem
                        key={img.id}
                        image={img}
                        index={index}
                        onDelete={handleDeleteImage}
                        onPriorityChange={handlePriorityChange}
                        totalImages={sortedImages.length}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setEditing(null)}
                className="px-3 py-2 text-sm hover:bg-gray-100 rounded"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={savingEdit}
                className="px-3 py-2 text-sm bg-primary-800 text-white rounded disabled:opacity-60 hover:bg-primary-900"
              >
                {savingEdit ? '저장중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

