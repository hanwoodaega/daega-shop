'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { convertLocalToISO, convertUTCToLocal } from '@/lib/time-utils'

interface TimeDeal {
  id: number
  title: string
  description?: string | null
  start_at: string
  end_at: string
  created_at: string
  updated_at: string
  products?: TimeDealProduct[]
}

interface TimeDealProduct {
  id: number
  product_id: string
  discount_percent: number
  sort_order: number
  products?: {
    id: string
    name: string
    price: number
    image_url: string
    brand: string | null
    category: string
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

export default function TimeDealsPage() {
  const router = useRouter()
  const [timeDeals, setTimeDeals] = useState<TimeDeal[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTimeDeal, setSelectedTimeDeal] = useState<TimeDeal | null>(null)
  const [timeDealProducts, setTimeDealProducts] = useState<TimeDealProduct[]>([])
  const [showProductSelector, setShowProductSelector] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<Map<string, { discount_percent: number; sort_order: number }>>(new Map())
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTimeDeal, setEditingTimeDeal] = useState<TimeDeal | null>(null)
  const [promotedProductIds, setPromotedProductIds] = useState<Set<string>>(new Set())

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_at: '',
    end_at: '',
  })

  useEffect(() => {
    fetchTimeDeals()
    fetchProducts()
    fetchPromotedProducts()
  }, [])

  const fetchPromotedProducts = async () => {
    try {
      // 모든 프로모션 조회
      const res = await fetch('/api/admin/promotions')
      const data = await res.json()
      
      if (res.ok && data.promotions) {
        const productIds = new Set<string>()
        
        // 각 프로모션의 상품 조회
        for (const promotion of data.promotions) {
          try {
            const detailRes = await fetch(`/api/admin/promotions/${promotion.id}`)
            const detailData = await detailRes.json()
            if (detailRes.ok && detailData.products) {
              detailData.products.forEach((pp: any) => {
                productIds.add(pp.product_id)
              })
            }
          } catch (error) {
            console.error(`프로모션 ${promotion.id} 상품 조회 실패:`, error)
          }
        }
        
        setPromotedProductIds(productIds)
      }
    } catch (error) {
      console.error('프로모션 상품 조회 실패:', error)
    }
  }

  useEffect(() => {
    if (selectedTimeDeal) {
      fetchTimeDealProducts(selectedTimeDeal.id)
    }
  }, [selectedTimeDeal])

  const fetchTimeDeals = async () => {
    try {
      const res = await fetch('/api/admin/collections/timedeal')
      const data = await res.json()
      if (res.ok) {
        setTimeDeals(data.timedeals || [])
      }
    } catch (error) {
      console.error('타임딜 조회 실패:', error)
      toast.error('타임딜 조회에 실패했습니다')
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

  const fetchTimeDealProducts = async (timeDealId: number) => {
    try {
      const res = await fetch(`/api/admin/collections/timedeal`)
      const data = await res.json()
      if (res.ok) {
        const timeDeal = data.timedeals?.find((td: TimeDeal) => td.id === timeDealId)
        if (timeDeal) {
          setTimeDealProducts(timeDeal.products || [])
        }
      }
    } catch (error) {
      console.error('타임딜 상품 조회 실패:', error)
    }
  }

  const handleCreate = async () => {
    if (!formData.title || !formData.end_at) {
      toast.error('제목과 종료 시간은 필수입니다')
      return
    }

    // 시작 시간이 없으면 현재 로컬 시간으로 설정
    const now = new Date()
    // datetime-local 형식으로 변환 (YYYY-MM-DDTHH:mm)
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const defaultStartAt = `${year}-${month}-${day}T${hours}:${minutes}`
    const startAt = formData.start_at || defaultStartAt

    try {
      const res = await fetch('/api/admin/collections/timedeal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          start_at: convertLocalToISO(startAt),
          end_at: convertLocalToISO(formData.end_at),
          products: [],
        }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('타임딜이 생성되었습니다')
        setShowCreateModal(false)
        resetForm()
        fetchTimeDeals()
      } else {
        toast.error(data.error || '타임딜 생성에 실패했습니다')
      }
    } catch (error) {
      console.error('타임딜 생성 실패:', error)
      toast.error('타임딜 생성에 실패했습니다')
    }
  }

  const handleUpdate = async () => {
    if (!editingTimeDeal) return

    if (!formData.title || !formData.end_at) {
      toast.error('제목과 종료 시간은 필수입니다')
      return
    }

    // 시작 시간이 없으면 현재 로컬 시간으로 설정
    const now = new Date()
    // datetime-local 형식으로 변환 (YYYY-MM-DDTHH:mm)
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const defaultStartAt = `${year}-${month}-${day}T${hours}:${minutes}`
    const startAt = formData.start_at || defaultStartAt

    try {
      const res = await fetch('/api/admin/collections/timedeal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTimeDeal.id,
          title: formData.title,
          description: formData.description || null,
          start_at: convertLocalToISO(startAt),
          end_at: convertLocalToISO(formData.end_at),
        }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('타임딜이 수정되었습니다')
        setEditingTimeDeal(null)
        resetForm()
        fetchTimeDeals()
        if (selectedTimeDeal?.id === editingTimeDeal.id) {
          const updated = timeDeals.find(td => td.id === editingTimeDeal.id)
          if (updated) setSelectedTimeDeal(updated)
        }
      } else {
        toast.error(data.error || '타임딜 수정에 실패했습니다')
      }
    } catch (error) {
      console.error('타임딜 수정 실패:', error)
      toast.error('타임딜 수정에 실패했습니다')
    }
  }

  const handleDelete = async (timeDealId: number) => {
    if (!confirm('이 타임딜을 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/admin/collections/timedeal?id=${timeDealId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        toast.success('타임딜이 삭제되었습니다')
        if (selectedTimeDeal?.id === timeDealId) {
          setSelectedTimeDeal(null)
        }
        fetchTimeDeals()
      } else {
        const data = await res.json()
        toast.error(data.error || '타임딜 삭제에 실패했습니다')
      }
    } catch (error) {
      console.error('타임딜 삭제 실패:', error)
      toast.error('타임딜 삭제에 실패했습니다')
    }
  }

  const handleAddProducts = async () => {
    if (!selectedTimeDeal || selectedProducts.size === 0) {
      toast.error('상품을 선택하세요')
      return
    }

    try {
      // 기존 상품들
      const existingProducts = timeDealProducts.map((tp) => ({
        product_id: tp.product_id,
        discount_percent: tp.discount_percent,
        sort_order: tp.sort_order,
      }))

      // 새로 선택한 상품들
      const newProducts = Array.from(selectedProducts.entries()).map(([product_id, data], index) => ({
        product_id,
        discount_percent: data.discount_percent,
        sort_order: existingProducts.length + index, // 기존 상품 뒤에 추가
      }))

      // 기존 상품과 새 상품 합치기
      const allProducts = [...existingProducts, ...newProducts]

      const res = await fetch('/api/admin/collections/timedeal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedTimeDeal.id,
          products: allProducts,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('상품이 추가되었습니다')
        setShowProductSelector(false)
        setSelectedProducts(new Map())
        fetchTimeDealProducts(selectedTimeDeal.id)
        fetchTimeDeals()
      } else {
        toast.error(data.error || '상품 추가에 실패했습니다')
      }
    } catch (error) {
      console.error('상품 추가 실패:', error)
      toast.error('상품 추가에 실패했습니다')
    }
  }

  const handleRemoveProduct = async (productId: string) => {
    if (!selectedTimeDeal) return
    if (!confirm('이 상품을 타임딜에서 제거하시겠습니까?')) return

    try {
      // 기존 상품 목록에서 해당 상품 제거
      const updatedProducts = timeDealProducts
        .filter(tp => tp.product_id !== productId)
        .map((tp, index) => ({
          product_id: tp.product_id,
          discount_percent: tp.discount_percent,
          sort_order: index,
        }))

      const res = await fetch('/api/admin/collections/timedeal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedTimeDeal.id,
          products: updatedProducts,
        }),
      })

      if (res.ok) {
        toast.success('상품이 제거되었습니다')
        fetchTimeDealProducts(selectedTimeDeal.id)
        fetchTimeDeals()
      } else {
        const data = await res.json()
        toast.error(data.error || '상품 제거에 실패했습니다')
      }
    } catch (error) {
      console.error('상품 제거 실패:', error)
      toast.error('상품 제거에 실패했습니다')
    }
  }

  const handleUpdateProductDiscount = async (productId: string, discountPercent: number, sortOrder: number) => {
    if (!selectedTimeDeal) return

    try {
      const updatedProducts = timeDealProducts.map(tp => {
        if (tp.product_id === productId) {
          return {
            product_id: tp.product_id,
            discount_percent: discountPercent,
            sort_order: sortOrder,
          }
        }
        return {
          product_id: tp.product_id,
          discount_percent: tp.discount_percent,
          sort_order: tp.sort_order,
        }
      })

      const res = await fetch('/api/admin/collections/timedeal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedTimeDeal.id,
          products: updatedProducts,
        }),
      })

      if (res.ok) {
        toast.success('상품 정보가 업데이트되었습니다')
        fetchTimeDealProducts(selectedTimeDeal.id)
        fetchTimeDeals()
      } else {
        const data = await res.json()
        toast.error(data.error || '상품 정보 업데이트에 실패했습니다')
      }
    } catch (error) {
      console.error('상품 정보 업데이트 실패:', error)
      toast.error('상품 정보 업데이트에 실패했습니다')
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      start_at: '',
      end_at: '',
    })
  }

  const openEditModal = (timeDeal: TimeDeal) => {
    setEditingTimeDeal(timeDeal)
    setFormData({
      title: timeDeal.title,
      description: timeDeal.description || '',
      start_at: convertUTCToLocal(timeDeal.start_at),
      end_at: convertUTCToLocal(timeDeal.end_at),
    })
    setShowCreateModal(true)
  }

  const toggleProduct = (productId: string) => {
    setSelectedProducts((prev) => {
      const newMap = new Map(prev)
      if (newMap.has(productId)) {
        newMap.delete(productId)
      } else {
        newMap.set(productId, { discount_percent: 0, sort_order: newMap.size })
      }
      return newMap
    })
  }

  const updateProductDiscount = (productId: string, discountPercent: number) => {
    setSelectedProducts((prev) => {
      const newMap = new Map(prev)
      const existing = newMap.get(productId)
      if (existing) {
        newMap.set(productId, { ...existing, discount_percent: discountPercent })
      }
      return newMap
    })
  }

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // 이미 타임딜에 포함된 상품 ID
  const existingProductIds = new Set(timeDealProducts.map((tp) => tp.product_id))

  // 활성 타임딜 확인
  const now = new Date()
  const isActive = (timeDeal: TimeDeal) => {
    const start = new Date(timeDeal.start_at)
    const end = new Date(timeDeal.end_at)
    return now >= start && now <= end
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
            <h1 className="text-2xl font-bold text-gray-900">타임딜 관리</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                resetForm()
                setEditingTimeDeal(null)
                setShowCreateModal(true)
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              새 타임딜
            </button>
            <button
              onClick={() => router.push('/admin')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              관리자 홈
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 타임딜 목록 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="text-lg font-bold mb-4">타임딜 목록</h2>
              {loading ? (
                <div className="text-center py-8">로딩 중...</div>
              ) : timeDeals.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  타임딜이 없습니다
                </div>
              ) : (
                <div className="space-y-2">
                  {timeDeals.map((timeDeal) => (
                    <div
                      key={timeDeal.id}
                      onClick={() => setSelectedTimeDeal(timeDeal)}
                      className={`p-3 rounded-lg cursor-pointer transition ${
                        selectedTimeDeal?.id === timeDeal.id
                          ? 'bg-blue-100 border-2 border-blue-500'
                          : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{timeDeal.title}</h3>
                            {isActive(timeDeal) && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded">
                                진행중
                              </span>
                            )}
                          </div>
                          {timeDeal.description && (
                            <p className="text-xs text-gray-500 mt-1">{timeDeal.description}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(timeDeal.start_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} ~ {new Date(timeDeal.end_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 타임딜 상세 */}
          <div className="lg:col-span-2">
            {selectedTimeDeal ? (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold mb-1">{selectedTimeDeal.title}</h2>
                    {selectedTimeDeal.description && (
                      <p className="text-sm text-gray-500 mb-1">{selectedTimeDeal.description}</p>
                    )}
                    <p className="text-xs text-gray-400">
                      {new Date(selectedTimeDeal.start_at).toLocaleString('ko-KR')} ~ {new Date(selectedTimeDeal.end_at).toLocaleString('ko-KR')}
                    </p>
                    {isActive(selectedTimeDeal) && (
                      <span className="inline-block mt-2 px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded">
                        진행중
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(selectedTimeDeal)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(selectedTimeDeal.id)}
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
                    포함된 상품 ({timeDealProducts.length}개)
                  </h3>
                  {timeDealProducts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      상품이 없습니다
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {timeDealProducts
                        .sort((a, b) => a.sort_order - b.sort_order)
                        .map((tp) => {
                          const product = Array.isArray(tp.products) ? tp.products[0] : tp.products
                          return product ? (
                            <div
                              key={tp.id}
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <div className="flex-1">
                                <p className="font-medium">{product.name}</p>
                                <p className="text-sm text-gray-600">
                                  {product.category} • {product.price.toLocaleString()}원
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <label className="text-xs text-gray-600">할인율:</label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={tp.discount_percent}
                                    onChange={(e) => {
                                      const newPercent = parseInt(e.target.value) || 0
                                      handleUpdateProductDiscount(product.id, newPercent, tp.sort_order)
                                    }}
                                    className="w-16 px-2 py-1 text-sm border rounded"
                                  />
                                  <span className="text-xs text-gray-600">%</span>
                                </div>
                                <button
                                  onClick={() => handleRemoveProduct(product.id)}
                                  className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                                >
                                  제거
                                </button>
                              </div>
                            </div>
                          ) : null
                        })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <p className="text-gray-500">타임딜을 선택하세요</p>
              </div>
            )}
          </div>
        </div>

        {/* 생성/수정 모달 */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl w-full max-w-md">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h2 className="text-xl font-bold">
                  {editingTimeDeal ? '타임딜 수정' : '새 타임딜 만들기'}
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
                  <label className="block text-sm font-medium mb-2">
                    제목 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="예: 오늘만 특가!"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">설명</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="타임딜 설명 (선택사항)"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    시작 시간 <span className="text-gray-500 text-xs">(비워두면 현재 시간으로 설정)</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.start_at}
                    onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="비워두면 현재 시간으로 설정"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    종료 시간 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.end_at}
                    onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={editingTimeDeal ? handleUpdate : handleCreate}
                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    {editingTimeDeal ? '수정' : '생성'}
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
        {showProductSelector && selectedTimeDeal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
              <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
                <h3 className="text-lg font-bold">상품 선택</h3>
                <button
                  onClick={() => {
                    setShowProductSelector(false)
                    setSelectedProducts(new Map())
                  }}
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
                    const isSelected = selectedProducts.has(product.id)
                    const isInTimeDeal = existingProductIds.has(product.id)
                    const isPromoted = promotedProductIds.has(product.id)
                    const isDisabled = isInTimeDeal || isPromoted
                    const selectedData = selectedProducts.get(product.id)
                    
                    return (
                      <div
                        key={product.id}
                        onClick={() => {
                          if (!isDisabled) {
                            toggleProduct(product.id)
                          }
                        }}
                        className={`p-3 rounded-lg transition ${
                          isDisabled
                            ? 'bg-gray-100 border-2 border-gray-300 cursor-not-allowed opacity-60'
                            : isSelected
                            ? 'bg-blue-100 border-2 border-blue-500'
                            : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-3">
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
                              {isInTimeDeal && (
                                <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs font-bold rounded">
                                  이미 추가됨
                                </span>
                              )}
                              {isPromoted && !isInTimeDeal && (
                                <span className="px-2 py-0.5 bg-orange-200 text-orange-700 text-xs font-bold rounded">
                                  프로모션 상품
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {product.category} • {product.price.toLocaleString()}원
                            </p>
                            {isSelected && (
                              <div className="mt-2 flex items-center gap-2">
                                <label className="text-xs text-gray-600">할인율:</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={selectedData?.discount_percent || 0}
                                  onChange={(e) => {
                                    e.stopPropagation()
                                    updateProductDiscount(product.id, parseInt(e.target.value) || 0)
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-20 px-2 py-1 text-sm border rounded"
                                />
                                <span className="text-xs text-gray-600">%</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="px-6 py-4 border-t flex justify-between items-center bg-gray-50">
                <span className="text-sm text-gray-600">
                  {selectedProducts.size}개 선택됨
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowProductSelector(false)
                      setSelectedProducts(new Map())
                    }}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleAddProducts}
                    disabled={selectedProducts.size === 0}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    추가
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

