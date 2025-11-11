'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import ProductEditModal from '@/components/admin/ProductEditModal'
import { ADMIN_CATEGORIES } from '@/lib/constants'

export default function AdminPage() {
  const router = useRouter()
  
  // ✅ 상품 등록 폼 데이터 (이미 그룹화됨)
  const [form, setForm] = useState({
    brand: '',
    name: '',
    description: '',
    price: '',
    image_url: '',
    category: ADMIN_CATEGORIES[0],
    stock: '999',
    unit: '1팩',
    weight: '0',
    origin: '국내산',
    discount_percent: '',
  })
  
  // ✅ UI 상태 그룹화
  const [uiState, setUiState] = useState({
    message: null as string | null,
    error: null as string | null,
    loading: false,
    loadingList: false,
  })
  
  // ✅ 목록 관련 state 그룹화
  const [listState, setListState] = useState({
    items: [] as any[],
    filterCategory: '전체',
    filterTag: '전체',
    search: '',
    page: 1,
    total: 0,
  })
  
  const limit = 20
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Destructuring for backward compatibility
  const { message, error, loading, loadingList } = uiState
  const { items, filterCategory, filterTag, search, page, total } = listState

  // 페이지나 필터 변경 시 자동 조회
  useEffect(() => {
    fetchList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterCategory, filterTag])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUiState(prev => ({ ...prev, message: null, error: null, loading: true }))
    try {
      let imageUrl = form.image_url.trim()
      const file = fileInputRef.current?.files?.[0]
      if (file) {
        const fd = new FormData()
        fd.append('file', file)
        const up = await fetch('/api/admin/upload-image', { method: 'POST', body: fd })
        const upData = await up.json()
        if (!up.ok) {
          setUiState(prev => ({ ...prev, error: upData.error || '이미지 업로드 실패', loading: false }))
          return
        }
        imageUrl = upData.url
      }
      const payload = {
        brand: form.brand.trim() || null,
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        image_url: imageUrl,
        category: form.category,
        stock: Number(form.stock),
        unit: form.unit.trim(),
        weight: Number(form.weight),
        origin: form.origin.trim(),
        discount_percent: form.discount_percent === '' ? null : Number(form.discount_percent),
      }
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setUiState(prev => ({ ...prev, error: data.error || '등록에 실패했습니다.', loading: false }))
        return
      }
      setUiState(prev => ({ ...prev, message: '상품이 등록되었습니다.', loading: false }))
      setForm({ ...form, brand: '', name: '', description: '', price: '', image_url: '', stock: '999', weight: '0', discount_percent: '' })
      if (fileInputRef.current) fileInputRef.current.value = ''
      await fetchList()
    } catch (error) {
      console.error('상품 등록 실패:', error)
      setUiState(prev => ({ ...prev, error: '상품 등록에 실패했습니다.', loading: false }))
    }
  }

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.replace('/admin/login')
  }

  const fetchList = async () => {
    setUiState(prev => ({ ...prev, loadingList: true }))
    try {
      const params = new URLSearchParams()
      if (filterCategory && filterCategory !== '전체') params.set('category', filterCategory)
      if (filterTag && filterTag !== '전체') params.set('tag', filterTag)
      if (search.trim()) params.set('q', search.trim())
      params.set('page', String(page))
      params.set('limit', String(limit))
      const qs = params.toString() ? `?${params.toString()}` : ''
      const res = await fetch(`/api/admin/products${qs}`)
      const data = await res.json()
      if (res.ok) {
        setListState(prev => ({ 
          ...prev, 
          items: data.items || [], 
          total: typeof data.total === 'number' ? data.total : prev.total 
        }))
      }
    } finally {
      setUiState(prev => ({ ...prev, loadingList: false }))
    }
  }

  const removeItem = async (id: string) => {
    const ok = confirm('삭제하시겠습니까?')
    if (!ok) return
    const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setListState(prev => ({ ...prev, items: prev.items.filter((i) => i.id !== id) }))
    }
  }

  const toggleSoldOut = async (id: string, currentStock: number) => {
    const newStock = currentStock <= 0 ? 999 : 0
    const action = currentStock <= 0 ? '판매 재개' : '품절 처리'
    const ok = confirm(`${action}하시겠습니까?`)
    if (!ok) return
    
    const res = await fetch(`/api/admin/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock: newStock }),
    })
    
    if (res.ok) {
      setListState(prev => ({ 
        ...prev, 
        items: prev.items.map((i) => (i.id === id ? { ...i, stock: newStock } : i)) 
      }))
    }
  }

  const [editing, setEditing] = useState<any | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)

  const startEdit = (it: any) => {
    setEditing({ ...it })
  }

  const saveEdit = async () => {
    if (!editing) return
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/admin/products/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: editing.brand,
          name: editing.name,
          price: Number(editing.price),
          stock: Number(editing.stock),
          category: editing.category,
          unit: editing.unit,
          origin: editing.origin,
          discount_percent: editing.discount_percent === '' || editing.discount_percent === undefined ? null : Number(editing.discount_percent),
          is_new: editing.is_new || false,
          is_best: editing.is_best || false,
          is_sale: editing.is_sale || false,
          is_budget: editing.is_budget || false,
        }),
      })
      if (res.ok) {
        setListState((prev) => ({
          ...prev,
          items: prev.items.map((i) => (i.id === editing.id ? { ...i, ...editing } : i))
        }))
        setEditing(null)
      }
    } finally {
      setSavingEdit(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold">관리자 - 상품 등록</h1>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push('/admin/promotions')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
            >
              프로모션 관리
            </button>
            <button 
              onClick={() => router.push('/admin/orders')}
              className="px-4 py-2 bg-primary-800 text-white rounded-lg hover:bg-primary-900 transition text-sm font-medium"
            >
              주문 관리
            </button>
            <button onClick={logout} className="text-sm text-red-600 hover:underline">로그아웃</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">브랜드</label>
            <input name="brand" value={form.brand} onChange={handleChange} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">상품명</label>
            <input name="name" value={form.name} onChange={handleChange} className="w-full border rounded px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">설명</label>
            <textarea name="description" value={form.description} onChange={handleChange} className="w-full border rounded px-3 py-2" rows={3} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">가격(원)</label>
            <input name="price" type="number" value={form.price} onChange={handleChange} className="w-full border rounded px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">카테고리</label>
            <select name="category" value={form.category} onChange={handleChange} className="w-full border rounded px-3 py-2">
              {ADMIN_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">중량(g)</label>
              <input name="weight" type="number" value={form.weight} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">할인율(%)</label>
            <input name="discount_percent" type="number" min="0" max="100" value={form.discount_percent} onChange={handleChange} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">원산지</label>
            <input name="origin" value={form.origin} onChange={handleChange} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">이미지 URL</label>
            <input name="image_url" value={form.image_url} onChange={handleChange} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">이미지 업로드</label>
            <input ref={fileInputRef} type="file" accept="image/*" className="w-full" />
            <p className="text-xs text-gray-500 mt-1">파일을 선택하면 URL 대신 업로드가 사용됩니다.</p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-700">{message}</p>}
          <button type="submit" disabled={loading} className="w-full bg-primary-800 text-white py-2 rounded hover:bg-primary-900 disabled:opacity-60">
            {loading ? '등록 중...' : '상품 등록'}
          </button>
        </form>
        <hr className="my-6" />
        <div className="mb-4">
          <h2 className="text-md font-semibold mb-3">상품 목록</h2>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={(e)=>setListState(prev => ({ ...prev, search: e.target.value }))}
              onKeyDown={(e)=>{ if(e.key==='Enter'){ setListState(prev => ({ ...prev, page: 1 })); fetchList() } }}
              placeholder="상품명/설명 검색"
              className="border rounded px-2 py-1 text-sm"
            />
            <button onClick={()=>{ setListState(prev => ({ ...prev, page: 1 })); fetchList() }} className="text-sm px-2 py-1 border rounded">검색</button>
            
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">카테고리</label>
              <select className="border rounded px-2 py-1 text-sm" value={filterCategory} onChange={(e)=>{ setListState(prev => ({ ...prev, filterCategory: e.target.value, page: 1 })); }}>
                <option value="전체">전체</option>
                {ADMIN_CATEGORIES.map((c)=> (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">필터태그</label>
              <select className="border rounded px-2 py-1 text-sm" value={filterTag} onChange={(e)=>{ setListState(prev => ({ ...prev, filterTag: e.target.value, page: 1 })); }}>
                <option value="전체">전체</option>
                <option value="new">신상품</option>
                <option value="best">베스트</option>
                <option value="sale">전단행사</option>
                <option value="budget">알뜰상품</option>
              </select>
            </div>
          </div>
        </div>
        {loadingList ? (
          <p className="text-sm text-gray-500">불러오는 중...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-500">등록된 상품이 없습니다.</p>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">브랜드</th>
                  <th className="p-2 border">이름</th>
                  <th className="p-2 border">카테고리</th>
                  <th className="p-2 border">필터태그</th>
                  <th className="p-2 border">가격</th>
                  <th className="p-2 border">할인율(%)</th>
                  <th className="p-2 border">할인가</th>
                  <th className="p-2 border">판매상태</th>
                  <th className="p-2 border">작업</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const tags = []
                  if (it.is_new) tags.push('신상품')
                  if (it.is_best) tags.push('베스트')
                  if (it.is_sale) tags.push('전단행사')
                  if (it.is_budget) tags.push('알뜰상품')
                  
                  return (
                    <tr key={it.id}>
                      <td className="p-2 border">{it.brand || '-'}</td>
                      <td className="p-2 border">{it.name}</td>
                      <td className="p-2 border">{it.category}</td>
                      <td className="p-2 border">
                        {tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1 justify-center">
                            {tags.map((tag, idx) => (
                              <span 
                                key={idx} 
                                className="px-2 py-0.5 text-xs rounded bg-red-100 text-red-700"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="p-2 border">{Number(it.price).toLocaleString('ko-KR')}</td>
                      <td className="p-2 border">{it.discount_percent ?? '-'}</td>
                      <td className="p-2 border">{
                        it.discount_percent && it.discount_percent > 0
                          ? Math.round((Number(it.price) * (100 - Number(it.discount_percent))) / 100).toLocaleString('ko-KR')
                          : '-'
                      }</td>
                      <td className="p-2 border">
                        <div className="flex items-center justify-center">
                          <span className={`text-xs px-3 py-1 rounded font-medium ${
                            it.stock <= 0 
                              ? 'bg-red-100 text-red-600' 
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {it.stock <= 0 ? '품절' : '판매중'}
                          </span>
                        </div>
                      </td>
                      <td className="p-2 border text-center space-x-2">
                        <button 
                          onClick={() => toggleSoldOut(it.id, it.stock)} 
                          className={`text-xs px-3 py-1.5 rounded font-medium ${
                            it.stock <= 0 
                              ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          {it.stock <= 0 ? '판매재개' : '품절처리'}
                        </button>
                        <button onClick={() => startEdit(it)} className="text-blue-600 hover:underline text-sm">수정</button>
                        <button onClick={() => removeItem(it.id)} className="text-red-600 hover:underline text-sm">삭제</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {/* 페이지네이션 */}
          {total > 0 && (
            <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-600">
                총 <span className="font-semibold text-primary-900">{total}</span>개 상품
                {' | '}
                <span className="font-semibold text-primary-900">{Math.ceil(total / limit)}</span>페이지 중{' '}
                <span className="font-semibold text-primary-900">{page}</span>페이지
              </div>
              
              <div className="flex items-center gap-2">
                {/* 첫 페이지 */}
                <button
                  onClick={() => {
                    setListState(prev => ({ ...prev, page: 1 }))
                    setTimeout(fetchList, 0)
                  }}
                  disabled={page === 1}
                  className="px-3 py-2 border rounded text-sm font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  title="첫 페이지"
                >
                  «
                </button>

                {/* 이전 페이지 */}
                <button
                  onClick={() => {
                    setListState(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))
                    setTimeout(fetchList, 0)
                  }}
                  disabled={page === 1}
                  className="px-3 py-2 border rounded text-sm font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  title="이전 페이지"
                >
                  ‹
                </button>

                {/* 페이지 번호 표시 */}
                <div className="flex items-center gap-1">
                  {(() => {
                    const totalPages = Math.ceil(total / limit)
                    const pageNumbers = []
                    let startPage = Math.max(1, page - 2)
                    let endPage = Math.min(totalPages, page + 2)

                    // 항상 5개 페이지 보이도록 조정
                    if (endPage - startPage < 4) {
                      if (startPage === 1) {
                        endPage = Math.min(totalPages, startPage + 4)
                      } else if (endPage === totalPages) {
                        startPage = Math.max(1, endPage - 4)
                      }
                    }

                    for (let i = startPage; i <= endPage; i++) {
                      pageNumbers.push(
                        <button
                          key={i}
                          onClick={() => {
                            setListState(prev => ({ ...prev, page: i }))
                            setTimeout(fetchList, 0)
                          }}
                          className={`min-w-[36px] px-3 py-2 border rounded text-sm font-medium transition ${
                            page === i
                              ? 'bg-primary-800 text-white border-primary-800'
                              : 'hover:bg-gray-100'
                          }`}
                        >
                          {i}
                        </button>
                      )
                    }

                    return pageNumbers
                  })()}
                </div>

                {/* 다음 페이지 */}
                <button
                  onClick={() => {
                    const totalPages = Math.ceil(total / limit)
                    setListState(prev => ({ ...prev, page: Math.min(totalPages, prev.page + 1) }))
                    setTimeout(fetchList, 0)
                  }}
                  disabled={page >= Math.ceil(total / limit)}
                  className="px-3 py-2 border rounded text-sm font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  title="다음 페이지"
                >
                  ›
                </button>

                {/* 마지막 페이지 */}
                <button
                  onClick={() => {
                    const totalPages = Math.ceil(total / limit)
                    setListState(prev => ({ ...prev, page: totalPages }))
                    setTimeout(fetchList, 0)
                  }}
                  disabled={page >= Math.ceil(total / limit)}
                  className="px-3 py-2 border rounded text-sm font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  title="마지막 페이지"
                >
                  »
                </button>
              </div>
            </div>
          )}
          </>
        )}
        <ProductEditModal 
          editing={editing}
          setEditing={setEditing}
          saveEdit={saveEdit}
          savingEdit={savingEdit}
          allProducts={items}
        />
      </div>
    </div>
  )
}


