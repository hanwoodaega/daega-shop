'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface Collection {
  id: string
  type: 'timedeal' | 'best' | 'sale' | 'no9'
  title?: string | null
  start_at?: string | null
  end_at?: string | null
  created_at: string
  updated_at: string
}

interface CollectionProduct {
  id: string
  product_id: string
  priority: number
  products: {
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

export default function CollectionsPage() {
  const router = useRouter()
  const [collections, setCollections] = useState<Collection[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [promotedProductIds, setPromotedProductIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
  const [collectionProducts, setCollectionProducts] = useState<CollectionProduct[]>([])
  const [showProductSelector, setShowProductSelector] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null)

  const [formData, setFormData] = useState({
    type: 'best' as 'timedeal' | 'best' | 'sale' | 'no9',
    title: '',
    start_at: '',
    end_at: '',
  })

  useEffect(() => {
    fetchCollections()
    fetchProducts()
    fetchPromotedProducts()
  }, [])

  useEffect(() => {
    if (selectedCollection) {
      fetchCollectionProducts(selectedCollection.id)
    }
  }, [selectedCollection])

  const fetchCollections = async () => {
    try {
      const res = await fetch('/api/admin/collections')
      const data = await res.json()
      if (res.ok) {
        setCollections(data.collections || [])
      }
    } catch (error) {
      console.error('컬렉션 조회 실패:', error)
      toast.error('컬렉션 조회에 실패했습니다')
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
              detailData.products.forEach((pp: any) => {
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

  const fetchCollectionProducts = async (collectionId: string) => {
    try {
      const res = await fetch(`/api/admin/collections/${collectionId}`)
      const data = await res.json()
      if (res.ok) {
        setCollectionProducts(data.products || [])
      }
    } catch (error) {
      console.error('컬렉션 상품 조회 실패:', error)
    }
  }

  const handleCreate = async () => {
    if (!formData.type) {
      toast.error('타입을 선택하세요')
      return
    }

    try {
      const res = await fetch('/api/admin/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: formData.type,
          title: formData.title || null,
          start_at: formData.start_at || null,
          end_at: formData.end_at || null,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('컬렉션이 생성되었습니다')
        setShowCreateModal(false)
        resetForm()
        fetchCollections()
      } else {
        toast.error(data.error || '컬렉션 생성에 실패했습니다')
      }
    } catch (error) {
      console.error('컬렉션 생성 실패:', error)
      toast.error('컬렉션 생성에 실패했습니다')
    }
  }

  const handleUpdate = async () => {
    if (!editingCollection) return

    if (!formData.type) {
      toast.error('타입을 선택하세요')
      return
    }

    try {
      const res = await fetch(`/api/admin/collections/${editingCollection.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: formData.type,
          title: formData.title || null,
          start_at: formData.start_at || null,
          end_at: formData.end_at || null,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('컬렉션이 수정되었습니다')
        setEditingCollection(null)
        resetForm()
        fetchCollections()
        if (selectedCollection?.id === editingCollection.id) {
          fetchCollections()
          const updated = collections.find(c => c.id === editingCollection.id)
          if (updated) setSelectedCollection(updated)
        }
      } else {
        toast.error(data.error || '컬렉션 수정에 실패했습니다')
      }
    } catch (error) {
      console.error('컬렉션 수정 실패:', error)
      toast.error('컬렉션 수정에 실패했습니다')
    }
  }

  const handleDelete = async (collectionId: string) => {
    if (!confirm('이 컬렉션을 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/admin/collections/${collectionId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        toast.success('컬렉션이 삭제되었습니다')
        if (selectedCollection?.id === collectionId) {
          setSelectedCollection(null)
        }
        fetchCollections()
      } else {
        const data = await res.json()
        toast.error(data.error || '컬렉션 삭제에 실패했습니다')
      }
    } catch (error) {
      console.error('컬렉션 삭제 실패:', error)
      toast.error('컬렉션 삭제에 실패했습니다')
    }
  }

  const handleAddProducts = async () => {
    if (!selectedCollection || selectedProducts.length === 0) {
      toast.error('상품을 선택하세요')
      return
    }

    try {
      const res = await fetch(`/api/admin/collections/${selectedCollection.id}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_ids: selectedProducts }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('상품이 추가되었습니다')
        setShowProductSelector(false)
        setSelectedProducts([])
        fetchCollectionProducts(selectedCollection.id)
      } else {
        toast.error(data.error || '상품 추가에 실패했습니다')
      }
    } catch (error) {
      console.error('상품 추가 실패:', error)
      toast.error('상품 추가에 실패했습니다')
    }
  }

  const handleRemoveProduct = async (productId: string) => {
    if (!selectedCollection) return
    if (!confirm('이 상품을 컬렉션에서 제거하시겠습니까?')) return

    try {
      const res = await fetch(
        `/api/admin/collections/${selectedCollection.id}/products?product_id=${productId}`,
        { method: 'DELETE' }
      )

      if (res.ok) {
        toast.success('상품이 제거되었습니다')
        fetchCollectionProducts(selectedCollection.id)
      } else {
        const data = await res.json()
        toast.error(data.error || '상품 제거에 실패했습니다')
      }
    } catch (error) {
      console.error('상품 제거 실패:', error)
      toast.error('상품 제거에 실패했습니다')
    }
  }


  const resetForm = () => {
    setFormData({
      type: 'best',
      title: '',
      start_at: '',
      end_at: '',
    })
  }

  const openEditModal = (collection: Collection) => {
    setEditingCollection(collection)
    setFormData({
      type: collection.type,
      title: collection.title || '',
      start_at: collection.start_at ? new Date(collection.start_at).toISOString().slice(0, 16) : '',
      end_at: collection.end_at ? new Date(collection.end_at).toISOString().slice(0, 16) : '',
    })
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

  // 이미 컬렉션에 포함된 상품 ID
  const existingProductIds = new Set(collectionProducts.map((cp) => cp.product_id))

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
            <h1 className="text-2xl font-bold text-gray-900">컬렉션 관리</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                resetForm()
                setEditingCollection(null)
                setShowCreateModal(true)
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              새 컬렉션
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
          {/* 컬렉션 목록 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="text-lg font-bold mb-4">컬렉션 목록</h2>
              {loading ? (
                <div className="text-center py-8">로딩 중...</div>
              ) : collections.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  컬렉션이 없습니다
                </div>
              ) : (
                <div className="space-y-2">
                  {collections.map((collection) => (
                    <div
                      key={collection.id}
                      onClick={() => setSelectedCollection(collection)}
                      className={`p-3 rounded-lg cursor-pointer transition ${
                        selectedCollection?.id === collection.id
                          ? 'bg-blue-100 border-2 border-blue-500'
                          : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium">
                            {collection.type === 'timedeal' ? '타임딜' :
                             collection.type === 'best' ? '베스트' :
                             collection.type === 'sale' ? '특가' :
                             collection.type === 'no9' ? '한우대가 NO.9' : collection.type}
                          </h3>
                          {collection.title && (
                            <p className="text-xs text-gray-500">{collection.title}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 컬렉션 상세 */}
          <div className="lg:col-span-2">
            {selectedCollection ? (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold">
                      {selectedCollection.type === 'timedeal' ? '타임딜' :
                       selectedCollection.type === 'best' ? '베스트' :
                       selectedCollection.type === 'sale' ? '특가' :
                       selectedCollection.type === 'no9' ? '한우대가 NO.9' : selectedCollection.type}
                    </h2>
                    {selectedCollection.title && (
                      <p className="text-sm text-gray-500">{selectedCollection.title}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(selectedCollection)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(selectedCollection.id)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
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
                    포함된 상품 ({collectionProducts.length}개)
                  </h3>
                  {collectionProducts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      상품이 없습니다
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {collectionProducts.map((cp) => {
                        const product = Array.isArray(cp.products) ? cp.products[0] : cp.products
                        return product ? (
                          <div
                            key={cp.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex-1">
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-gray-600">
                                {product.category} • {product.price.toLocaleString()}원
                              </p>
                            </div>
                            <button
                              onClick={() => handleRemoveProduct(product.id)}
                              className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                            >
                              제거
                            </button>
                          </div>
                        ) : null
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <p className="text-gray-500">컬렉션을 선택하세요</p>
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
                  {editingCollection ? '컬렉션 수정' : '새 컬렉션 만들기'}
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
                  <label className="block text-sm font-medium mb-2">타입 *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg"
                    disabled={!!editingCollection}
                  >
                    <option value="best">베스트</option>
                    <option value="sale">특가</option>
                    <option value="no9">한우대가 NO.9</option>
                    <option value="timedeal">타임딜</option>
                  </select>
                  {editingCollection && (
                    <p className="text-xs text-gray-500 mt-1">타입은 수정할 수 없습니다</p>
                  )}
                </div>

                {formData.type === 'timedeal' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">제목</label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="예: 오늘만 특가!"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">시작 시간</label>
                      <input
                        type="datetime-local"
                        value={formData.start_at}
                        onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">종료 시간</label>
                      <input
                        type="datetime-local"
                        value={formData.end_at}
                        onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={editingCollection ? handleUpdate : handleCreate}
                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    {editingCollection ? '수정' : '생성'}
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
        {showProductSelector && selectedCollection && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
              <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
                <h3 className="text-lg font-bold">상품 선택</h3>
                <button
                  onClick={() => {
                    setShowProductSelector(false)
                    setSelectedProducts([])
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
                    const isSelected = selectedProducts.includes(product.id)
                    const isInCollection = existingProductIds.has(product.id)
                    const isPromoted = promotedProductIds.has(product.id)
                    
                    return (
                      <div
                        key={product.id}
                        onClick={() => {
                          if (!isInCollection) {
                            toggleProduct(product.id)
                          }
                        }}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
                          isInCollection
                            ? 'bg-gray-100 border-2 border-gray-300 cursor-not-allowed opacity-60'
                            : isSelected
                            ? 'bg-blue-100 border-2 border-blue-500'
                            : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isInCollection}
                          onChange={() => {}}
                          className="w-5 h-5"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium">{product.name}</p>
                            {isInCollection && (
                              <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs font-bold rounded">
                                이미 추가됨
                              </span>
                            )}
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
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowProductSelector(false)
                      setSelectedProducts([])
                    }}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleAddProducts}
                    disabled={selectedProducts.length === 0}
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

