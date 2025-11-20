'use client'

interface ProductEditModalProps {
  editing: any
  setEditing: (value: any) => void
  saveEdit: () => Promise<void>
  savingEdit: boolean
  allProducts: any[]
}

const CATEGORIES = ['한우', '돼지고기', '수입육', '닭', '가공육', '조리육', '야채']

export default function ProductEditModal({ editing, setEditing, saveEdit, savingEdit, allProducts }: ProductEditModalProps) {
  if (!editing) return null

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

