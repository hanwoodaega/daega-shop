'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface PromotionGroup {
  id: string
  name: string
  type: '1+1' | '2+1' | '3+1'
  product_ids: string[]
  created_at: string
}

export default function PromotionsPage() {
  const router = useRouter()
  const [groups, setGroups] = useState<PromotionGroup[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [newGroup, setNewGroup] = useState({
    type: '1+1' as '1+1' | '2+1' | '3+1',
    product_ids: [] as string[]
  })
  const [showProductSelector, setShowProductSelector] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

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
        
        // 프로모션이 설정된 상품들을 그룹화
        const promoMap = new Map<string, any[]>()
        
        allProducts.forEach((product: any) => {
          if (product.promotion_type && product.promotion_products) {
            const key = product.promotion_products.sort().join(',')
            if (!promoMap.has(key)) {
              promoMap.set(key, [])
            }
            promoMap.get(key)!.push(product)
          }
        })
        
        // 그룹 목록 생성
        const promoGroups: PromotionGroup[] = []
        promoMap.forEach((products, key) => {
          if (products.length > 0) {
            promoGroups.push({
              id: key,
              name: products.map(p => p.name).join(', '),
              type: products[0].promotion_type,
              product_ids: products.map(p => p.id),
              created_at: products[0].updated_at || products[0].created_at
            })
          }
        })
        
        setGroups(promoGroups)
      }
    } catch (error) {
      console.error('데이터 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleProduct = (productId: string) => {
    const current = newGroup.product_ids
    const isSelected = current.includes(productId)
    setNewGroup({
      ...newGroup,
      product_ids: isSelected 
        ? current.filter(id => id !== productId)
        : [...current, productId]
    })
  }

  const createGroup = async () => {
    if (newGroup.product_ids.length < 1) {
      toast.error('최소 1개 이상의 상품을 선택하세요', {
        icon: '⚠️',
      })
      return
    }

    try {
      // 선택한 상품들에 프로모션 그룹 ID 저장
      const groupId = crypto.randomUUID()
      
      for (const productId of newGroup.product_ids) {
        await fetch(`/api/admin/products/${productId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            promotion_type: newGroup.type,
            promotion_products: newGroup.product_ids, // 같은 그룹의 모든 상품
          })
        })
      }

      toast.success('프로모션이 생성되었습니다!', {
        icon: '🎉',
      })
      setNewGroup({ type: '1+1' as '1+1' | '2+1' | '3+1', product_ids: [] })
      fetchData()
    } catch (error) {
      console.error('프로모션 생성 실패:', error)
      toast.error('프로모션 생성에 실패했습니다')
    }
  }

  const deletePromotion = async (group: PromotionGroup) => {
    if (!confirm(`"${group.name}" 프로모션을 삭제하시겠습니까?`)) return

    try {
      // 해당 상품들의 프로모션 설정 제거
      for (const productId of group.product_ids) {
        await fetch(`/api/admin/products/${productId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            promotion_type: null,
            promotion_products: null,
          })
        })
      }

      toast.success('프로모션이 삭제되었습니다', {
        icon: '✅',
      })
      fetchData()
    } catch (error) {
      console.error('프로모션 삭제 실패:', error)
      toast.error('프로모션 삭제에 실패했습니다')
    }
  }

  const filteredProducts = searchQuery
    ? products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : products

  const selectedProducts = products.filter(p => newGroup.product_ids.includes(p.id))

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
          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            관리자 홈
          </button>
        </div>

        {/* 새 프로모션 생성 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">새 프로모션 만들기</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">프로모션 타입</label>
              <select
                value={newGroup.type}
                onChange={(e)=>setNewGroup({...newGroup, type: e.target.value as '1+1' | '2+1' | '3+1'})}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="1+1">1+1 (2개 중 1개 무료)</option>
                <option value="2+1">2+1 (3개 중 1개 무료)</option>
                <option value="3+1">3+1 (4개 중 1개 무료)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">선택된 상품 ({newGroup.product_ids.length}개)</label>
                <button
                  onClick={()=>setShowProductSelector(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  상품 선택
                </button>
              </div>
              
              {selectedProducts.length > 0 ? (
                <div className="border rounded-lg p-3 bg-gray-50 max-h-40 overflow-y-auto">
                  <div className="flex flex-wrap gap-2">
                    {selectedProducts.map((p) => (
                      <span key={p.id} className="px-3 py-1 bg-white border rounded-full text-sm flex items-center gap-2">
                        {p.name}
                        <button
                          onClick={()=>toggleProduct(p.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="border rounded-lg p-4 bg-gray-50 text-center text-sm text-gray-500">
                  상품을 선택하세요
                </div>
              )}
            </div>

            <button
              onClick={createGroup}
              className="w-full py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition"
            >
              프로모션 생성
            </button>
          </div>
        </div>

        {/* 생성된 프로모션 목록 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold mb-4">생성된 프로모션 목록 ({groups.length})</h2>
          
          {groups.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              생성된 프로모션이 없습니다
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => (
                <div key={group.id} className="border rounded-lg p-4 hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm font-bold">
                          {group.type}
                        </span>
                        <span className="text-xs text-gray-500">
                          {group.product_ids.length}개 상품
                        </span>
                      </div>
                      <div className="text-sm text-gray-700">
                        {group.name}
                      </div>
                    </div>
                    <button
                      onClick={() => deletePromotion(group)}
                      className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 안내 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">💡 프로모션 작동 방식</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>1+1</strong>: 고객이 선택한 상품 중 2개를 고르면, 1개는 정상가, 1개는 무료</li>
            <li>• <strong>2+1</strong>: 고객이 선택한 상품 중 3개를 고르면, 2개는 정상가, 1개는 무료</li>
            <li>• <strong>3+1</strong>: 고객이 선택한 상품 중 4개를 고르면, 3개는 정상가, 1개는 무료</li>
            <li>• 같은 프로모션에 속한 상품끼리만 교차 적용됩니다</li>
          </ul>
        </div>
      </main>

      {/* 상품 선택 모달 */}
      {showProductSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={()=>setShowProductSelector(false)}></div>
          <div className="relative bg-white rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">프로모션 대상 상품 선택</h3>
                <button onClick={()=>setShowProductSelector(false)} className="text-white text-2xl">×</button>
              </div>
            </div>

            <div className="p-4">
              <input
                type="text"
                placeholder="상품명 검색..."
                value={searchQuery}
                onChange={(e)=>setSearchQuery(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 mb-3 text-sm"
              />
            </div>
            
            <div className="flex-1 overflow-y-auto px-4">
              <div className="space-y-2 pb-4">
                {filteredProducts.map((product) => {
                  const isSelected = newGroup.product_ids.includes(product.id)
                  return (
                    <div 
                      key={product.id}
                      onClick={()=>toggleProduct(product.id)}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition ${
                        isSelected ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={()=>{}}
                          className="w-5 h-5"
                        />
                        <div>
                          <p className="text-sm font-semibold">{product.name}</p>
                          <p className="text-xs text-gray-600">{product.category} • {product.price.toLocaleString()}원</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            
            <div className="px-5 py-3 bg-gray-50 border-t flex justify-between items-center">
              <span className="text-sm text-gray-600">
                {newGroup.product_ids.length}개 선택됨
              </span>
              <button
                onClick={()=>setShowProductSelector(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
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

