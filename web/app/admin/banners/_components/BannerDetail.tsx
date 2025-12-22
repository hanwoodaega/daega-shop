'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { formatPrice } from '@/lib/utils/utils'
import ProductSelectorModal from './ProductSelectorModal'
import type { Banner, Product } from '../_types'

interface BannerProduct {
  id: string
  product_id: string
  products: {
    id: string
    name: string
    price: number
    brand: string | null
    category: string
  }
}

interface BannerDetailProps {
  banner: Banner | null
  onEdit: (banner: Banner) => void
  onDelete: () => void
  initialProducts?: Product[]
}

export default function BannerDetail({ banner, onEdit, onDelete, initialProducts = [] }: BannerDetailProps) {
  const [bannerProducts, setBannerProducts] = useState<BannerProduct[]>([])
  const [showProductSelector, setShowProductSelector] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (banner) {
      fetchBannerProducts(banner.id)
    } else {
      setBannerProducts([])
    }
  }, [banner])

  const fetchBannerProducts = async (bannerId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/banners/${bannerId}/products`)
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      const data = await res.json()
      setBannerProducts(data.products || [])
    } catch (error) {
      console.error('배너 상품 조회 실패:', error)
      setBannerProducts([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!banner) return
    if (!window.confirm('배너를 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/admin/banners/${banner.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success('배너가 삭제되었습니다')
        onDelete()
      } else {
        const data = await res.json()
        toast.error(data.error || '배너 삭제 실패')
      }
    } catch (error) {
      console.error('배너 삭제 실패:', error)
      toast.error('배너 삭제에 실패했습니다')
    }
  }

  const handleRemoveProduct = async (productId: string) => {
    if (!banner) return
    if (!window.confirm('이 상품을 배너에서 제거하시겠습니까?')) return

    try {
      const res = await fetch(
        `/api/admin/banners/${banner.id}/products?product_id=${productId}`,
        { method: 'DELETE' }
      )

      if (res.ok) {
        toast.success('상품이 제거되었습니다')
        fetchBannerProducts(banner.id)
      } else {
        const data = await res.json()
        toast.error(data.error || '상품 제거에 실패했습니다')
      }
    } catch (error) {
      console.error('상품 제거 실패:', error)
      toast.error('상품 제거에 실패했습니다')
    }
  }

  const handleProductsAdded = () => {
    if (banner) {
      fetchBannerProducts(banner.id)
    }
  }

  if (!banner) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-12 text-center">
        <p className="text-gray-500">배너를 선택하세요</p>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            {banner.title && (
              <h2 className="text-xl font-bold text-gray-900 mb-1">{banner.title}</h2>
            )}
            {banner.subtitle_black && (
              <h2 className="text-xl font-bold text-black mb-1">{banner.subtitle_black}</h2>
            )}
            {banner.subtitle_red && (
              <h2 className="text-xl font-bold text-red-600 mb-1">{banner.subtitle_red}</h2>
            )}
            {banner.description && (
              <p className="text-sm text-gray-500 mb-1">{banner.description}</p>
            )}
            {banner.slug && (
              <p className="text-xs text-blue-600 mb-1">/{banner.slug}</p>
            )}
            <p className="text-xs text-gray-400">순서: {banner.sort_order}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(banner)}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              수정
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200"
            >
              삭제
            </button>
          </div>
        </div>

        <div className="mb-4">
          <button
            onClick={() => setShowProductSelector(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + 상품 추가
          </button>
        </div>

        <div>
          <h3 className="font-medium mb-3">
            포함된 상품 ({bannerProducts.length}개)
          </h3>
          {loading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : bannerProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              상품이 없습니다
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {bannerProducts.map((bp) => {
                const product = Array.isArray(bp.products) ? bp.products[0] : bp.products
                return product ? (
                  <div
                    key={bp.id}
                    className="flex flex-col gap-2 p-3 border rounded-lg"
                  >
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => handleRemoveProduct(bp.product_id)}
                        className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                      >
                        제거
                      </button>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm line-clamp-2">{product.name}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {product.brand && `${product.brand} · `}
                        {formatPrice(product.price)}원
                      </p>
                    </div>
                  </div>
                ) : null
              })}
            </div>
          )}
        </div>
      </div>

      {/* 상품 선택 모달 */}
      {showProductSelector && (
        <ProductSelectorModal
          bannerId={banner.id}
          existingProductIds={bannerProducts.map(bp => bp.product_id)}
          initialProducts={initialProducts}
          onClose={() => setShowProductSelector(false)}
          onSuccess={handleProductsAdded}
        />
      )}
    </>
  )
}

