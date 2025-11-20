'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import ProductEditModal from '@/components/admin/ProductEditModal'
import { ADMIN_CATEGORIES } from '@/lib/constants'

const DEFAULT_STOCK = 999

const INITIAL_FORM_STATE = {
  brand: '',
  name: '',
  slug: '',
  price: '',
  image_url: '',
  category: ADMIN_CATEGORIES[0],
}

export default function AdminProductManagementPage() {
  const router = useRouter()
  
  const [form, setForm] = useState({ ...INITIAL_FORM_STATE })
  
  const [uiState, setUiState] = useState({
    message: null as string | null,
    error: null as string | null,
    loading: false,
    loadingList: false,
  })
  
  const [listState, setListState] = useState({
    items: [] as any[],
    filterCategory: '전체',
    filterTag: '전체',
    search: '',
    page: 1,
    total: 0,
  })
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const closeCreateModal = () => {
    setIsCreateOpen(false)
    setForm({ ...INITIAL_FORM_STATE })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }
  
  const limit = 20
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const { message, error, loading, loadingList } = uiState
  const { items, filterCategory, filterTag, search, page, total } = listState

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
        slug: form.slug.trim() || null, // slug가 비어있으면 서버에서 자동 생성
        price: Number(form.price),
        image_url: imageUrl,
        category: form.category,
        stock: DEFAULT_STOCK,
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
      setForm({ ...INITIAL_FORM_STATE })
      if (fileInputRef.current) fileInputRef.current.value = ''
      await fetchList()
      closeCreateModal()
    } catch (error) {
      console.error('상품 등록 실패:', error)
      setUiState(prev => ({ ...prev, error: '상품 등록에 실패했습니다.', loading: false }))
    }
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
      setUiState(prev => ({ ...prev, message: '상품이 삭제되었습니다.' }))
      const t = window.setTimeout(() => setUiState(prev => ({ ...prev, message: null })), 3000)
      ;(removeItem as any).__timeouts ??= []
      ;(removeItem as any).__timeouts.push(t)
    } else {
      const data = await res.json().catch(() => ({ error: '삭제 실패' }))
      alert(data.error || '삭제에 실패했습니다.')
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
          slug: editing.slug?.trim() || null,
          price: Number(editing.price),
          stock: Number(editing.stock),
          category: editing.category,
          is_best: editing.is_best || false,
          is_sale: editing.is_sale || false,
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

  useEffect(() => {
    return () => {
      const arr: number[] = ((removeItem as any).__timeouts || []) as number[]
      arr.forEach((id) => clearTimeout(id))
      ;(removeItem as any).__timeouts = []
    }
  }, [])

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-neutral-500">관리자 대시보드</p>
            <h1 className="text-xl font-semibold text-neutral-900">상품 관리</h1>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="text-sm text-primary-800 hover:text-primary-900 font-medium"
          >
            ← 대시보드로 돌아가기
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm text-neutral-500">Operations</p>
              <h2 className="text-lg font-semibold text-neutral-900">상품 목록 관리</h2>
              <p className="text-sm text-neutral-500 mt-1">상품 추가 버튼을 눌러 새 상품을 등록하세요.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => router.push('/admin/products/import')}
                className="px-4 py-2 rounded-lg border border-neutral-300 text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
              >
                CSV 업로드 (준비중)
              </button>
              <button
                onClick={() => {
                  setForm({ ...INITIAL_FORM_STATE })
                  setIsCreateOpen(true)
                }}
                className="px-4 py-2 rounded-lg bg-primary-800 text-white text-sm font-semibold hover:bg-primary-900"
              >
                상품 추가
              </button>
            </div>
          </div>
          {(error || message) && (
            <div className="mt-4 space-y-2">
              {error && <p className="text-sm text-red-600">{error}</p>}
              {message && <p className="text-sm text-green-700">{message}</p>}
            </div>
          )}
          <p className="mt-4 text-xs text-neutral-400">
            재고 입력 없이 등록되며, 목록의 “품절처리/판매재개” 버튼으로 상태를 직접 전환할 수 있습니다.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <p className="text-sm text-neutral-500">상품 목록</p>
              <h2 className="text-lg font-semibold text-neutral-900">등록된 상품</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <input
                value={search}
                onChange={(e)=>setListState(prev => ({ ...prev, search: e.target.value }))}
                onKeyDown={(e)=>{ if(e.key==='Enter'){ setListState(prev => ({ ...prev, page: 1 })); fetchList() } }}
                placeholder="상품명/설명 검색"
                className="border rounded-lg px-3 py-2 text-sm"
              />
              <button onClick={()=>{ setListState(prev => ({ ...prev, page: 1 })); fetchList() }} className="text-sm px-3 py-2 border rounded-lg">
                검색
              </button>
              <select className="border rounded-lg px-3 py-2 text-sm" value={filterCategory} onChange={(e)=>{ setListState(prev => ({ ...prev, filterCategory: e.target.value, page: 1 })); }}>
                <option value="전체">전체 카테고리</option>
                {ADMIN_CATEGORIES.map((c)=> (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select className="border rounded-lg px-3 py-2 text-sm" value={filterTag} onChange={(e)=>{ setListState(prev => ({ ...prev, filterTag: e.target.value, page: 1 })); }}>
                <option value="전체">전체 태그</option>
                <option value="new">신상품</option>
                <option value="best">베스트</option>
                <option value="sale">전단행사</option>
                <option value="budget">알뜰상품</option>
              </select>
            </div>
          </div>

          {loadingList ? (
            <p className="text-sm text-neutral-500">불러오는 중...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-neutral-500">등록된 상품이 없습니다.</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-neutral-100">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50 text-neutral-500">
                    <tr>
                      <th className="p-3 text-left">상품명</th>
                      <th className="p-3 text-left">카테고리</th>
                      <th className="p-3 text-left">태그</th>
                      <th className="p-3 text-right">가격</th>
                      <th className="p-3 text-center">작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => {
                      const isSoldOut = it.stock <= 0
                      const tags = []
                      if (it.is_best) tags.push('베스트')
                      if (it.is_sale) tags.push('전단행사')
                      
                      return (
                        <tr key={it.id} className="border-t border-neutral-100">
                          <td className="p-3">
                            <div className={`font-medium ${isSoldOut ? 'text-red-600' : 'text-neutral-900'}`}>
                              {it.name}
                              {isSoldOut && <span className="ml-2 text-xs font-semibold text-red-500">(품절)</span>}
                            </div>
                            <p className="text-xs text-neutral-500">{it.brand || '브랜드미지정'}</p>
                          </td>
                          <td className="p-3 text-neutral-600">{it.category}</td>
                          <td className="p-3">
                            {tags.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {tags.map((tag, idx) => (
                                  <span 
                                    key={idx} 
                                    className="px-2 py-0.5 text-xs rounded-full bg-primary-50 text-primary-700"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-neutral-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="p-3 text-right">{Number(it.price).toLocaleString('ko-KR')}원</td>
                          <td className="p-3 text-center space-x-2">
                            <button 
                              onClick={() => toggleSoldOut(it.id, it.stock)} 
                              className="text-xs text-primary-800 hover:underline"
                            >
                              {isSoldOut ? '판매재개' : '품절처리'}
                            </button>
                            <button 
                              onClick={() => startEdit(it)} 
                              className="text-xs text-neutral-500 hover:underline"
                            >
                              수정
                            </button>
                            <button 
                              onClick={() => removeItem(it.id)} 
                              className="text-xs text-red-600 hover:underline"
                            >
                              삭제
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {total > 0 && (
                <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-neutral-500">
                  <div>
                    총 <span className="text-neutral-900 font-semibold">{total}</span>개 상품 /{' '}
                    <span className="text-neutral-900 font-semibold">{page}</span> / {Math.ceil(total / limit)}페이지
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setListState(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))
                        setTimeout(fetchList, 0)
                      }}
                      disabled={page === 1}
                      className="px-3 py-2 border rounded-lg text-sm hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      이전
                    </button>
                    <button
                      onClick={() => {
                        const totalPages = Math.ceil(total / limit)
                        setListState(prev => ({ ...prev, page: Math.min(totalPages, prev.page + 1) }))
                        setTimeout(fetchList, 0)
                      }}
                      disabled={page >= Math.ceil(total / limit)}
                      className="px-3 py-2 border rounded-lg text-sm hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      다음
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-full overflow-y-auto shadow-2xl">
            <div className="flex items-start justify-between px-6 py-4 border-b border-neutral-200">
              <div>
                <p className="text-xs text-neutral-500">새 상품 등록</p>
                <h3 className="text-lg font-semibold text-neutral-900">상품 정보를 입력하세요</h3>
              </div>
              <button
                onClick={closeCreateModal}
                className="text-sm text-neutral-500 hover:text-neutral-800"
              >
                닫기 ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-neutral-600">브랜드</label>
                  <input name="brand" value={form.brand} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-neutral-600">상품명 *</label>
                  <input name="name" value={form.name} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-neutral-600">Slug (URL)</label>
                  <input 
                    name="slug" 
                    value={form.slug} 
                    onChange={handleChange} 
                    className="w-full border rounded-lg px-3 py-2 text-sm" 
                    placeholder="자동 생성 (비워두면 상품명에서 자동 생성)"
                  />
                  <p className="text-xs text-neutral-500 mt-1">예: hanwoo-daega-no9-premium</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-neutral-600">가격(원) *</label>
                  <input name="price" type="number" value={form.price} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-neutral-600">카테고리 *</label>
                  <select name="category" value={form.category} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm">
                    {ADMIN_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/80 px-3 py-4 text-sm text-neutral-600">
                  <p className="font-semibold text-neutral-700 mb-1">재고 입력 없이 운영합니다.</p>
                  <p>등록 후 목록에서 “품절처리/판매재개” 버튼으로 상태를 직접 전환하세요.</p>
                  <p className="text-xs text-neutral-500 mt-1">타임딜 재고는 타임딜 메뉴에서 별도로 관리됩니다.</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-neutral-600">이미지 URL</label>
                  <input name="image_url" value={form.image_url} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-neutral-600">이미지 업로드</label>
                  <input ref={fileInputRef} type="file" accept="image/*" className="w-full text-sm" />
                  <p className="text-xs text-neutral-500 mt-1">파일을 선택하면 URL 대신 업로드가 사용됩니다.</p>
                </div>
              </div>
              <div className="md:col-span-2 flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-neutral-600 hover:bg-neutral-100"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-lg bg-primary-800 text-white text-sm font-semibold hover:bg-primary-900 disabled:opacity-60"
                >
                  {loading ? '등록 중...' : '상품 등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ProductEditModal 
        editing={editing}
        setEditing={setEditing}
        saveEdit={saveEdit}
        savingEdit={savingEdit}
        allProducts={items}
      />
    </div>
  )
}

