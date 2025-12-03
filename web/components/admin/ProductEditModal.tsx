'use client'

import { useRef, useState } from 'react'

interface ProductEditModalProps {
  editing: any
  setEditing: (value: any) => void
  saveEdit: () => Promise<void>
  savingEdit: boolean
  allProducts: any[]
}

const CATEGORIES = ['한우', '한돈', '수입육', '닭·오리', '가공육', '양념육', '과일·야채']

export default function ProductEditModal({ editing, setEditing, saveEdit, savingEdit, allProducts }: ProductEditModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  
  if (!editing) return null

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/upload-image', { method: 'POST', body: fd })
      const data = await res.json()
      
      if (!res.ok) {
        alert(data.error || '이미지 업로드 실패')
        return
      }
      
      setEditing({ ...editing, image_url: data.url })
    } catch (error) {
      console.error('이미지 업로드 실패:', error)
      alert('이미지 업로드에 실패했습니다.')
    } finally {
      setUploadingImage(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-4 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
          <h3 className="font-semibold mb-3">상품 수정</h3>
          <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">브랜드</label>
            <input 
              className="w-full border rounded px-3 py-2" 
              value={editing.brand || ''} 
              onChange={(e)=>setEditing({ ...editing, brand: e.target.value })} 
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">이름</label>
            <input 
              className="w-full border rounded px-3 py-2" 
              value={editing.name} 
              onChange={(e)=>setEditing({ ...editing, name: e.target.value })} 
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Slug (URL)</label>
            <input 
              className="w-full border rounded px-3 py-2" 
              value={editing.slug || ''} 
              onChange={(e)=>setEditing({ ...editing, slug: e.target.value })} 
              placeholder="비워두면 상품명에서 자동 생성"
            />
            <p className="text-xs text-gray-500 mt-1">예: hanwoo-daega-no9-premium</p>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">가격</label>
            <input 
              type="number" 
              className="w-full border rounded px-3 py-2" 
              value={editing.price} 
              onChange={(e)=>setEditing({ ...editing, price: e.target.value })} 
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">카테고리</label>
            <select 
              className="w-full border rounded px-3 py-2" 
              value={editing.category} 
              onChange={(e)=>setEditing({ ...editing, category: e.target.value })}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">무게 (그램, 선택사항)</label>
            <input 
              type="number" 
              min="0"
              className="w-full border rounded px-3 py-2" 
              value={editing.weight_gram || ''} 
              onChange={(e)=>setEditing({ ...editing, weight_gram: e.target.value })} 
              placeholder="예: 300, 700"
            />
            <p className="text-xs text-gray-500 mt-1">상품 무게를 그램 단위로 입력하세요</p>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">이미지 URL</label>
            <input 
              className="w-full border rounded px-3 py-2" 
              value={editing.image_url || ''} 
              onChange={(e)=>setEditing({ ...editing, image_url: e.target.value })} 
              placeholder="이미지 URL 또는 아래에서 업로드"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">이미지 업로드</label>
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload}
              className="w-full text-sm"
              disabled={uploadingImage}
            />
            {uploadingImage && (
              <p className="text-xs text-gray-500 mt-1">업로드 중...</p>
            )}
            <p className="text-xs text-gray-500 mt-1">파일을 선택하면 URL 대신 업로드가 사용됩니다.</p>
          </div>
        </div>
        <div className="flex justify-end space-x-2 mt-4">
          <button 
            onClick={()=>setEditing(null)} 
            className="px-3 py-2 text-sm hover:bg-gray-100 rounded"
          >
            취소
          </button>
          <button 
            onClick={saveEdit} 
            disabled={savingEdit} 
            className="px-3 py-2 text-sm bg-primary-800 text-white rounded disabled:opacity-60 hover:bg-primary-900"
          >
            {savingEdit ? '저장중...' : '저장'}
          </button>
        </div>
      </div>
    </div>

    </>
  )
}

