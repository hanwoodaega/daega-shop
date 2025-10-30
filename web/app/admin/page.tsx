'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const CATEGORIES = ['한우', '돼지고기', '수입육', '닭', '가공육', '조리육', '야채']

export default function AdminPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    brand: '',
    name: '',
    description: '',
    price: '',
    image_url: '',
    category: CATEGORIES[0],
    stock: '0',
    unit: '1팩',
    weight: '0',
    origin: '국내산',
    discount_percent: '',
  })
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<any[]>([])
  const [filterCategory, setFilterCategory] = useState<string>('전체')
  const [loadingList, setLoadingList] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [limit] = useState(20)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setError(null)
    setLoading(true)
    try {
      let imageUrl = form.image_url.trim()
      const file = fileInputRef.current?.files?.[0]
      if (file) {
        const fd = new FormData()
        fd.append('file', file)
        const up = await fetch('/api/admin/upload-image', { method: 'POST', body: fd })
        const upData = await up.json()
        if (!up.ok) {
          setError(upData.error || '이미지 업로드 실패')
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
        setError(data.error || '등록에 실패했습니다.')
        return
      }
      setMessage('상품이 등록되었습니다.')
      setForm({ ...form, brand: '', name: '', description: '', price: '', image_url: '', stock: '0', weight: '0', discount_percent: '' })
      if (fileInputRef.current) fileInputRef.current.value = ''
      await fetchList()
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.replace('/admin/login')
  }

  const fetchList = async () => {
    setLoadingList(true)
    try {
      const params = new URLSearchParams()
      if (filterCategory && filterCategory !== '전체') params.set('category', filterCategory)
      if (search.trim()) params.set('q', search.trim())
      params.set('page', String(page))
      params.set('limit', String(limit))
      const qs = params.toString() ? `?${params.toString()}` : ''
      const res = await fetch(`/api/admin/products${qs}`)
      const data = await res.json()
      if (res.ok) {
        setItems(data.items || [])
        if (typeof data.total === 'number') setTotal(data.total)
      }
    } finally {
      setLoadingList(false)
    }
  }

  const removeItem = async (id: string) => {
    const ok = confirm('삭제하시겠습니까?')
    if (!ok) return
    const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== id))
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
        }),
      })
      if (res.ok) {
        setItems((prev) => prev.map((i) => (i.id === editing.id ? { ...i, ...editing } : i)))
        setEditing(null)
      }
    } finally {
      setSavingEdit(false)
    }
  }

  useEffect(() => {
    fetchList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCategory, page])

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold">관리자 - 상품 등록</h1>
          <button onClick={logout} className="text-sm text-red-600 hover:underline">로그아웃</button>
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">가격(원)</label>
              <input name="price" type="number" value={form.price} onChange={handleChange} className="w-full border rounded px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">재고</label>
              <input name="stock" type="number" value={form.stock} onChange={handleChange} className="w-full border rounded px-3 py-2" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">카테고리</label>
            <select name="category" value={form.category} onChange={handleChange} className="w-full border rounded px-3 py-2">
              {CATEGORIES.map((c) => (
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
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-md font-semibold">상품 목록</h2>
          <div className="flex items-center space-x-2">
            <input
              value={search}
              onChange={(e)=>setSearch(e.target.value)}
              onKeyDown={(e)=>{ if(e.key==='Enter'){ setPage(1); fetchList() } }}
              placeholder="상품명/설명 검색"
              className="border rounded px-2 py-1 text-sm"
            />
            <button onClick={()=>{ setPage(1); fetchList() }} className="text-sm px-2 py-1 border rounded">검색</button>
            <label className="text-sm text-gray-600">카테고리</label>
            <select className="border rounded px-2 py-1 text-sm" value={filterCategory} onChange={(e)=>{ setFilterCategory(e.target.value); setPage(1); }}>
              <option value="전체">전체</option>
              {CATEGORIES.map((c)=> (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
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
                  <th className="p-2 border">가격</th>
                  <th className="p-2 border">할인율(%)</th>
                  <th className="p-2 border">할인가</th>
                  <th className="p-2 border">재고</th>
                  <th className="p-2 border">작업</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id}>
                    <td className="p-2 border">{it.brand || '-'}</td>
                    <td className="p-2 border">{it.name}</td>
                    <td className="p-2 border">{it.category}</td>
                    <td className="p-2 border">{Number(it.price).toLocaleString('ko-KR')}</td>
                    <td className="p-2 border">{it.discount_percent ?? '-'}</td>
                    <td className="p-2 border">{
                      it.discount_percent && it.discount_percent > 0
                        ? Math.round((Number(it.price) * (100 - Number(it.discount_percent))) / 100).toLocaleString('ko-KR')
                        : '-'
                    }</td>
                    <td className="p-2 border">{it.stock}</td>
                    <td className="p-2 border text-right space-x-3">
                      <button onClick={() => startEdit(it)} className="text-blue-600 hover:underline">수정</button>
                      <button onClick={() => removeItem(it.id)} className="text-red-600 hover:underline">삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-3 text-sm">
            <span className="text-gray-600">총 {total}개</span>
            <div className="space-x-2">
              <button disabled={page<=1} onClick={()=>setPage((p)=>Math.max(1,p-1))} className="px-2 py-1 border rounded disabled:opacity-50">이전</button>
              <button disabled={(page*limit)>=total} onClick={()=>setPage((p)=>p+1)} className="px-2 py-1 border rounded disabled:opacity-50">다음</button>
            </div>
          </div>
          </>
        )}
        {editing && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-4 w-full max-w-md shadow">
              <h3 className="font-semibold mb-3">상품 수정</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">브랜드</label>
                  <input className="w-full border rounded px-3 py-2" value={editing.brand || ''} onChange={(e)=>setEditing({ ...editing, brand: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">이름</label>
                  <input className="w-full border rounded px-3 py-2" value={editing.name} onChange={(e)=>setEditing({ ...editing, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">가격</label>
                    <input type="number" className="w-full border rounded px-3 py-2" value={editing.price} onChange={(e)=>setEditing({ ...editing, price: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">재고</label>
                    <input type="number" className="w-full border rounded px-3 py-2" value={editing.stock} onChange={(e)=>setEditing({ ...editing, stock: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">카테고리</label>
                  <select className="w-full border rounded px-3 py-2" value={editing.category} onChange={(e)=>setEditing({ ...editing, category: e.target.value })}>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">원산지</label>
                    <input className="w-full border rounded px-3 py-2" value={editing.origin || ''} onChange={(e)=>setEditing({ ...editing, origin: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">할인율(%)</label>
                  <input type="number" min={0} max={100} className="w-full border rounded px-3 py-2" value={editing.discount_percent ?? ''} onChange={(e)=>setEditing({ ...editing, discount_percent: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <button onClick={()=>setEditing(null)} className="px-3 py-2 text-sm">취소</button>
                <button onClick={saveEdit} disabled={savingEdit} className="px-3 py-2 text-sm bg-primary-800 text-white rounded disabled:opacity-60">{savingEdit ? '저장중...' : '저장'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


