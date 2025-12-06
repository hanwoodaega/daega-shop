'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { formatPrice } from '@/lib/utils'

interface RecommendationCategory {
  id: string
  name: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface RecommendationProduct {
  id: string
  product_id: string
  sort_order: number
  products: {
    id: string
    name: string
    price: number
    brand: string | null
    category: string
  }
}

interface Product {
  id: string
  name: string
  price: number
  brand: string | null
  category: string
}

export default function RecommendationsPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<RecommendationCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<RecommendationCategory | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<RecommendationCategory | null>(null)
  const [categoryProducts, setCategoryProducts] = useState<RecommendationProduct[]>([])
  const [showProductSelector, setShowProductSelector] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<Array<{ product_id: string; sort_order: number }>>([])
  const [products, setProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    sort_order: 0,
    is_active: true,
  })

  useEffect(() => {
    fetchCategories()
    fetchProducts()
  }, [])

  useEffect(() => {
    if (selectedCategory) {
      fetchCategoryProducts(selectedCategory.id)
    }
  }, [selectedCategory])

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/admin/recommendations')
      const data = await res.json()
      if (res.ok) {
        setCategories(data.categories || [])
      } else {
        toast.error('추천 카테고리 조회 실패')
      }
    } catch (error) {
      console.error('추천 카테고리 조회 실패:', error)
      toast.error('추천 카테고리 조회에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      sort_order: 0,
      is_active: true,
    })
    setEditingCategory(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name) {
      toast.error('카테고리 이름을 입력하세요')
      return
    }

    try {
      if (editingCategory) {
        const res = await fetch(`/api/admin/recommendations/${editingCategory.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        const data = await res.json()
        if (res.ok) {
          toast.success('카테고리가 수정되었습니다')
          setShowCreateModal(false)
          resetForm()
          fetchCategories()
        } else {
          toast.error(data.error || '카테고리 수정 실패')
        }
      } else {
        const res = await fetch('/api/admin/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        const data = await res.json()
        if (res.ok) {
          toast.success('카테고리가 생성되었습니다')
          setShowCreateModal(false)
          resetForm()
          fetchCategories()
        } else {
          toast.error(data.error || '카테고리 생성 실패')
        }
      }
    } catch (error) {
      console.error('카테고리 저장 실패:', error)
      toast.error('카테고리 저장에 실패했습니다')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('카테고리를 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/admin/recommendations/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success('카테고리가 삭제되었습니다')
        fetchCategories()
        if (selectedCategory?.id === id) {
          setSelectedCategory(null)
        }
      } else {
        const data = await res.json()
        toast.error(data.error || '카테고리 삭제 실패')
      }
    } catch (error) {
      console.error('카테고리 삭제 실패:', error)
      toast.error('카테고리 삭제에 실패했습니다')
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

  const fetchCategoryProducts = async (categoryId: string) => {
    try {
      const res = await fetch(`/api/admin/recommendations/${categoryId}/products`)
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      const data = await res.json()
      setCategoryProducts(data.products || [])
    } catch (error) {
      console.error('추천 상품 조회 실패:', error)
      setCategoryProducts([])
    }
  }

  const handleAddProducts = async () => {
    if (!selectedCategory || selectedProducts.length === 0) {
      toast.error('상품을 선택하세요')
      return
    }

    try {
      const res = await fetch(`/api/admin/recommendations/${selectedCategory.id}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: selectedProducts }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('상품이 추가되었습니다')
        setShowProductSelector(false)
        setSelectedProducts([])
        fetchCategoryProducts(selectedCategory.id)
      } else {
        toast.error(data.error || '상품 추가에 실패했습니다')
      }
    } catch (error) {
      console.error('상품 추가 실패:', error)
      toast.error('상품 추가에 실패했습니다')
    }
  }

  const handleRemoveProduct = async (productId: string) => {
    if (!selectedCategory) return
    if (!confirm('이 상품을 카테고리에서 제거하시겠습니까?')) return

    try {
      const res = await fetch(
        `/api/admin/recommendations/${selectedCategory.id}/products?product_id=${productId}`,
        { method: 'DELETE' }
      )

      if (res.ok) {
        toast.success('상품이 제거되었습니다')
        fetchCategoryProducts(selectedCategory.id)
      } else {
        const data = await res.json()
        toast.error(data.error || '상품 제거에 실패했습니다')
      }
    } catch (error) {
      console.error('상품 제거 실패:', error)
      toast.error('상품 제거에 실패했습니다')
    }
  }

  const openEditModal = (category: RecommendationCategory) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      sort_order: category.sort_order,
      is_active: category.is_active,
    })
    setShowCreateModal(true)
  }

  const filteredProducts = products.filter((p) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      p.name.toLowerCase().includes(query) ||
      (p.brand && p.brand.toLowerCase().includes(query)) ||
      p.category.toLowerCase().includes(query)
    )
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">맞춤별 추천 관리</h1>
            <p className="text-gray-600 mt-1">메인페이지 맞춤별 추천 카테고리와 상품을 관리하세요</p>
          </div>
          <button
            onClick={() => {
              resetForm()
              setShowCreateModal(true)
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + 카테고리 추가
          </button>
        </div>

        {/* 2-column 레이아웃 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 왼쪽: 카테고리 목록 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="font-semibold mb-4">카테고리 목록</h2>
              <div className="space-y-2">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    onClick={() => setSelectedCategory(category)}
                    className={`p-3 rounded-lg cursor-pointer transition ${
                      selectedCategory?.id === category.id
                        ? 'bg-blue-50 border-2 border-blue-500'
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{category.name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {category.is_active ? '활성' : '비활성'} · 순서: {category.sort_order}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 오른쪽: 카테고리 상세 */}
          <div className="lg:col-span-2">
            {selectedCategory ? (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold">{selectedCategory.name}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {selectedCategory.is_active ? '활성' : '비활성'} · 순서: {selectedCategory.sort_order}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(selectedCategory)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(selectedCategory.id)}
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
                    포함된 상품 ({categoryProducts.length}개)
                  </h3>
                  {categoryProducts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      상품이 없습니다
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {categoryProducts.map((rp) => {
                        const product = Array.isArray(rp.products) ? rp.products[0] : rp.products
                        return product ? (
                          <div
                            key={rp.id}
                            className="flex flex-col gap-2 p-3 border rounded-lg"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <label className="text-xs text-gray-600">순서:</label>
                                <input
                                  type="number"
                                  value={rp.sort_order || 0}
                                  onChange={async (e) => {
                                    const newOrder = parseInt(e.target.value) || 0
                                    try {
                                      const res = await fetch(
                                        `/api/admin/recommendations/${selectedCategory?.id}/products/${rp.product_id}`,
                                        {
                                          method: 'PATCH',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ sort_order: newOrder }),
                                        }
                                      )
                                      if (res.ok) {
                                        fetchCategoryProducts(selectedCategory!.id)
                                        toast.success('순서가 변경되었습니다')
                                      } else {
                                        const data = await res.json()
                                        toast.error(data.error || '순서 변경 실패')
                                      }
                                    } catch (error) {
                                      console.error('순서 변경 실패:', error)
                                      toast.error('순서 변경에 실패했습니다')
                                    }
                                  }}
                                  className="w-16 px-2 py-1 text-xs border rounded"
                                />
                              </div>
                              <button
                                onClick={() => handleRemoveProduct(rp.product_id)}
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
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <p className="text-gray-500">카테고리를 선택하세요</p>
              </div>
            )}
          </div>
        </div>

        {/* 카테고리 생성/수정 모달 */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl w-full max-w-md">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h2 className="text-xl font-bold">
                  {editingCategory ? '카테고리 수정' : '카테고리 추가'}
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

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">카테고리 이름 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">순서</label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="is_active" className="text-sm">
                    활성화
                  </label>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingCategory ? '수정' : '생성'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false)
                      resetForm()
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    취소
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 상품 선택 모달 */}
        {showProductSelector && selectedCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white">
                <h2 className="text-xl font-bold">상품 선택</h2>
                <button
                  onClick={() => {
                    setShowProductSelector(false)
                    setSelectedProducts([])
                    setSearchQuery('')
                  }}
                  className="text-2xl text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="p-6">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="상품 검색..."
                  className="w-full px-4 py-2 border rounded-lg mb-4"
                />

                <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                  {filteredProducts
                    .filter((p) => !categoryProducts.some((rp) => rp.product_id === p.id))
                    .map((product) => {
                      const isSelected = selectedProducts.some((sp) => sp.product_id === product.id)
                      const selectedItem = selectedProducts.find((sp) => sp.product_id === product.id)
                      return (
                        <div
                          key={product.id}
                          className={`p-3 border rounded-lg transition ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedProducts([...selectedProducts, { product_id: product.id, sort_order: 0 }])
                                } else {
                                  setSelectedProducts(selectedProducts.filter((sp) => sp.product_id !== product.id))
                                }
                              }}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <p className="font-medium text-sm line-clamp-2">{product.name}</p>
                              <p className="text-xs text-gray-600 mt-1">
                                {product.brand && `${product.brand} · `}
                                {formatPrice(product.price)}원
                              </p>
                              {isSelected && (
                                <div className="mt-2">
                                  <label className="block text-xs text-gray-600 mb-1">순서</label>
                                  <input
                                    type="number"
                                    value={selectedItem?.sort_order || 0}
                                    onChange={(e) => {
                                      const newOrder = parseInt(e.target.value) || 0
                                      setSelectedProducts(
                                        selectedProducts.map((sp) =>
                                          sp.product_id === product.id
                                            ? { ...sp, sort_order: newOrder }
                                            : sp
                                        )
                                      )
                                    }}
                                    className="w-20 px-2 py-1 text-xs border rounded"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <button
                    onClick={handleAddProducts}
                    disabled={selectedProducts.length === 0}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    추가 ({selectedProducts.length})
                  </button>
                  <button
                    onClick={() => {
                      setShowProductSelector(false)
                      setSelectedProducts([])
                      setSearchQuery('')
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    취소
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

