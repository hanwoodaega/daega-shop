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
  }>
  created_at: string
}

export default function FlashSalesPage() {
  const router = useRouter()
  const [groups, setGroups] = useState<FlashSaleGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [flashSaleTitle, setFlashSaleTitle] = useState('오늘만 특가!')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [flashSaleSettings, setFlashSaleSettings] = useState<{ start_time?: string | null; end_time?: string | null } | null>(null)
  const [timedealCollectionProducts, setTimedealCollectionProducts] = useState<any[]>([])
  
  const [newGroup, setNewGroup] = useState({
    start_time: '',  // 선택 사항
    end_time: ''
  })

  useEffect(() => {
    fetchData()
    fetchFlashSaleTitle()
    fetchTimedealCollectionProducts()
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

  const fetchTimedealCollectionProducts = async () => {
    try {
      // 타임딜 컬렉션의 상품 조회
      const res = await fetch('/api/admin/collections/timedeal')
      const data = await res.json()
      if (res.ok && data.products) {
        setTimedealCollectionProducts(data.products || [])
      }
    } catch (error) {
      console.error('타임딜 컬렉션 상품 조회 실패:', error)
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
      // 타임딜 컬렉션 조회
      const res = await fetch('/api/admin/collections/timedeal')
      const data = await res.json()
      
      if (res.ok) {
        // 타임딜 컬렉션 정보
        if (data.collection) {
          setFlashSaleSettings({
            start_time: data.start_time || null,
            end_time: data.end_time || null
          })
          
          // 타임딜 그룹 생성
          if (data.collection.is_active && data.end_time) {
            const flashSaleGroups: FlashSaleGroup[] = [{
              id: data.collection.id,
              start_time: data.start_time || null,
              end_time: data.end_time,
              products: (data.products || []).map((p: any) => ({
                id: p.id,
                name: p.name,
                price: p.price,
                discount_percent: p.promotion?.type === 'percent' && p.promotion.discount_percent
                  ? p.promotion.discount_percent
                  : null,
              })),
              created_at: data.collection.created_at
            }]
            setGroups(flashSaleGroups)
          } else {
            setGroups([])
          }
        } else {
          setGroups([])
        }
        
        // 제목 설정
        if (data.title) {
          setFlashSaleTitle(data.title)
        }
        
        // 타임딜 컬렉션 상품 목록 업데이트
        if (data.products) {
          setTimedealCollectionProducts(data.products || [])
        }
      }
    } catch (error) {
      console.error('데이터 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }



  const createGroup = async () => {
    if (!newGroup.end_time) {
      toast.error('타임딜 종료 시간을 설정하세요', {
        icon: '⚠️',
      })
      return
    }

    // 컬렉션 관리 페이지의 타임딜 컬렉션에서 상품 가져오기
    if (timedealCollectionProducts.length === 0) {
      toast.error('컬렉션 관리 페이지에서 타임딜 컬렉션에 상품을 먼저 추가해주세요', {
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
      
      // 기존 타임딜이 있으면 확인
      if (groups.length > 0) {
        const existingGroup = groups[0]
        const existingStartStr = existingGroup.start_time 
          ? new Date(existingGroup.start_time).toLocaleString('ko-KR', { 
              year: 'numeric', 
              month: '2-digit', 
              day: '2-digit', 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false 
            })
          : '즉시 시작'
        const existingEndStr = new Date(existingGroup.end_time).toLocaleString('ko-KR', { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit', 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        })
        
        if (!confirm(`기존 타임딜이 있습니다.\n기존 타임딜: ${existingStartStr} ~ ${existingEndStr}\n\n새 타임딜로 교체하시겠습니까?`)) {
          return
        }
      }
      
      // 컬렉션 관리 페이지의 타임딜 컬렉션에서 상품 ID 추출
      const productIds = timedealCollectionProducts.map((p: any) => {
        const product = p.products ? (Array.isArray(p.products) ? p.products[0] : p.products) : p
        return product?.id || p.product_id
      }).filter(Boolean)

      // 타임딜 컬렉션 업데이트 (가격 설정 없음, 전시만)
      const response = await fetch('/api/admin/collections/timedeal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: flashSaleTitle,
          start_at: startTime || null,
          end_at: endTime,
          product_ids: productIds,
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '타임딜 설정 실패')
      }

      toast.success('타임딜이 생성되었습니다!', {
        icon: '🎉',
      })
      setNewGroup({ start_time: '', end_time: '' })
      fetchData()
      fetchTimedealCollectionProducts()
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
      // 타임딜 컬렉션 비활성화
      const response = await fetch('/api/admin/collections/timedeal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          end_at: new Date().toISOString(), // 현재 시간으로 설정하여 즉시 종료
          product_ids: [], // 상품 제거
        })
      })

      if (!response.ok) {
        throw new Error('타임딜 삭제 실패')
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
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-600 transition"
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
                모든 타임딜 상품이 같은 시간을 공유합니다.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                타임딜 상품 ({timedealCollectionProducts.length}개)
              </label>
              {timedealCollectionProducts.length > 0 ? (
                <div className="border rounded-lg p-3 bg-gray-50 max-h-60 overflow-y-auto mb-2">
                  <div className="space-y-2">
                    {timedealCollectionProducts.map((p: any) => {
                      const product = p.products ? (Array.isArray(p.products) ? p.products[0] : p.products) : p
                      const productId = product?.id || p.product_id
                      const productName = product?.name || p.name
                      const productPrice = product?.price || p.price
                      const promotion = product?.promotion
                      const discountPercent = promotion?.type === 'percent' && promotion.discount_percent
                        ? promotion.discount_percent
                        : null
                      const promotionBadge = promotion?.type === 'bogo' && promotion.buy_qty
                        ? `${promotion.buy_qty}+1`
                        : null
                      
                      return (
                        <div key={productId} className="flex items-center justify-between p-2 bg-white border rounded">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{productName}</div>
                            <div className="text-xs text-gray-600">
                              {discountPercent ? (
                                <>
                                  <span className="line-through">{productPrice?.toLocaleString()}원</span>
                                  <span className="ml-2 text-red-600 font-bold">
                                    {Math.round(productPrice * (1 - discountPercent / 100)).toLocaleString()}원 ({discountPercent}%)
                                  </span>
                                </>
                              ) : promotionBadge ? (
                                <span>{productPrice?.toLocaleString()}원 <span className="text-red-600 font-bold">({promotionBadge})</span></span>
                              ) : (
                                <span>{productPrice?.toLocaleString()}원</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="border rounded-lg p-4 bg-gray-50 text-center text-sm text-gray-500 mb-2">
                  컬렉션 관리 페이지에서 타임딜 컬렉션에 상품을 추가해주세요
                </div>
              )}
              <button
                onClick={() => router.push('/admin/collections')}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
              >
                컬렉션 관리 페이지에서 상품 추가하기
              </button>
            </div>

            <button
              onClick={createGroup}
              className="w-full py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-600 transition"
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
                              ? 'bg-red-100 text-red-600' 
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
                                if (!group.start_time) {
                                  return '시간 정보 없음'
                                }
                                
                                try {
                                  // UTC 시간 문자열을 파싱
                                  let date: Date
                                  if (typeof group.start_time === 'string') {
                                    const utcString = group.start_time.endsWith('Z') ? group.start_time : group.start_time + 'Z'
                                    date = new Date(utcString)
                                  } else {
                                    date = new Date(group.start_time)
                                  }
                                  
                                  // 유효한 날짜인지 확인
                                  if (isNaN(date.getTime())) {
                                    return '시간 정보 없음'
                                  }
                                  
                                  // 로컬 시간대로 변환된 값 사용
                                  const year = date.getFullYear()
                                  const month = String(date.getMonth() + 1).padStart(2, '0')
                                  const day = String(date.getDate()).padStart(2, '0')
                                  const hours = String(date.getHours()).padStart(2, '0')
                                  const minutes = String(date.getMinutes()).padStart(2, '0')
                                  return `${year}. ${month}. ${day}. ${hours}:${minutes}`
                                } catch (error) {
                                  console.error('시작 시간 파싱 오류:', error, group.start_time)
                                  return '시간 정보 없음'
                                }
                              })()}<br/>
                              종료 시간: {(() => {
                                // flash_sale_settings에서 직접 가져온 end_time 사용
                                const endTime = flashSaleSettings?.end_time
                                
                                if (!endTime) {
                                  return '시간 정보 없음'
                                }
                                
                                try {
                                  // Supabase TIMESTAMPTZ는 ISO 8601 형식으로 반환됨
                                  const date = new Date(endTime)
                                  
                                  // 유효한 날짜인지 확인
                                  if (isNaN(date.getTime())) {
                                    return '시간 정보 없음'
                                  }
                                  
                                  // 로컬 시간대로 변환된 값 사용
                                  const year = date.getFullYear()
                                  const month = String(date.getMonth() + 1).padStart(2, '0')
                                  const day = String(date.getDate()).padStart(2, '0')
                                  const hours = String(date.getHours()).padStart(2, '0')
                                  const minutes = String(date.getMinutes()).padStart(2, '0')
                                  return `${year}. ${month}. ${day}. ${hours}:${minutes}`
                                } catch (error) {
                                  return '시간 정보 없음'
                                }
                              })()}
                            </>
                          ) : (
                            <>종료 시간: {(() => {
                              // flash_sale_settings에서 직접 가져온 end_time 사용
                              const endTime = flashSaleSettings?.end_time
                              
                              if (!endTime) {
                                return '시간 정보 없음'
                              }
                              
                              try {
                                // Supabase TIMESTAMPTZ는 ISO 8601 형식으로 반환됨
                                const date = new Date(endTime)
                                
                                // 유효한 날짜인지 확인
                                if (isNaN(date.getTime())) {
                                  return '시간 정보 없음'
                                }
                                
                                // 로컬 시간대로 변환된 값 사용
                                const year = date.getFullYear()
                                const month = String(date.getMonth() + 1).padStart(2, '0')
                                const day = String(date.getDate()).padStart(2, '0')
                                const hours = String(date.getHours()).padStart(2, '0')
                                const minutes = String(date.getMinutes()).padStart(2, '0')
                                return `${year}. ${month}. ${day}. ${hours}:${minutes}`
                              } catch (error) {
                                return '시간 정보 없음'
                              }
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
                                  {discountPrice.toLocaleString()}원
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
          <h3 className="font-semibold text-red-600 mb-2">💡 타임딜 작동 방식</h3>
          <ul className="text-sm text-red-600 space-y-1">
            <li>• 타임딜 상품은 <strong>컬렉션 관리 페이지</strong>에서 타임딜 컬렉션에 추가해주세요</li>
            <li>• 타임딜 생성 시 컬렉션 관리 페이지의 타임딜 컬렉션에 있는 상품이 자동으로 사용됩니다</li>
            <li>• 시작 시간은 선택 사항입니다. 입력하지 않으면 즉시 시작됩니다</li>
            <li>• 모든 타임딜 상품이 같은 종료 시간을 공유합니다</li>
            <li>• 타임딜 종료 후 자동으로 비활성화되어 메인/슬라이드에서 제거됩니다</li>
          </ul>
        </div>
      </main>

    </div>
  )
}

