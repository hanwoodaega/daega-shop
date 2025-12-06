'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

interface ProductEditModalProps {
  editing: any
  setEditing: (value: any) => void
  saveEdit: () => Promise<void>
  savingEdit: boolean
  allProducts: any[]
}

interface ProductImage {
  id: string
  product_id: string
  image_url: string
  priority: number
  created_at: string
}

const CATEGORIES = ['한우', '한돈', '수입육', '닭·오리', '가공육', '양념육', '과일·야채']

export default function ProductEditModal({ editing, setEditing, saveEdit, savingEdit, allProducts }: ProductEditModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [productImages, setProductImages] = useState<ProductImage[]>([])
  const [loadingImages, setLoadingImages] = useState(false)

  const fetchProductImages = useCallback(async () => {
    if (!editing?.id) return
    setLoadingImages(true)
    try {
      const res = await fetch(`/api/admin/products/${editing.id}/images`)
      const data = await res.json()
      if (res.ok) {
        setProductImages(data.images || [])
      }
    } catch (error) {
      console.error('이미지 목록 조회 실패:', error)
    } finally {
      setLoadingImages(false)
    }
  }, [editing?.id])

  // 상품 이미지 목록 불러오기
  useEffect(() => {
    if (editing?.id) {
      fetchProductImages()
    }
  }, [editing?.id, fetchProductImages])

  if (!editing) return null

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editing?.id) return

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
      
      // product_images 테이블에 추가
      const addRes = await fetch(`/api/admin/products/${editing.id}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: data.url }),
      })
      
      if (addRes.ok) {
        await fetchProductImages()
        if (fileInputRef.current) fileInputRef.current.value = ''
      } else {
        const addData = await addRes.json()
        alert(addData.error || '이미지 추가 실패')
      }
    } catch (error) {
      console.error('이미지 업로드 실패:', error)
      alert('이미지 업로드에 실패했습니다.')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleDeleteImage = async (imageId: string) => {
    if (!editing?.id || !confirm('이미지를 삭제하시겠습니까?')) return
    
    try {
      const res = await fetch(`/api/admin/products/${editing.id}/images/${imageId}`, {
        method: 'DELETE',
      })
      
      if (res.ok) {
        await fetchProductImages()
      } else {
        const data = await res.json()
        alert(data.error || '이미지 삭제 실패')
      }
    } catch (error) {
      console.error('이미지 삭제 실패:', error)
      alert('이미지 삭제에 실패했습니다.')
    }
  }

  const handlePriorityChange = async (imageId: string, newPriority: number) => {
    if (!editing?.id) return
    
    try {
      const res = await fetch(`/api/admin/products/${editing.id}/images/${imageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      })
      
      if (res.ok) {
        await fetchProductImages()
      } else {
        const data = await res.json()
        alert(data.error || '우선순위 변경 실패')
      }
    } catch (error) {
      console.error('우선순위 변경 실패:', error)
      alert('우선순위 변경에 실패했습니다.')
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
              step="1"
              className="w-full border rounded px-3 py-2" 
              value={editing.weight_gram || ''} 
              onChange={(e)=>setEditing({ ...editing, weight_gram: e.target.value })} 
              placeholder="예: 300, 700"
            />
            <p className="text-xs text-gray-500 mt-1">상품 무게를 그램 단위로 입력하세요</p>
          </div>
          <div className="border-t pt-3 mt-3">
            <label className="block text-xs text-gray-600 mb-2 font-semibold">상품 이미지 관리</label>
            <div className="mb-2">
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload}
                className="w-full text-sm border rounded px-3 py-2"
                disabled={uploadingImage}
              />
              {uploadingImage && (
                <p className="text-xs text-gray-500 mt-1">업로드 중... (1:1 비율로 자동 압축됩니다)</p>
              )}
              <p className="text-xs text-gray-500 mt-1">이미지는 1:1 비율로 자동 압축됩니다.</p>
            </div>
            
            {loadingImages ? (
              <p className="text-xs text-gray-500">이미지 목록 불러오는 중...</p>
            ) : productImages.length === 0 ? (
              <p className="text-xs text-gray-500">등록된 이미지가 없습니다.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {productImages
                  .sort((a, b) => a.priority - b.priority)
                  .map((img, index) => (
                    <div key={img.id} className="flex items-center gap-2 p-2 border rounded">
                      <img 
                        src={img.image_url} 
                        alt={`상품 이미지 ${index + 1}`}
                        className="w-16 h-16 object-cover rounded"
                      />
                      <div className="flex-1">
                        <div className="text-xs text-gray-600 mb-1">
                          우선순위: {img.priority} {img.priority === 0 && <span className="text-green-600">(메인 이미지)</span>}
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handlePriorityChange(img.id, Math.max(0, img.priority - 1))}
                            className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                            disabled={img.priority === 0}
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => handlePriorityChange(img.id, img.priority + 1)}
                            className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => handleDeleteImage(img.id)}
                            className="text-xs px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
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

