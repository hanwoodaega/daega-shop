'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { formatPrice } from '@/lib/utils'

interface Banner {
  id: string
  title_black?: string | null
  title_red?: string | null
  description?: string | null
  image_url: string
  background_color: string
  is_active: boolean
  sort_order: number
  slug?: string | null
  created_at: string
  updated_at: string
}

interface BannerProduct {
  id: string
  product_id: string
  products: {
    id: string
    name: string
    price: number
    brand: string | null
    category: string
  }
}

interface Product {
  id: string
  name: string
  price: number
  brand: string | null
  category: string
}

export default function BannersPage() {
  const router = useRouter()
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const imageFileInputRef = useRef<HTMLInputElement>(null)
  const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null)
  const [bannerProducts, setBannerProducts] = useState<BannerProduct[]>([])
  const [showProductSelector, setShowProductSelector] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  const [formData, setFormData] = useState({
    title_black: '',
    title_red: '',
    description: '',
    image_url: '',
    background_color: '#FFFFFF',
    is_active: true,
    sort_order: 0,
    slug: '',
  })

  useEffect(() => {
    fetchBanners()
    fetchProducts()
  }, [])

  useEffect(() => {
    if (selectedBanner) {
      fetchBannerProducts(selectedBanner.id)
    }
  }, [selectedBanner])

  const fetchBanners = async () => {
    try {
      const res = await fetch('/api/admin/banners')
      const data = await res.json()
      if (res.ok) {
        setBanners(data.banners || [])
      } else {
        toast.error('배너 조회 실패')
      }
    } catch (error) {
      console.error('배너 조회 실패:', error)
      toast.error('배너 조회에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      title_black: '',
      title_red: '',
      description: '',
      image_url: '',
      background_color: '#FFFFFF',
      is_active: true,
      sort_order: 0,
      slug: '',
    })
    setEditingBanner(null)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/upload-banner-image', { method: 'POST', body: fd })
      const data = await res.json()
      
      if (!res.ok) {
        toast.error(data.error || '이미지 업로드 실패')
        return
      }
      
      setFormData({ ...formData, image_url: data.url })
      toast.success('이미지 업로드 완료')
    } catch (error) {
      console.error('이미지 업로드 실패:', error)
      toast.error('이미지 업로드에 실패했습니다.')
    } finally {
      setUploadingImage(false)
      if (imageFileInputRef.current) imageFileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.image_url) {
      toast.error('이미지 URL을 입력하세요')
      return
    }

    try {
      if (editingBanner) {
        const res = await fetch(`/api/admin/banners/${editingBanner.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        const data = await res.json()
        if (res.ok) {
          toast.success('배너가 수정되었습니다')
          setShowCreateModal(false)
          resetForm()
          fetchBanners()
        } else {
          toast.error(data.error || '배너 수정 실패')
        }
      } else {
        const res = await fetch('/api/admin/banners', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        const data = await res.json()
        if (res.ok) {
          toast.success('배너가 생성되었습니다')
          setShowCreateModal(false)
          resetForm()
          fetchBanners()
        } else {
          toast.error(data.error || '배너 생성 실패')
        }
      }
    } catch (error) {
      console.error('배너 저장 실패:', error)
      toast.error('배너 저장에 실패했습니다')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('배너를 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/admin/banners/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success('배너가 삭제되었습니다')
        fetchBanners()
      } else {
        const data = await res.json()
        toast.error(data.error || '배너 삭제 실패')
      }
    } catch (error) {
      console.error('배너 삭제 실패:', error)
      toast.error('배너 삭제에 실패했습니다')
    }
  }

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/admin/products?limit=1000')
      const data = await res.json()
      if (res.ok) {
        setProducts(data.items || [])
      }
    } catch (error) {
      console.error('상품 조회 실패:', error)
    }
  }

  const fetchBannerProducts = async (bannerId: string) => {
    try {
      const res = await fetch(`/api/admin/banners/${bannerId}/products`)
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      const data = await res.json()
      setBannerProducts(data.products || [])
    } catch (error) {
      console.error('배너 상품 조회 실패:', error)
      setBannerProducts([])
    }
  }

  const handleAddProducts = async () => {
    if (!selectedBanner || selectedProducts.length === 0) {
      toast.error('상품을 선택하세요')
      return
    }

    try {
      const res = await fetch(`/api/admin/banners/${selectedBanner.id}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_ids: selectedProducts }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('상품이 추가되었습니다')
        setShowProductSelector(false)
        setSelectedProducts([])
        fetchBannerProducts(selectedBanner.id)
      } else {
        toast.error(data.error || '상품 추가에 실패했습니다')
      }
    } catch (error) {
      console.error('상품 추가 실패:', error)
      toast.error('상품 추가에 실패했습니다')
    }
  }

  const handleRemoveProduct = async (productId: string) => {
    if (!selectedBanner) return
    if (!confirm('이 상품을 배너에서 제거하시겠습니까?')) return

    try {
      const res = await fetch(
        `/api/admin/banners/${selectedBanner.id}/products?product_id=${productId}`,
        { method: 'DELETE' }
      )

      if (res.ok) {
        toast.success('상품이 제거되었습니다')
        fetchBannerProducts(selectedBanner.id)
      } else {
        const data = await res.json()
        toast.error(data.error || '상품 제거에 실패했습니다')
      }
    } catch (error) {
      console.error('상품 제거 실패:', error)
      toast.error('상품 제거에 실패했습니다')
    }
  }

  const openEditModal = (banner: Banner) => {
    setEditingBanner(banner)
    setFormData({
      title_black: banner.title_black || '',
      title_red: banner.title_red || '',
      description: banner.description || '',
      image_url: banner.image_url,
      background_color: banner.background_color,
      is_active: banner.is_active,
      sort_order: banner.sort_order,
      slug: banner.slug || '',
    })
    setShowCreateModal(true)
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
            <h1 className="text-2xl font-bold text-gray-900">배너 관리</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                resetForm()
                setShowCreateModal(true)
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              새 배너
            </button>
            <button
              onClick={() => router.push('/admin')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              관리자 홈
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 배너 목록 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="text-lg font-bold mb-4">배너 목록</h2>
              {loading ? (
                <div className="text-center py-8">로딩 중...</div>
              ) : banners.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  배너가 없습니다
                </div>
              ) : (
                <div className="space-y-2">
                  {banners.map((banner) => (
                    <div
                      key={banner.id}
                      onClick={() => setSelectedBanner(banner)}
                      className={`p-3 rounded-lg cursor-pointer transition ${
                        selectedBanner?.id === banner.id
                          ? 'bg-blue-100 border-2 border-blue-500'
                          : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-1 rounded ${banner.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                              {banner.is_active ? '활성' : '비활성'}
                            </span>
                            <span className="text-xs text-gray-500">순서: {banner.sort_order}</span>
                          </div>
                          {banner.title_black && (
                            <h3 className="font-medium text-sm text-black line-clamp-1">{banner.title_black}</h3>
                          )}
                          {banner.title_red && (
                            <h3 className="font-medium text-sm text-red-600 line-clamp-1">{banner.title_red}</h3>
                          )}
                          {!banner.title_black && !banner.title_red && (
                            <h3 className="font-medium text-sm text-gray-400">타이틀 없음</h3>
                          )}
                          {banner.slug && (
                            <p className="text-xs text-blue-600 mt-1">/{banner.slug}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 배너 상세 */}
          <div className="lg:col-span-2">
            {selectedBanner ? (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    {selectedBanner.title_black && (
                      <h2 className="text-xl font-bold text-black mb-1">{selectedBanner.title_black}</h2>
                    )}
                    {selectedBanner.title_red && (
                      <h2 className="text-xl font-bold text-red-600 mb-1">{selectedBanner.title_red}</h2>
                    )}
                    {selectedBanner.description && (
                      <p className="text-sm text-gray-500 mb-1">{selectedBanner.description}</p>
                    )}
                    {selectedBanner.slug && (
                      <p className="text-xs text-blue-600 mb-1">/{selectedBanner.slug}</p>
                    )}
                    <p className="text-xs text-gray-400">순서: {selectedBanner.sort_order}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(selectedBanner)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(selectedBanner.id)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200"
                    >
                      삭제
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <button
                    onClick={() => setShowProductSelector(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    + 상품 추가
                  </button>
                </div>

                <div>
                  <h3 className="font-medium mb-3">
                    포함된 상품 ({bannerProducts.length}개)
                  </h3>
                  {bannerProducts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      상품이 없습니다
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {bannerProducts.map((bp) => {
                        const product = Array.isArray(bp.products) ? bp.products[0] : bp.products
                        return product ? (
                          <div
                            key={bp.id}
                            className="flex flex-col gap-2 p-3 border rounded-lg"
                          >
                            <div className="flex items-center justify-end">
                              <button
                                onClick={() => handleRemoveProduct(bp.product_id)}
                                className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                              >
                                제거
                              </button>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm line-clamp-2">{product.name}</p>
                              <p className="text-xs text-gray-600 mt-1">
                                {product.brand && `${product.brand} · `}
                                {formatPrice(product.price)}원
                              </p>
                            </div>
                          </div>
                        ) : null
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <p className="text-gray-500">배너를 선택하세요</p>
              </div>
            )}
          </div>
        </div>

        {/* 상품 선택 모달 */}
        {showProductSelector && selectedBanner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white">
                <h2 className="text-xl font-bold">상품 선택</h2>
                <button
                  onClick={() => {
                    setShowProductSelector(false)
                    setSelectedProducts([])
                    setSearchQuery('')
                  }}
                  className="text-2xl text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="p-6">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="상품 검색..."
                  className="w-full px-4 py-2 border rounded-lg mb-4"
                />

                <div className="max-h-96 overflow-y-auto space-y-2">
                  {products
                    .filter((p) => {
                      const query = searchQuery.toLowerCase()
                      return (
                        p.name.toLowerCase().includes(query) ||
                        p.brand?.toLowerCase().includes(query) ||
                        p.category.toLowerCase().includes(query)
                      )
                    })
                    .filter((p) => !bannerProducts.some((bp) => bp.product_id === p.id))
                    .map((product) => (
                      <label
                        key={product.id}
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProducts([...selectedProducts, product.id])
                            } else {
                              setSelectedProducts(selectedProducts.filter((id) => id !== product.id))
                            }
                          }}
                          className="w-5 h-5"
                        />
                        <div className="flex-1">
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-gray-500">
                            {product.brand && `${product.brand} · `}
                            {formatPrice(product.price)}원
                          </div>
                        </div>
                      </label>
                    ))}
                </div>

                <div className="flex gap-2 pt-4 border-t mt-4">
                  <button
                    onClick={handleAddProducts}
                    disabled={selectedProducts.length === 0}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    추가 ({selectedProducts.length})
                  </button>
                  <button
                    onClick={() => {
                      setShowProductSelector(false)
                      setSelectedProducts([])
                      setSearchQuery('')
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 생성/수정 모달 */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white">
                <h2 className="text-xl font-bold">
                  {editingBanner ? '배너 수정' : '새 배너 만들기'}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    resetForm()
                  }}
                  className="text-2xl text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">검정색 제목 (선택, 줄바꿈 가능)</label>
                  <textarea
                    value={formData.title_black}
                    onChange={(e) => setFormData({ ...formData, title_black: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="검정색 제목 (Enter로 줄바꿈)"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">빨강색 제목 (선택, 줄바꿈 가능)</label>
                  <textarea
                    value={formData.title_red}
                    onChange={(e) => setFormData({ ...formData, title_red: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="빨강색 제목 (Enter로 줄바꿈)"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">설명 (선택)</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="설명 문구"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    이미지 URL <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="file"
                        ref={imageFileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => imageFileInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {uploadingImage ? '업로드 중...' : '이미지 업로드'}
                      </button>
                    </div>
                    <input
                      type="text"
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="이미지 URL을 입력하거나 업로드하세요"
                      required
                    />
                    {formData.image_url && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 mb-1">미리보기:</p>
                        <div className="relative w-full aspect-square max-w-xs border rounded-lg overflow-hidden bg-gray-100">
                          <img
                            src={formData.image_url}
                            alt="미리보기"
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">배경색</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.background_color}
                      onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                      className="w-16 h-10 border rounded"
                    />
                    <input
                      type="text"
                      value={formData.background_color}
                      onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                      className="flex-1 px-3 py-2 border rounded-lg"
                      placeholder="#FFFFFF"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">링크 (slug, 선택)</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="예: best, sale, new-arrivals"
                  />
                  <p className="text-xs text-gray-500 mt-1">배너 클릭 시 이동할 페이지 경로 (예: best 입력 시 /banner/best로 이동)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">순서</label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">낮은 숫자부터 표시됩니다</p>
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-5 h-5 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium">활성화</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">비활성화된 배너는 메인 페이지에 표시되지 않습니다</p>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingBanner ? '수정' : '생성'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false)
                      resetForm()
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    취소
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

