'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function DiscountsPage() {
  const router = useRouter()
  const [discountedProducts, setDiscountedProducts] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [newDiscount, setNewDiscount] = useState({
    discount_percent: '',
    product_ids: [] as string[]
  })
  const [showProductSelector, setShowProductSelector] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingProduct, setEditingProduct] = useState<any | null>(null)
  const [editingDiscount, setEditingDiscount] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // 상품 목록 가져오기
      const res = await fetch('/api/admin/products?limit=1000')
      const data = await res.json()
      if (res.ok) {
        const allProducts = data.items || []
        setProducts(allProducts)
        
        // 할인이 설정된 상품만 필터링
        const discounted = allProducts.filter((product: any) => 
          product.discount_percent && product.discount_percent > 0
        )
        
        // 할인율 순으로 정렬 (높은 순)
        discounted.sort((a: any, b: any) => b.discount_percent - a.discount_percent)
        
        setDiscountedProducts(discounted)
      }
    } catch (error) {
      console.error('데이터 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleProduct = (productId: string) => {
    const current = newDiscount.product_ids
    const isSelected = current.includes(productId)
    setNewDiscount({
      ...newDiscount,
      product_ids: isSelected 
        ? current.filter(id => id !== productId)
        : [...current, productId]
    })
  }

  const applyDiscount = async () => {
    if (!newDiscount.discount_percent || Number(newDiscount.discount_percent) <= 0 || Number(newDiscount.discount_percent) > 100) {
      toast.error('할인율을 1~100 사이로 입력하세요', {
        icon: '⚠️',
      })
      return
    }

    if (newDiscount.product_ids.length === 0) {
      toast.error('최소 1개 이상의 상품을 선택하세요', {
        icon: '⚠️',
      })
      return
    }

    try {
      const discountPercent = Number(newDiscount.discount_percent)
      
      // 선택한 상품들에 할인율 적용
      for (const productId of newDiscount.product_ids) {
        await fetch(`/api/admin/products/${productId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            discount_percent: discountPercent,
          })
        })
      }

      toast.success('할인이 적용되었습니다!', {
        icon: '🎉',
      })
      setNewDiscount({ discount_percent: '', product_ids: [] })
      fetchData()
    } catch (error) {
      console.error('할인 적용 실패:', error)
      toast.error('할인 적용에 실패했습니다')
    }
  }

  const startEdit = (product: any) => {
    setEditingProduct(product)
    setEditingDiscount(String(product.discount_percent))
  }

  const saveEdit = async () => {
    if (!editingProduct) return
    
    const discountPercent = editingDiscount ? Number(editingDiscount) : null
    
    if (discountPercent !== null && (discountPercent <= 0 || discountPercent > 100)) {
      toast.error('할인율을 1~100 사이로 입력하세요', {
        icon: '⚠️',
      })
      return
    }

    try {
      await fetch(`/api/admin/products/${editingProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discount_percent: discountPercent,
        })
      })

      toast.success('할인이 수정되었습니다', {
        icon: '✅',
      })
      setEditingProduct(null)
      setEditingDiscount('')
      fetchData()
    } catch (error) {
      console.error('할인 수정 실패:', error)
      toast.error('할인 수정에 실패했습니다')
    }
  }

  const deleteDiscount = async (product: any) => {
    if (!confirm(`"${product.name}"의 할인을 해제하시겠습니까?`)) return

    try {
      await fetch(`/api/admin/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discount_percent: null,
        })
      })

      toast.success('할인이 해제되었습니다', {
        icon: '✅',
      })
      fetchData()
    } catch (error) {
      console.error('할인 해제 실패:', error)
      toast.error('할인 해제에 실패했습니다')
    }
  }

  // 모든 상품 표시 (할인/프로모션/타임딜 중인 상품은 비활성화)
  const filteredProducts = searchQuery
    ? products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : products

  const selectedProducts = products.filter(p => newDiscount.product_ids.includes(p.id))

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
            <h1 className="text-2xl font-bold text-gray-900">💰 할인 관리</h1>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            관리자 홈
          </button>
        </div>

        {/* 새 할인 생성 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">새 할인 적용</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">할인율 (%)</label>
              <input
                type="number"
                min="1"
                max="100"
                value={newDiscount.discount_percent}
                onChange={(e) => setNewDiscount({ ...newDiscount, discount_percent: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="예: 10, 20, 30"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">
                  선택된 상품 ({newDiscount.product_ids.length}개)
                </label>
                <button
                  onClick={() => setShowProductSelector(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  상품 선택
                </button>
              </div>
              
              {selectedProducts.length > 0 ? (
                <div className="border rounded-lg p-3 bg-gray-50 max-h-40 overflow-y-auto">
                  <div className="flex flex-wrap gap-2">
                    {selectedProducts.map((p) => {
                      const discountPrice = newDiscount.discount_percent 
                        ? Math.round(p.price * (100 - Number(newDiscount.discount_percent)) / 100)
                        : p.price
                      return (
                        <div key={p.id} className="flex items-center gap-2 p-2 bg-white border rounded">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{p.name}</div>
                            <div className="text-xs text-gray-600">
                              {newDiscount.discount_percent ? (
                                <>
                                  <span className="line-through">{p.price.toLocaleString()}원</span>
                                  <span className="ml-2 text-red-600 font-bold">
                                    {discountPrice.toLocaleString()}원 ({newDiscount.discount_percent}% 할인)
                                  </span>
                                </>
                              ) : (
                                <span>{p.price.toLocaleString()}원</span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => toggleProduct(p.id)}
                            className="text-red-600 hover:text-red-800 text-lg"
                          >
                            ×
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="border rounded-lg p-4 bg-gray-50 text-center text-sm text-gray-500">
                  상품을 선택하세요
                </div>
              )}
            </div>

            <button
              onClick={applyDiscount}
              className="w-full py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition"
            >
              할인 적용
            </button>
          </div>
        </div>

        {/* 할인 중인 상품 목록 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold mb-4">할인 중인 상품 ({discountedProducts.length}개)</h2>
          
          {loading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : discountedProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              할인 중인 상품이 없습니다
            </div>
          ) : (
            <div className="space-y-3">
              {discountedProducts.map((product) => {
                const discountPrice = Math.round(product.price * (100 - product.discount_percent) / 100)
                const isEditing = editingProduct?.id === product.id
                
                return (
                  <div key={product.id} className="border rounded-lg p-4 hover:bg-gray-50 transition">
                    {isEditing ? (
                      <div className="space-y-3">
                        <div>
                          <div className="font-medium text-sm mb-1">{product.name}</div>
                          <div className="text-xs text-gray-600">
                            정가: {product.price.toLocaleString()}원
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">할인율 (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={editingDiscount}
                            onChange={(e) => setEditingDiscount(e.target.value)}
                            className="w-full px-3 py-2 border rounded text-sm"
                            placeholder="0 입력 시 할인 해제"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={saveEdit}
                            className="flex-1 px-3 py-2 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700"
                          >
                            저장
                          </button>
                          <button
                            onClick={() => {
                              setEditingProduct(null)
                              setEditingDiscount('')
                            }}
                            className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 rounded text-sm font-medium hover:bg-gray-300"
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-bold">
                              {product.discount_percent}% 할인
                            </span>
                            <span className="font-medium text-sm">{product.name}</span>
                          </div>
                          <div className="text-xs text-gray-600">
                            <span className="line-through text-gray-400">{product.price.toLocaleString()}원</span>
                            <span className="ml-2 text-red-600 font-bold">
                              {discountPrice.toLocaleString()}원
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(product)}
                            className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => deleteDiscount(product)}
                            className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition"
                          >
                            해제
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 안내 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">💡 할인 작동 방식</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 할인/프로모션/타임딜이 없는 상품만 할인에 추가할 수 있습니다</li>
            <li>• 각 상품별로 개별적으로 할인율을 설정/수정할 수 있습니다</li>
            <li>• 할인된 상품은 타임딜에 추가할 수 있습니다</li>
            <li>• 할인 해제 시 상품은 정가로 복원됩니다</li>
          </ul>
        </div>
      </main>

      {/* 상품 선택 모달 */}
      {showProductSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowProductSelector(false)}></div>
          <div className="relative bg-white rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-5 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">할인 대상 상품 선택</h3>
                <button onClick={() => setShowProductSelector(false)} className="text-white text-2xl">×</button>
              </div>
            </div>

            <div className="p-4">
              <input
                type="text"
                placeholder="상품명 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 mb-3 text-sm"
              />
              <p className="text-xs text-gray-600">
                할인/프로모션/타임딜 중인 상품은 선택할 수 없습니다
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto px-4">
              <div className="space-y-2 pb-4">
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {searchQuery ? '검색 결과가 없습니다' : '상품이 없습니다'}
                  </div>
                ) : (
                  filteredProducts.map((product) => {
                    const isSelected = newDiscount.product_ids.includes(product.id)
                    const hasDiscount = product.discount_percent && product.discount_percent > 0
                    const hasPromotion = product.promotion_type
                    const hasFlashSale = product.flash_sale_end_time
                    const isDisabled = hasDiscount || hasPromotion || hasFlashSale || product.stock <= 0
                    
                    return (
                      <div 
                        key={product.id}
                        onClick={() => {
                          if (!isDisabled) {
                            toggleProduct(product.id)
                          }
                        }}
                        className={`flex items-center justify-between p-3 rounded-lg transition ${
                          isDisabled 
                            ? 'bg-gray-100 border-2 border-gray-200 cursor-not-allowed opacity-60'
                            : isSelected 
                              ? 'bg-red-100 border-2 border-red-500 cursor-pointer' 
                              : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            disabled={isDisabled}
                            onChange={() => {}}
                            className="w-5 h-5"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold">{product.name}</p>
                              {hasDiscount && (
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded">
                                  {product.discount_percent}% 할인중
                                </span>
                              )}
                              {hasPromotion && !hasDiscount && (
                                <span className="px-2 py-0.5 bg-pink-100 text-pink-700 text-xs font-bold rounded">
                                  {product.promotion_type} 프로모션 적용중
                                </span>
                              )}
                              {hasFlashSale && !hasDiscount && !hasPromotion && (
                                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded">
                                  타임딜 진행중
                                </span>
                              )}
                              {product.stock <= 0 && (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-bold rounded">
                                  품절
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              {product.category} • {product.price.toLocaleString()}원
                              {newDiscount.discount_percent && !isDisabled && (
                                <span className="ml-2 text-red-600 font-bold">
                                  → {Math.round(product.price * (100 - Number(newDiscount.discount_percent)) / 100).toLocaleString()}원 ({newDiscount.discount_percent}% 할인)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
            
            <div className="px-5 py-3 bg-gray-50 border-t flex justify-between items-center">
              <span className="text-sm text-gray-600">
                {newDiscount.product_ids.length}개 선택됨
              </span>
              <button
                onClick={() => setShowProductSelector(false)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
              >
                완료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

