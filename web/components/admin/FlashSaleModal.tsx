'use client'

import { useState, useEffect } from 'react'

interface FlashSaleModalProps {
  product: any | null
  onClose: () => void
  onSave: (data: { flash_sale_end_time: string | null, flash_sale_price: number | null, flash_sale_stock: number | null }) => Promise<void>
}

export default function FlashSaleModal({ product, onClose, onSave }: FlashSaleModalProps) {
  const [form, setForm] = useState({
    flash_sale_end_time: '',
    flash_sale_price: '',
    flash_sale_stock: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (product) {
      setForm({
        flash_sale_end_time: product.flash_sale_end_time 
          ? new Date(product.flash_sale_end_time).toISOString().slice(0, 16)
          : '',
        flash_sale_price: product.flash_sale_price ?? '',
        flash_sale_stock: product.flash_sale_stock ?? '',
      })
    }
  }, [product])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({
        flash_sale_end_time: form.flash_sale_end_time ? new Date(form.flash_sale_end_time).toISOString() : null,
        flash_sale_price: form.flash_sale_price ? Number(form.flash_sale_price) : null,
        flash_sale_stock: form.flash_sale_stock ? Number(form.flash_sale_stock) : null,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleClear = async () => {
    setSaving(true)
    try {
      await onSave({
        flash_sale_end_time: null,
        flash_sale_price: null,
        flash_sale_stock: null,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  if (!product) return null

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
        <h3 className="text-lg font-semibold mb-4">⏰ 타임딜 설정</h3>
        <p className="text-sm text-gray-600 mb-4">{product.name}</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              타임딜 종료 시간
            </label>
            <input
              type="datetime-local"
              value={form.flash_sale_end_time}
              onChange={(e) => setForm({ ...form, flash_sale_end_time: e.target.value })}
              className="w-full border rounded px-3 py-2 text-sm"
              required={!!form.flash_sale_price || !!form.flash_sale_stock}
            />
            <p className="text-xs text-gray-500 mt-1">
              타임딜 종료 시간을 설정하면 타임딜이 활성화됩니다.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              타임딜 가격 (원)
            </label>
            <input
              type="number"
              min="0"
              value={form.flash_sale_price}
              onChange={(e) => setForm({ ...form, flash_sale_price: e.target.value })}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder={`정가: ${product.price.toLocaleString()}원`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              타임딜 한정 수량
            </label>
            <input
              type="number"
              min="0"
              value={form.flash_sale_stock}
              onChange={(e) => setForm({ ...form, flash_sale_stock: e.target.value })}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="한정 수량"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm border rounded hover:bg-gray-100 transition"
            >
              취소
            </button>
            {(product.flash_sale_end_time || product.flash_sale_price || product.flash_sale_stock) && (
              <button
                type="button"
                onClick={handleClear}
                disabled={saving}
                className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-60 transition"
              >
                타임딜 해제
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 text-sm bg-primary-800 text-white rounded hover:bg-primary-900 disabled:opacity-60 transition"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

