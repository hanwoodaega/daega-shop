'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import AdminPageLayout from '../_components/AdminPageLayout'
import toast from 'react-hot-toast'

type Product = { id: string; name: string; category: string; price: number }
type DescriptionImage = {
  id: string
  product_id: string
  image_url: string
  sort_order: number
  created_at: string
}

export default function AdminProductDescriptionPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [productId, setProductId] = useState<string>('')
  const [images, setImages] = useState<DescriptionImage[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [loadingImages, setLoadingImages] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadKey, setUploadKey] = useState(0)

  const loadProducts = useCallback(() => {
    setLoadingProducts(true)
    fetch('/api/admin/products?limit=500')
      .then((res) => res.json())
      .then((data) => {
        if (data.items) setProducts(data.items)
      })
      .catch(() => toast.error('상품 목록을 불러오지 못했습니다.'))
      .finally(() => setLoadingProducts(false))
  }, [])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const loadImages = useCallback(() => {
    if (!productId) {
      setImages([])
      return
    }
    setLoadingImages(true)
    fetch(`/api/admin/product-description-images?product_id=${encodeURIComponent(productId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.images) setImages(data.images)
        else setImages([])
      })
      .catch(() => toast.error('설명 이미지를 불러오지 못했습니다.'))
      .finally(() => setLoadingImages(false))
  }, [productId])

  useEffect(() => {
    loadImages()
  }, [loadImages])

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !productId) return
    setUploading(true)
    const form = new FormData()
    form.set('file', file)
    form.set('product_id', productId)
    fetch('/api/admin/product-description-images', {
      method: 'POST',
      body: form,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.image) {
          setImages((prev) => [...prev, data.image].sort((a, b) => a.sort_order - b.sort_order))
          toast.success('이미지가 추가되었습니다.')
          setUploadKey((k) => k + 1)
        } else {
          toast.error(data.error || '업로드 실패')
        }
      })
      .catch(() => toast.error('업로드에 실패했습니다.'))
      .finally(() => {
        setUploading(false)
        e.target.value = ''
      })
  }

  const moveOrder = (id: string, delta: number) => {
    const idx = images.findIndex((i) => i.id === id)
    if (idx < 0) return
    const newOrder = images[idx].sort_order + delta
    const swap = images.find((i) => i.sort_order === newOrder)
    if (!swap) return
    Promise.all([
      fetch(`/api/admin/product-description-images/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sort_order: swap.sort_order }),
      }),
      fetch(`/api/admin/product-description-images/${swap.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sort_order: images[idx].sort_order }),
      }),
    ]).then(() => {
      loadImages()
      toast.success('순서를 변경했습니다.')
    })
  }

  const handleDelete = (id: string) => {
    if (!window.confirm('이 이미지를 삭제할까요?')) return
    fetch(`/api/admin/product-description-images/${id}`, { method: 'DELETE' })
      .then((res) => {
        if (res.ok) {
          setImages((prev) => prev.filter((i) => i.id !== id))
          toast.success('삭제되었습니다.')
        } else return res.json()
      })
      .then((data) => {
        if (data?.error) toast.error(data.error)
      })
      .catch(() => toast.error('삭제에 실패했습니다.'))
  }

  const selectedProduct = products.find((p) => p.id === productId)

  return (
    <AdminPageLayout
      title="상품 상세 (설명 이미지)"
      description="상품별 상세페이지 설명 이미지를 등록·순서 변경·삭제합니다. 가로 1000px 고정, 세로 비율 유지로 저장됩니다."
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <label className="text-sm font-medium text-neutral-700">상품 선택</label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="border border-neutral-300 rounded-lg px-3 py-2 min-w-[200px] bg-white"
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

        {!productId && (
          <p className="text-neutral-500 text-sm">상품을 선택하면 해당 상품의 설명 이미지를 관리할 수 있습니다.</p>
        )}

        {productId && (
          <>
            <div className="border-t border-neutral-200 pt-6">
              <h3 className="text-lg font-semibold text-neutral-800 mb-2">
                설명 이미지 목록 {selectedProduct && `· ${selectedProduct.name}`}
              </h3>
              <div className="mb-4 flex items-center gap-3 flex-wrap">
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary-800 text-white rounded-lg cursor-pointer hover:bg-primary-900 text-sm font-medium">
                  <input
                    key={uploadKey}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleUpload}
                    disabled={uploading}
                  />
                  {uploading ? '업로드 중...' : '+ 이미지 추가'}
                </label>
                <span className="text-xs text-neutral-500">가로 1000px·세로 비율 유지로 저장됩니다.</span>
              </div>

              {loadingImages ? (
                <p className="text-sm text-neutral-500">이미지 목록 로딩 중...</p>
              ) : images.length === 0 ? (
                <p className="text-sm text-neutral-500">등록된 설명 이미지가 없습니다. 위에서 이미지를 추가하세요.</p>
              ) : (
                <ul className="space-y-4">
                  {images.map((img, idx) => (
                    <li
                      key={img.id}
                      className="flex flex-wrap items-center gap-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200"
                    >
                      <span className="text-sm font-medium text-neutral-600 w-8">#{idx + 1}</span>
                      <div className="flex-shrink-0 w-24 h-24 rounded overflow-hidden bg-neutral-200">
                        <img
                          src={img.image_url}
                          alt=""
                          className="w-full h-full object-cover"
                          width={96}
                          height={96}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-neutral-500 truncate max-w-md">{img.image_url}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => moveOrder(img.id, -1)}
                          disabled={idx === 0}
                          className="p-2 rounded border border-neutral-300 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed"
                          title="위로"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveOrder(img.id, 1)}
                          disabled={idx === images.length - 1}
                          className="p-2 rounded border border-neutral-300 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed"
                          title="아래로"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(img.id)}
                          className="p-2 rounded border border-red-200 text-red-700 hover:bg-red-50"
                        >
                          삭제
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </AdminPageLayout>
  )
}
