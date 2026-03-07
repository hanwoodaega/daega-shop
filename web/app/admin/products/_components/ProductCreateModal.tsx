'use client'

import { ADMIN_CATEGORIES } from '@/lib/utils/constants'
import { ProductFormData } from '../_types'

type CreateProductResult =
  | { success: true; productId: string }
  | { success: false }

interface ProductCreateModalProps {
  isOpen: boolean
  form: ProductFormData
  loading: boolean
  error: string | null
  onClose: () => void
  onUpdateField: <K extends keyof ProductFormData>(field: K, value: ProductFormData[K]) => void
  onSubmit: () => Promise<CreateProductResult>
}

export default function ProductCreateModal({
  isOpen,
  form,
  loading,
  error,
  onClose,
  onUpdateField,
  onSubmit,
}: ProductCreateModalProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await onSubmit()
    if (result.success) {
      // 상품 등록 후 바로 닫기
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-full overflow-y-auto shadow-2xl">
        <div className="flex items-start justify-between px-6 py-4 border-b border-neutral-200">
          <div>
            <p className="text-xs text-neutral-500">새 상품 등록</p>
            <h3 className="text-lg font-semibold text-neutral-900">상품 정보를 입력해주세요</h3>
          </div>
          <button
            onClick={onClose}
            className="text-sm text-neutral-500 hover:text-neutral-800"
          >
            닫기 ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-6">
          {error && (
            <div className="max-w-2xl mx-auto mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="space-y-4 max-w-2xl mx-auto">
            <div>
              <label className="block text-sm font-medium mb-1 text-neutral-600">브랜드</label>
              <input
                name="brand"
                value={form.brand}
                onChange={(e) => onUpdateField('brand', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-neutral-600">상품명 *</label>
              <input
                name="name"
                value={form.name}
                onChange={(e) => onUpdateField('name', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-neutral-600">Slug (URL)</label>
              <input
                name="slug"
                value={form.slug}
                onChange={(e) => onUpdateField('slug', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="자동 생성 (비워두면 상품명에서 자동 생성)"
              />
              <p className="text-xs text-neutral-500 mt-1">예: hanwoo-daega-no9-premium</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-neutral-600">가격(원) *</label>
              <input
                name="price"
                type="number"
                value={form.price}
                onChange={(e) => onUpdateField('price', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-neutral-600">카테고리 *</label>
              <select
                name="category"
                value={form.category}
                onChange={(e) => onUpdateField('category', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                {ADMIN_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-neutral-600">
                무게 (그램, 선택사항)
              </label>
              <input
                name="weight_gram"
                type="number"
                min="0"
                step="1"
                value={form.weight_gram}
                onChange={(e) => onUpdateField('weight_gram', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="예: 300, 700"
              />
              <p className="text-xs text-neutral-500 mt-1">
                상품 무게를 그램 단위로 입력해주세요 (예: 300g, 700g)
              </p>
            </div>
            <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/80 px-3 py-4 text-sm text-neutral-600">
              <p className="font-semibold text-neutral-700 mb-1">재고 입력 없이 운영합니다.</p>
              <p>등록 후 목록에서 "품절처리/판매재개" 버튼으로 상태를 직접 전환하세요.</p>
              <p className="text-xs text-neutral-500 mt-1">
                타임딜 재고는 타임딜 메뉴에서 별도로 관리됩니다.
              </p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-4 text-sm text-amber-800">
              <p className="font-semibold mb-1">이미지 등록</p>
              <p className="text-xs">
                이미지는 상품 등록 후 목록에서 해당 상품의 <strong>[수정]</strong> 버튼을 눌러 추가할 수 있습니다. 권장: 800×800px (1:1 비율).
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-neutral-600 hover:bg-neutral-100"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-lg bg-primary-800 text-white text-sm font-semibold hover:bg-primary-900 disabled:opacity-60"
            >
              {loading ? '등록 중...' : '상품 등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

