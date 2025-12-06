'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface Promotion {
  id: string
  title: string
  type: 'bogo' | 'percent'
  buy_qty: number | null
  discount_percent: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

interface PromotionProduct {
  id: string
  product_id: string
  group_id: string | null
  priority: number
  products: {
    id: string
    name: string
    price: number
    image_url: string
    brand: string | null
  }
}

interface Product {
  id: string
  name: string
  price: number
  image_url: string
  brand: string | null
  category: string
}

export default function PromotionsPage() {
  const router = useRouter()
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [promotedProductIds, setPromotedProductIds] = useState<Set<string>>(new Set())
  const [promotionProductsMap, setPromotionProductsMap] = useState<Map<string, PromotionProduct[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showProductSelector, setShowProductSelector] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    type: 'bogo' as 'bogo' | 'percent',
    buy_qty: 1,
    discount_percent: 0,
    is_active: true,
    group_id: '',
  })

  useEffect(() => {
    fetchPromotions()
    fetchProducts()
    fetchPromotedProducts()
  }, [])

  const fetchPromotedProducts = async () => {
    try {
      // 모든 활성 프로모션의 상품 ID 수집
      const res = await fetch('/api/admin/promotions')
      const data = await res.json()
      if (res.ok && data.promotions) {
        const productIds = new Set<string>()
        
        // 각 프로모션의 상품 조회
        for (const promotion of data.promotions) {
          if (promotion.is_active) {
            const detailRes = await fetch(`/api/admin/promotions/${promotion.id}`)
            const detailData = await detailRes.json()
            if (detailRes.ok && detailData.products) {
              detailData.products.forEach((pp: PromotionProduct) => {
                productIds.add(pp.product_id)
              })
            }
          }
        }
        
        setPromotedProductIds(productIds)
      }
    } catch (error) {
      console.error('프로모션 상품 조회 실패:', error)
    }
  }

  const fetchPromotions = async () => {
    try {
      const res = await fetch('/api/admin/promotions')
      const data = await res.json()
      if (res.ok) {
        const promotionsList = data.promotions || []
        setPromotions(promotionsList)
        
        // 각 프로모션의 상품 목록 조회
        const productsMap = new Map<string, PromotionProduct[]>()
        for (const promotion of promotionsList) {
          try {
            const detailRes = await fetch(`/api/admin/promotions/${promotion.id}`)
            const detailData = await detailRes.json()
            if (detailRes.ok && detailData.products) {
              productsMap.set(promotion.id, detailData.products)
            }
          } catch (error) {
            console.error(`프로모션 ${promotion.id} 상품 조회 실패:`, error)
          }
        }
        setPromotionProductsMap(productsMap)
        
        // 프로모션 목록이 업데이트되면 프로모션된 상품도 다시 조회
        fetchPromotedProducts()
      }
    } catch (error) {
      console.error('프로모션 조회 실패:', error)
      toast.error('프로모션 조회에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/admin/products?limit=1000')
      const data = await res.json()
      if (res.ok) {
        setProducts(data.items || [])
      }
    } catch (error) {
      console.error('상품 조회 실패:', error)
    }
  }

  const handleCreate = async () => {
    if (!formData.title.trim()) {
      toast.error('제목을 입력하세요')
      return
    }

    if (formData.type === 'bogo' && !formData.buy_qty) {
      toast.error('BOGO 타입은 구매 개수를 입력하세요')
      return
    }

    if (formData.type === 'percent' && !formData.discount_percent) {
      toast.error('할인율을 입력하세요')
      return
    }

    try {
      const res = await fetch('/api/admin/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          product_ids: selectedProducts,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('프로모션이 생성되었습니다')
        setShowCreateModal(false)
        resetForm()
        await fetchPromotions()
      } else {
        toast.error(data.error || '프로모션 생성에 실패했습니다')
      }
    } catch (error) {
      console.error('프로모션 생성 실패:', error)
      toast.error('프로모션 생성에 실패했습니다')
    }
  }

  const handleUpdate = async () => {
    if (!editingPromotion) return

    if (!formData.title.trim()) {
      toast.error('제목을 입력하세요')
      return
    }

    try {
      const res = await fetch(`/api/admin/promotions/${editingPromotion.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('프로모션이 수정되었습니다')
        setEditingPromotion(null)
        resetForm()
        await fetchPromotions()
      } else {
        toast.error(data.error || '프로모션 수정에 실패했습니다')
      }
    } catch (error) {
      console.error('프로모션 수정 실패:', error)
      toast.error('프로모션 수정에 실패했습니다')
    }
  }

  const handleDelete = async (promotionId: string) => {
    if (!confirm('이 프로모션을 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/admin/promotions/${promotionId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        toast.success('프로모션이 삭제되었습니다')
        await fetchPromotions()
      } else {
        const data = await res.json()
        toast.error(data.error || '프로모션 삭제에 실패했습니다')
      }
    } catch (error) {
      console.error('프로모션 삭제 실패:', error)
      toast.error('프로모션 삭제에 실패했습니다')
    }
  }

  const handleToggleActive = async (promotion: Promotion) => {
    try {
      const res = await fetch(`/api/admin/promotions/${promotion.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...promotion,
          is_active: !promotion.is_active,
        }),
      })

      if (res.ok) {
        toast.success(`프로모션이 ${!promotion.is_active ? '활성화' : '비활성화'}되었습니다`)
        await fetchPromotions()
      }
    } catch (error) {
      console.error('프로모션 상태 변경 실패:', error)
      toast.error('프로모션 상태 변경에 실패했습니다')
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      type: 'bogo',
      buy_qty: 1,
      discount_percent: 0,
      is_active: true,
      group_id: '',
    })
    setSelectedProducts([])
  }

  const openEditModal = async (promotion: Promotion) => {
    setEditingPromotion(promotion)
    setFormData({
      title: promotion.title,
      type: promotion.type,
      buy_qty: promotion.buy_qty || 1,
      discount_percent: promotion.discount_percent || 0,
      is_active: promotion.is_active,
      group_id: '',
    })

    // 프로모션에 연결된 상품 조회
    try {
      const res = await fetch(`/api/admin/promotions/${promotion.id}`)
      const data = await res.json()
      if (res.ok && data.products) {
        setSelectedProducts(data.products.map((p: PromotionProduct) => p.product_id))
      }
    } catch (error) {
      console.error('상품 조회 실패:', error)
    }

    setShowCreateModal(true)
  }

  const toggleProduct = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    )
  }

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getPromotionTypeLabel = (promotion: Promotion) => {
    if (promotion.type === 'bogo') {
      return `${promotion.buy_qty}+1`
    } else {
      return `${promotion.discount_percent}% 할인`
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button
              onClick={() => router.push('/admin')}
              className="mr-3 p-2 hover:bg-gray-100 rounded-full transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">프로모션 관리</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                resetForm()
                setEditingPromotion(null)
                setShowCreateModal(true)
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              새 프로모션
            </button>
            <button
              onClick={() => router.push('/admin')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              관리자 홈
            </button>
          </div>
        </div>

        {/* 프로모션 목록 */}
        {loading ? (
          <div className="text-center py-12">로딩 중...</div>
        ) : promotions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500 mb-4">생성된 프로모션이 없습니다</p>
            <button
              onClick={() => {
                resetForm()
                setShowCreateModal(true)
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              첫 프로모션 만들기
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {promotions.map((promotion) => (
              <div
                key={promotion.id}
                className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold">{promotion.title}</h3>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-bold ${
                          promotion.type === 'bogo'
                            ? 'bg-pink-100 text-pink-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {getPromotionTypeLabel(promotion)}
                      </span>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          promotion.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {promotion.is_active ? '활성' : '비활성'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>생성일: {new Date(promotion.created_at).toLocaleString('ko-KR')}</p>
                    </div>
                    
                    {/* 프로모션에 포함된 상품 목록 */}
                    {promotionProductsMap.has(promotion.id) && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs font-medium text-gray-500 mb-2">
                          포함된 상품 ({promotionProductsMap.get(promotion.id)?.length || 0}개)
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {promotionProductsMap.get(promotion.id)?.map((pp) => {
                            const product = Array.isArray(pp.products) ? pp.products[0] : pp.products
                            return product ? (
                              <span
                                key={pp.id}
                                className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                              >
                                {product.name}
                              </span>
                            ) : null
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleActive(promotion)}
                      className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                    >
                      {promotion.is_active ? '비활성화' : '활성화'}
                    </button>
                    <button
                      onClick={() => openEditModal(promotion)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(promotion.id)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 생성/수정 모달 */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">
                  {editingPromotion ? '프로모션 수정' : '새 프로모션 만들기'}
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
                  <label className="block text-sm font-medium mb-2">제목 *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="예: 신상품 1+1 프로모션"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">프로모션 타입 *</label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as 'bogo' | 'percent' })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="bogo">BOGO (1+1, 2+1, 3+1)</option>
                    <option value="percent">할인율 (%)</option>
                  </select>
                </div>

                {formData.type === 'bogo' ? (
                  <div>
                    <label className="block text-sm font-medium mb-2">구매 개수 *</label>
                    <select
                      value={formData.buy_qty}
                      onChange={(e) =>
                        setFormData({ ...formData, buy_qty: parseInt(e.target.value) })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value={1}>1+1 (2개 중 1개 무료)</option>
                      <option value={2}>2+1 (3개 중 1개 무료)</option>
                      <option value={3}>3+1 (4개 중 1개 무료)</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium mb-2">할인율 (%) *</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.discount_percent}
                      onChange={(e) =>
                        setFormData({ ...formData, discount_percent: parseFloat(e.target.value) })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="예: 20"
                    />
                  </div>
                )}

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) =>
                        setFormData({ ...formData, is_active: e.target.checked })
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm">활성화</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    상품 선택 ({selectedProducts.length}개)
                  </label>
                  <button
                    onClick={() => setShowProductSelector(true)}
                    className="w-full px-3 py-2 border rounded-lg text-left hover:bg-gray-50"
                  >
                    상품 선택하기 ({selectedProducts.length}개 선택됨)
                  </button>
                  {selectedProducts.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedProducts.map((productId) => {
                        const product = products.find((p) => p.id === productId)
                        return product ? (
                          <span
                            key={productId}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-2"
                          >
                            {product.name}
                            <button
                              onClick={() => toggleProduct(productId)}
                              className="text-red-600 hover:text-blue-950"
                            >
                              ×
                            </button>
                          </span>
                        ) : null
                      })}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={editingPromotion ? handleUpdate : handleCreate}
                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    {editingPromotion ? '수정' : '생성'}
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

        {/* 상품 선택 모달 */}
        {showProductSelector && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
              <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
                <h3 className="text-lg font-bold">상품 선택</h3>
                <button
                  onClick={() => setShowProductSelector(false)}
                  className="text-white text-2xl hover:text-gray-200"
                >
                  ×
                </button>
              </div>

              <div className="p-4 border-b">
                <input
                  type="text"
                  placeholder="상품명 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {filteredProducts.map((product) => {
                    const isSelected = selectedProducts.includes(product.id)
                    const isPromoted = promotedProductIds.has(product.id)
                    const isDisabled = isPromoted && (!editingPromotion || !selectedProducts.includes(product.id))
                    
                    return (
                      <div
                        key={product.id}
                        onClick={() => {
                          if (!isDisabled) {
                            toggleProduct(product.id)
                          }
                        }}
                        className={`flex items-center gap-3 p-3 rounded-lg transition ${
                          isDisabled
                            ? 'bg-gray-100 border-2 border-gray-300 cursor-not-allowed opacity-60'
                            : isSelected
                            ? 'bg-blue-100 border-2 border-blue-500 cursor-pointer'
                            : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent cursor-pointer'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isDisabled}
                          onChange={() => {}}
                          className="w-5 h-5"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium">{product.name}</p>
                            {isPromoted && (
                              <span className="px-2 py-0.5 bg-pink-100 text-pink-700 text-xs font-bold rounded">
                                프로모션 적용중
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            {product.category} • {product.price.toLocaleString()}원
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="px-6 py-4 border-t flex justify-between items-center bg-gray-50">
                <span className="text-sm text-gray-600">
                  {selectedProducts.length}개 선택됨
                </span>
                <button
                  onClick={() => setShowProductSelector(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  완료
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
