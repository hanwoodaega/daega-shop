'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { calculateDiscountPrice } from '@/lib/product-utils'

interface FlashSaleGroup {
  id: string
  start_time?: string | null
  end_time: string
  products: Array<{
    id: string
    name: string
    price: number
    discount_percent?: number | null
    flash_sale_stock: number
  }>
  created_at: string
}

export default function FlashSalesPage() {
  const router = useRouter()
  const [groups, setGroups] = useState<FlashSaleGroup[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [flashSaleTitle, setFlashSaleTitle] = useState('오늘만 특가!')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  
  const [newGroup, setNewGroup] = useState({
    start_time: '',  // 선택 사항
    end_time: '',
    product_stocks: {} as Record<string, number>  // product_id -> stock
  })
  const [showProductSelector, setShowProductSelector] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchData()
    fetchFlashSaleTitle()
  }, [])

  const fetchFlashSaleTitle = async () => {
    try {
      const res = await fetch('/api/admin/flash-sale-settings')
      if (res.ok) {
        const data = await res.json()
        if (data.title) {
          setFlashSaleTitle(data.title)
        }
      }
    } catch (error) {
      console.error('타임딜 제목 조회 실패:', error)
    }
  }

  const updateFlashSaleTitle = async () => {
    try {
      const res = await fetch('/api/admin/flash-sale-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: flashSaleTitle })
      })
      if (res.ok) {
        toast.success('타임딜 제목이 수정되었습니다', { icon: '✅' })
        setIsEditingTitle(false)
      } else {
        toast.error('제목 수정에 실패했습니다')
      }
    } catch (error) {
      console.error('타임딜 제목 수정 실패:', error)
      toast.error('제목 수정에 실패했습니다')
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      // 상품 목록 가져오기
      const res = await fetch('/api/admin/products?limit=1000')
      const data = await res.json()
      if (res.ok) {
        const allProducts = data.items || []
        setProducts(allProducts)
        
        // 타임딜이 설정된 상품들을 그룹화 (같은 시작/종료 시간 기준)
        const groupMap = new Map<string, any[]>()
        
        allProducts.forEach((product: any) => {
          if (product.flash_sale_end_time) {
            // 시작 시간과 종료 시간을 조합한 키 사용 (구분자로 '|' 사용)
            const startKey = product.flash_sale_start_time || 'immediate'
            const endKey = product.flash_sale_end_time
            const key = `${startKey}|${endKey}`
            if (!groupMap.has(key)) {
              groupMap.set(key, [])
            }
            groupMap.get(key)!.push(product)
          }
        })
        
        // 그룹 목록 생성
        const flashSaleGroups: FlashSaleGroup[] = []
        groupMap.forEach((products, key) => {
          if (products.length > 0) {
            const [startTime, endTime] = key.split('|')
            flashSaleGroups.push({
              id: key,
              start_time: startTime !== 'immediate' ? startTime : null,
              end_time: endTime,
              products: products.map(p => ({
                id: p.id,
                name: p.name,
                price: p.price,
                discount_percent: p.discount_percent,
                flash_sale_stock: p.flash_sale_stock || 0
              })),
              created_at: products[0].updated_at || products[0].created_at
            })
          }
        })
        
        // 종료 시간 순으로 정렬 (가까운 순)
        flashSaleGroups.sort((a, b) => 
          new Date(a.end_time).getTime() - new Date(b.end_time).getTime()
        )
        
        setGroups(flashSaleGroups)
      }
    } catch (error) {
      console.error('데이터 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleProduct = (productId: string) => {
    const current = newGroup.product_stocks
    if (current[productId]) {
      // 이미 선택된 상품이면 제거
      const updated = { ...current }
      delete updated[productId]
      setNewGroup({ ...newGroup, product_stocks: updated })
    } else {
      // 새로 선택하면 수량 1로 추가
      setNewGroup({
        ...newGroup,
        product_stocks: { ...current, [productId]: 1 }
      })
    }
  }

  const updateProductStock = (productId: string, stock: number) => {
    if (stock < 1) {
      // 0 이하면 제거
      const updated = { ...newGroup.product_stocks }
      delete updated[productId]
      setNewGroup({ ...newGroup, product_stocks: updated })
    } else {
      setNewGroup({
        ...newGroup,
        product_stocks: { ...newGroup.product_stocks, [productId]: stock }
      })
    }
  }

  const createGroup = async () => {
    if (!newGroup.end_time) {
      toast.error('타임딜 종료 시간을 설정하세요', {
        icon: '⚠️',
      })
      return
    }

    if (Object.keys(newGroup.product_stocks).length === 0) {
      toast.error('최소 1개 이상의 상품을 선택하세요', {
        icon: '⚠️',
      })
      return
    }

    try {
      // datetime-local은 로컬 시간대를 반환하므로, 로컬 시간을 UTC로 정확히 변환
      // 입력값: "2025-11-15T18:00" (한국 시간 오후 6시)
      // datetime-local 값은 시간대 정보가 없으므로, 명시적으로 로컬 시간대로 처리
      const convertLocalToUTC = (localDateTime: string): string => {
        // "2025-11-15T18:00" 형식을 파싱
        const [datePart, timePart] = localDateTime.split('T')
        const [year, month, day] = datePart.split('-').map(Number)
        const [hours, minutes] = timePart.split(':').map(Number)
        
        // 로컬 시간대로 Date 객체 생성
        const localDate = new Date(year, month - 1, day, hours, minutes)
        
        // UTC로 변환
        return localDate.toISOString()
      }
      
      const endTime = newGroup.end_time 
        ? convertLocalToUTC(newGroup.end_time)
        : null
      const startTime = newGroup.start_time 
        ? convertLocalToUTC(newGroup.start_time)
        : null
      
      // 기존 타임딜과 시간 겹침 확인
      const newStartTime = startTime ? new Date(startTime).getTime() : Date.now()
      const newEndTime = new Date(endTime!).getTime()
      
      // 시작 시간이 종료 시간보다 늦으면 안 됨
      if (newStartTime >= newEndTime) {
        toast.error('시작 시간은 종료 시간보다 빨라야 합니다', {
          icon: '⚠️',
        })
        return
      }
      
      // 기존 타임딜 그룹들과 시간 겹침 확인
      for (const group of groups) {
        const existingStartTime = group.start_time 
          ? new Date(group.start_time).getTime() 
          : Date.now()
        const existingEndTime = new Date(group.end_time).getTime()
        
        // 시간이 겹치는지 확인 (새 타임딜의 시작 < 기존 타임딜의 종료 && 새 타임딜의 종료 > 기존 타임딜의 시작)
        if (newStartTime < existingEndTime && newEndTime > existingStartTime) {
          const existingStartStr = group.start_time 
            ? new Date(group.start_time).toLocaleString('ko-KR', { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit', 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
              })
            : '즉시 시작'
          const existingEndStr = new Date(group.end_time).toLocaleString('ko-KR', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          })
          
          toast.error(`기존 타임딜과 시간이 겹칩니다.\n기존 타임딜: ${existingStartStr} ~ ${existingEndStr}`, {
            icon: '⚠️',
            duration: 5000,
          })
          return
        }
      }
      
      // 디버깅: 저장되는 시간 확인
      console.log('입력 시간:', { 
        end_time_input: newGroup.end_time, 
        end_time_utc: endTime,
        start_time_input: newGroup.start_time,
        start_time_utc: startTime
      })
      
      // 선택한 상품들에 타임딜 설정
      for (const [productId, stock] of Object.entries(newGroup.product_stocks)) {
        const product = products.find(p => p.id === productId)
        if (!product) continue

        // 기존 할인가 계산 (할인율이 있으면 할인가, 없으면 정가)
        const flashSalePrice = calculateDiscountPrice(
          product.price,
          product.discount_percent
        )

        await fetch(`/api/admin/products/${productId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            flash_sale_start_time: startTime,
            flash_sale_end_time: endTime,
            flash_sale_price: flashSalePrice,
            flash_sale_stock: stock,
          })
        })
      }

      toast.success('타임딜이 생성되었습니다!', {
        icon: '🎉',
      })
      setNewGroup({ start_time: '', end_time: '', product_stocks: {} })
      fetchData()
    } catch (error) {
      console.error('타임딜 생성 실패:', error)
      toast.error('타임딜 생성에 실패했습니다')
    }
  }

  const deleteFlashSale = async (group: FlashSaleGroup) => {
    const endTimeStr = new Date(group.end_time).toLocaleString('ko-KR', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    })
    if (!confirm(`이 타임딜을 삭제하시겠습니까?\n\n종료 시간: ${endTimeStr}\n상품 수: ${group.products.length}개`)) return

    try {
      // 해당 상품들의 타임딜 설정 제거
      for (const product of group.products) {
        await fetch(`/api/admin/products/${product.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            flash_sale_start_time: null,
            flash_sale_end_time: null,
            flash_sale_price: null,
            flash_sale_stock: null,
          })
        })
      }

      toast.success('타임딜이 삭제되었습니다', {
        icon: '✅',
      })
      fetchData()
    } catch (error) {
      console.error('타임딜 삭제 실패:', error)
      toast.error('타임딜 삭제에 실패했습니다')
    }
  }

  // 할인 중이거나 프로모션 중인 상품만 필터링
  const eligibleProducts = products.filter(p => {
    const hasDiscount = p.discount_percent && p.discount_percent > 0
    const hasPromotion = p.promotion_type
    const alreadyInFlashSale = p.flash_sale_end_time
    return (hasDiscount || hasPromotion) && !alreadyInFlashSale && p.stock > 0
  })

  const filteredProducts = searchQuery
    ? eligibleProducts.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : eligibleProducts

  const selectedProducts = products.filter(p => 
    Object.keys(newGroup.product_stocks).includes(p.id)
  )

  const formatRemainingTime = (endTime: string) => {
    const now = new Date().getTime()
    const end = new Date(endTime).getTime()
    const remaining = Math.max(0, end - now)
    
    if (remaining === 0) return '종료됨'
    
    const hours = Math.floor(remaining / (1000 * 60 * 60))
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days}일 ${hours % 24}시간`
    }
    return `${hours}시간 ${minutes}분`
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
            <h1 className="text-2xl font-bold text-gray-900">⏰ 타임딜 관리</h1>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            관리자 홈
          </button>
        </div>

        {/* 타임딜 제목 설정 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">타임딜 섹션 제목 설정</h2>
          <div className="flex items-center gap-3">
            {isEditingTitle ? (
              <>
                <input
                  type="text"
                  value={flashSaleTitle}
                  onChange={(e) => setFlashSaleTitle(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="타임딜 섹션 제목"
                />
                <button
                  onClick={updateFlashSaleTitle}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  저장
                </button>
                <button
                  onClick={() => {
                    setIsEditingTitle(false)
                    fetchFlashSaleTitle()
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  취소
                </button>
              </>
            ) : (
              <>
                <div className="flex-1 px-3 py-2 bg-gray-50 border rounded-lg">
                  <span className="text-gray-900 font-medium">{flashSaleTitle}</span>
                </div>
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  수정
                </button>
              </>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            메인 페이지의 타임딜 섹션에 표시되는 제목입니다.
          </p>
        </div>

        {/* 새 타임딜 생성 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">새 타임딜 만들기</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                타임딜 시작 시간 <span className="text-xs text-gray-500 font-normal">(선택 사항)</span>
              </label>
              <input
                type="datetime-local"
                value={newGroup.start_time}
                onChange={(e) => setNewGroup({ ...newGroup, start_time: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                min={new Date().toISOString().slice(0, 16)}
              />
              <p className="text-xs text-gray-500 mt-1">
                입력하지 않으면 즉시 시작됩니다.
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">타임딜 종료 시간</label>
              <input
                type="datetime-local"
                value={newGroup.end_time}
                onChange={(e) => setNewGroup({ ...newGroup, end_time: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                min={newGroup.start_time || new Date().toISOString().slice(0, 16)}
              />
              <p className="text-xs text-gray-500 mt-1">
                같은 종료 시간으로 설정된 상품들이 하나의 타임딜 그룹으로 묶입니다.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">
                  선택된 상품 ({Object.keys(newGroup.product_stocks).length}개)
                </label>
                <button
                  onClick={() => setShowProductSelector(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  상품 선택
                </button>
              </div>
              
              {selectedProducts.length > 0 ? (
                <div className="border rounded-lg p-3 bg-gray-50 max-h-60 overflow-y-auto">
                  <div className="space-y-2">
                    {selectedProducts.map((p) => {
                      const stock = newGroup.product_stocks[p.id] || 1
                      const discountPrice = calculateDiscountPrice(p.price, p.discount_percent)
                      return (
                        <div key={p.id} className="flex items-center justify-between p-2 bg-white border rounded">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{p.name}</div>
                            <div className="text-xs text-gray-600">
                              {p.discount_percent ? (
                                <>
                                  <span className="line-through">{p.price.toLocaleString()}원</span>
                                  <span className="ml-2 text-red-600 font-bold">
                                    {discountPrice.toLocaleString()}원 ({p.discount_percent}% 할인)
                                  </span>
                                </>
                              ) : (
                                <span>{p.price.toLocaleString()}원</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-600">한정수량:</label>
                            <input
                              type="number"
                              min="1"
                              value={stock}
                              onChange={(e) => updateProductStock(p.id, parseInt(e.target.value) || 1)}
                              className="w-20 px-2 py-1 border rounded text-sm"
                            />
                            <button
                              onClick={() => toggleProduct(p.id)}
                              className="text-red-600 hover:text-red-800 text-lg"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="border rounded-lg p-4 bg-gray-50 text-center text-sm text-gray-500">
                  상품을 선택하세요 (할인 중이거나 프로모션 중인 상품만 선택 가능)
                </div>
              )}
            </div>

            <button
              onClick={createGroup}
              className="w-full py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition"
            >
              타임딜 생성
            </button>
          </div>
        </div>

        {/* 생성된 타임딜 목록 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold mb-4">생성된 타임딜 목록 ({groups.length})</h2>
          
          {loading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : groups.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              생성된 타임딜이 없습니다
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => {
                const now = new Date().getTime()
                const endTime = new Date(group.end_time).getTime()
                const startTime = group.start_time ? new Date(group.start_time).getTime() : null
                const isWaiting = startTime !== null && now < startTime
                const isActive = endTime > now && (startTime === null || now >= startTime)
                const isEnded = endTime <= now
                
                return (
                  <div key={group.id} className="border rounded-lg p-4 hover:bg-gray-50 transition">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                            isActive 
                              ? 'bg-red-100 text-red-700' 
                              : isWaiting
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {isActive ? '⏰ 진행중' : isWaiting ? '⏳ 대기중' : '종료됨'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {group.products.length}개 상품
                          </span>
                          {isActive && (
                            <span className="text-xs text-orange-600 font-medium">
                              남은 시간: {formatRemainingTime(group.end_time)}
                            </span>
                          )}
                          {isWaiting && startTime && (
                            <span className="text-xs text-yellow-600 font-medium">
                              시작까지: {formatRemainingTime(new Date(startTime).toISOString())}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-700 mb-2">
                          {group.start_time ? (
                            <>
                              시작 시간: {(() => {
                                // UTC 시간 문자열을 파싱 (Z가 있으면 UTC, 없으면 추가)
                                const utcString = group.start_time.endsWith('Z') ? group.start_time : group.start_time + 'Z'
                                const date = new Date(utcString)
                                // 로컬 시간대로 변환된 값 사용
                                const year = date.getFullYear()
                                const month = String(date.getMonth() + 1).padStart(2, '0')
                                const day = String(date.getDate()).padStart(2, '0')
                                const hours = String(date.getHours()).padStart(2, '0')
                                const minutes = String(date.getMinutes()).padStart(2, '0')
                                return `${year}. ${month}. ${day}. ${hours}:${minutes}`
                              })()}<br/>
                              종료 시간: {(() => {
                                // UTC 시간 문자열을 파싱 (Z가 있으면 UTC, 없으면 추가)
                                const utcString = group.end_time.endsWith('Z') ? group.end_time : group.end_time + 'Z'
                                const date = new Date(utcString)
                                // 로컬 시간대로 변환된 값 사용
                                const year = date.getFullYear()
                                const month = String(date.getMonth() + 1).padStart(2, '0')
                                const day = String(date.getDate()).padStart(2, '0')
                                const hours = String(date.getHours()).padStart(2, '0')
                                const minutes = String(date.getMinutes()).padStart(2, '0')
                                return `${year}. ${month}. ${day}. ${hours}:${minutes}`
                              })()}
                            </>
                          ) : (
                            <>종료 시간: {(() => {
                              // UTC 시간 문자열을 파싱 (Z가 있으면 UTC, 없으면 추가)
                              const utcString = group.end_time.endsWith('Z') ? group.end_time : group.end_time + 'Z'
                              const date = new Date(utcString)
                              // 로컬 시간대로 변환된 값 사용
                              const year = date.getFullYear()
                              const month = String(date.getMonth() + 1).padStart(2, '0')
                              const day = String(date.getDate()).padStart(2, '0')
                              const hours = String(date.getHours()).padStart(2, '0')
                              const minutes = String(date.getMinutes()).padStart(2, '0')
                              return `${year}. ${month}. ${day}. ${hours}:${minutes}`
                            })()}</>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 space-y-1">
                          {group.products.map((p) => {
                            const discountPrice = calculateDiscountPrice(p.price, p.discount_percent)
                            return (
                              <div key={p.id} className="flex items-center justify-between">
                                <span>{p.name}</span>
                                <span className="ml-2">
                                  {discountPrice.toLocaleString()}원 (한정: {p.flash_sale_stock}개)
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteFlashSale(group)}
                        className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 안내 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">💡 타임딜 작동 방식</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 할인 중이거나 프로모션 중인 상품만 타임딜에 추가할 수 있습니다</li>
            <li>• 타임딜 가격은 기존 할인가를 자동으로 사용합니다 (별도 입력 불필요)</li>
            <li>• 각 상품별로 한정 수량을 설정할 수 있습니다</li>
            <li>• 시작 시간은 선택 사항입니다. 입력하지 않으면 즉시 시작됩니다</li>
            <li>• 같은 시작/종료 시간으로 설정된 상품들이 하나의 타임딜 그룹으로 묶입니다</li>
            <li>• 타임딜 종료 후 자동으로 타임딜 설정이 해제됩니다</li>
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
                <h3 className="text-lg font-bold">타임딜 대상 상품 선택</h3>
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
                할인 중이거나 프로모션 중인 상품만 표시됩니다 ({filteredProducts.length}개)
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto px-4">
              <div className="space-y-2 pb-4">
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {searchQuery ? '검색 결과가 없습니다' : '타임딜 가능한 상품이 없습니다'}
                  </div>
                ) : (
                  filteredProducts.map((product) => {
                    const isSelected = Object.keys(newGroup.product_stocks).includes(product.id)
                    const hasDiscount = product.discount_percent && product.discount_percent > 0
                    const hasPromotion = product.promotion_type
                    const discountPrice = calculateDiscountPrice(product.price, product.discount_percent)
                    
                    return (
                      <div 
                        key={product.id}
                        onClick={() => toggleProduct(product.id)}
                        className={`flex items-center justify-between p-3 rounded-lg transition ${
                          isSelected 
                            ? 'bg-red-100 border-2 border-red-500 cursor-pointer' 
                            : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          <input 
                            type="checkbox" 
                            checked={isSelected}
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
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              {hasDiscount ? (
                                <>
                                  <span className="line-through">{product.price.toLocaleString()}원</span>
                                  <span className="ml-2 text-red-600 font-bold">
                                    타임딜가: {discountPrice.toLocaleString()}원
                                  </span>
                                </>
                              ) : (
                                <span>타임딜가: {product.price.toLocaleString()}원</span>
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
                {Object.keys(newGroup.product_stocks).length}개 선택됨
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

