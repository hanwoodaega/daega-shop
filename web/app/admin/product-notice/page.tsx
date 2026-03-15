'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminPageLayout from '../_components/AdminPageLayout'
import toast from 'react-hot-toast'

type Product = { id: string; name: string; category: string; price: number }

type NoticeCategory = {
  id: string
  code: string
  name: string
}

type NoticeField = {
  id: string
  category_id: string
  key: string
  label: string
  required: boolean
  sort_order: number
}

type NoticeValue = {
  field_id: string
  value: string
}

export default function AdminProductNoticePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)

  const [productId, setProductId] = useState<string>('')
  const [categories, setCategories] = useState<NoticeCategory[]>([])
  const [fields, setFields] = useState<NoticeField[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [loadingNotice, setLoadingNotice] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoadingProducts(true)
    fetch('/api/admin/products?limit=500')
      .then((res) => res.json())
      .then((data) => {
        if (data.items) setProducts(data.items)
      })
      .catch(() => toast.error('상품 목록을 불러오지 못했습니다.', { duration: 3000 }))
      .finally(() => setLoadingProducts(false))
  }, [])

  const loadNotice = (pid: string) => {
    if (!pid) {
      setCategories([])
      setFields([])
      setValues({})
      setSelectedCategoryId(null)
      return
    }
    setLoadingNotice(true)
    fetch(`/api/admin/product-notices?product_id=${encodeURIComponent(pid)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          toast.error(data.error, { duration: 3000 })
          return
        }
        setCategories(data.categories || [])
        setFields(data.fields || [])
        const valueMap: Record<string, string> = {}
        for (const v of data.values || []) {
          valueMap[v.field_id] = v.value
        }
        setValues(valueMap)
        setSelectedCategoryId(data.notice_category_id || null)
      })
      .catch(() => {
        toast.error('상품고시정보를 불러오지 못했습니다.', { duration: 3000 })
      })
      .finally(() => setLoadingNotice(false))
  }

  useEffect(() => {
    if (productId) {
      loadNotice(productId)
    } else {
      setCategories([])
      setFields([])
      setValues({})
      setSelectedCategoryId(null)
    }
  }, [productId])

  const currentFields = useMemo(
    () => fields.filter((f) => f.category_id === selectedCategoryId).sort((a, b) => a.sort_order - b.sort_order),
    [fields, selectedCategoryId]
  )

  const handleChangeValue = (fieldId: string, val: string) => {
    setValues((prev) => ({ ...prev, [fieldId]: val }))
  }

  const handleSave = async () => {
    if (!productId) {
      toast.error('상품을 선택해주세요.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        product_id: productId,
        notice_category_id: selectedCategoryId,
        values: Object.entries(values).map(([field_id, value]) => ({ field_id, value })),
      }
      const res = await fetch('/api/admin/product-notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        toast.error(data.error || '저장에 실패했습니다.', { duration: 3000 })
        return
      }
      toast.success('상품고시정보가 저장되었습니다.', { duration: 2000 })
      loadNotice(productId)
    } catch {
      toast.error('저장 중 오류가 발생했습니다.', { duration: 3000 })
    } finally {
      setSaving(false)
    }
  }

  const selectedProduct = products.find((p) => p.id === productId)

  return (
    <AdminPageLayout
      title="상품고시정보 관리"
      description="상품별 법정 상품 정보 제공 고시를 등록·수정합니다."
      extra={
        <button
          type="button"
          onClick={handleSave}
          disabled={!productId || saving}
          className="px-4 py-2 rounded-lg bg-primary-800 text-white text-sm font-semibold hover:bg-primary-900 disabled:bg-neutral-300 disabled:cursor-not-allowed"
        >
          {saving ? '저장 중...' : '저장'}
        </button>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <label className="text-sm font-medium text-neutral-700">상품 선택</label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="border border-neutral-300 rounded-lg px-3 py-2 min-w-[240px] bg-white"
            disabled={loadingProducts}
          >
            <option value="">-- 상품을 선택하세요 --</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.category})
              </option>
            ))}
          </select>
          {loadingProducts && <span className="text-sm text-neutral-500">상품 목록 로딩 중...</span>}
        </div>

        {productId && (
          <>
            <div className="border-t border-neutral-200 pt-6">
              <h3 className="text-lg font-semibold text-neutral-800 mb-3">
                상품고시 카테고리 {selectedProduct && `· ${selectedProduct.name}`}
              </h3>
              {loadingNotice ? (
                <p className="text-sm text-neutral-500">상품고시정보 로딩 중...</p>
              ) : categories.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  아직 상품고시 카테고리가 없습니다. Supabase에서 직접 카테고리와 필드를 먼저 등록해주세요.
                </p>
              ) : (
                <div className="flex flex-wrap gap-3 mb-4">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={`px-3 py-1.5 rounded-full text-sm border ${
                        selectedCategoryId === cat.id
                          ? 'bg-primary-800 text-white border-primary-800'
                          : 'bg-white text-neutral-800 border-neutral-300 hover:bg-neutral-50'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              )}

              {selectedCategoryId && !loadingNotice && (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-sm border border-neutral-200">
                    <thead className="bg-neutral-50">
                      <tr>
                        <th className="px-3 py-2 border-b text-left w-1/3">항목명</th>
                        <th className="px-3 py-2 border-b text-left">값</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentFields.map((field) => (
                        <tr key={field.id} className="align-top">
                          <td className="px-3 py-2 border-b">
                            <div>
                              <span>{field.label}{!field.required && ' (선택)'}</span>
                            </div>
                            <p className="text-[11px] text-neutral-400 break-all mt-0.5">{field.key}</p>
                          </td>
                          <td className="px-3 py-2 border-b">
                            <textarea
                              value={values[field.id] || ''}
                              onChange={(e) => handleChangeValue(field.id, e.target.value)}
                              className="w-full min-h-[42px] px-2 py-1 border border-neutral-300 rounded text-sm resize-y"
                              placeholder={field.label}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminPageLayout>
  )
}

