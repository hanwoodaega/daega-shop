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
          <div className="grid grid-cols-2 gap-3">
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
              <label className="block text-xs text-gray-600 mb-1">재고</label>
              <input 
                type="number" 
                className="w-full border rounded px-3 py-2" 
                value={editing.stock} 
                onChange={(e)=>setEditing({ ...editing, stock: e.target.value })} 
              />
            </div>
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
            <label className="block text-xs text-gray-600 mb-1">원산지</label>
            <input 
              className="w-full border rounded px-3 py-2" 
              value={editing.origin || ''} 
              onChange={(e)=>setEditing({ ...editing, origin: e.target.value })} 
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">할인율(%)</label>
            <input 
              type="number" 
              min={0} 
              max={100} 
              className="w-full border rounded px-3 py-2" 
              value={editing.discount_percent ?? ''} 
              onChange={(e)=>setEditing({ ...editing, discount_percent: e.target.value })} 
            />
          </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">상품 필터 태그 (중복 가능)</label>
                  <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center space-x-2 cursor-pointer p-2 border rounded hover:bg-gray-50">
                <input 
                  type="checkbox" 
                  checked={editing.is_new || false} 
                  onChange={(e)=>setEditing({ ...editing, is_new: e.target.checked })}
                  className="w-4 h-4 text-red-600 rounded"
                />
                <span className="text-sm font-medium">신상품</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer p-2 border rounded hover:bg-gray-50">
                <input 
                  type="checkbox" 
                  checked={editing.is_best || false} 
                  onChange={(e)=>setEditing({ ...editing, is_best: e.target.checked })}
                  className="w-4 h-4 text-red-600 rounded"
                />
                <span className="text-sm font-medium">베스트</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer p-2 border rounded hover:bg-gray-50">
                <input 
                  type="checkbox" 
                  checked={editing.is_sale || false} 
                  onChange={(e)=>setEditing({ ...editing, is_sale: e.target.checked })}
                  className="w-4 h-4 text-red-600 rounded"
                />
                <span className="text-sm font-medium">전단행사</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer p-2 border rounded hover:bg-gray-50">
                <input 
                  type="checkbox" 
                  checked={editing.is_budget || false} 
                  onChange={(e)=>setEditing({ ...editing, is_budget: e.target.checked })}
                  className="w-4 h-4 text-red-600 rounded"
                />
                <span className="text-sm font-medium">알뜰상품</span>
              </label>
            </div>
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

