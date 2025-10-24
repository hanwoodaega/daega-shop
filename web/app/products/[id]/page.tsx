'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { supabase, Product } from '@/lib/supabase'
import { useCartStore } from '@/lib/store'

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const productId = params.id as string
  
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const addItem = useCartStore((state) => state.addItem)

  useEffect(() => {
    fetchProduct()
  }, [productId])

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single()
      
      if (error) throw error
      setProduct(data)
    } catch (error) {
      console.error('상품 조회 실패:', error)
      alert('상품을 찾을 수 없습니다.')
      router.push('/products')
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = () => {
    if (!product) return
    
    if (product.stock <= 0) {
      alert('품절된 상품입니다.')
      return
    }

    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity,
      imageUrl: product.image_url,
      unit: product.unit,
    })

    alert('장바구니에 추가되었습니다.')
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-800"></div>
        </div>
        <Footer />
      </div>
    )
  }

  if (!product) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* 상품 이미지 */}
          <div className="bg-gray-200 rounded-lg overflow-hidden">
            <img
              src={product.image_url || 'https://via.placeholder.com/600x600?text=상품이미지'}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* 상품 정보 */}
          <div>
            <div className="text-sm text-primary-700 font-semibold mb-2">
              {product.category}
            </div>
            <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
            
            <div className="border-t border-b py-4 mb-6">
              <div className="flex items-baseline mb-2">
                <span className="text-4xl font-bold text-gray-900">
                  {formatPrice(product.price)}
                </span>
                <span className="text-xl text-gray-600 ml-2">원</span>
                <span className="text-gray-500 ml-2">
                  / {product.unit}
                </span>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">상품 정보</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                {product.description}
              </p>
              <ul className="space-y-2 text-gray-700">
                <li className="flex">
                  <span className="font-medium w-24">원산지:</span>
                  <span>{product.origin}</span>
                </li>
                <li className="flex">
                  <span className="font-medium w-24">중량:</span>
                  <span>{product.weight} {product.unit}</span>
                </li>
                <li className="flex">
                  <span className="font-medium w-24">재고:</span>
                  <span className={product.stock > 0 ? 'text-green-600' : 'text-red-600'}>
                    {product.stock > 0 ? `${product.stock}개 재고 있음` : '품절'}
                  </span>
                </li>
              </ul>
            </div>

            {/* 수량 선택 */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">수량</label>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-lg border border-gray-300 hover:bg-gray-100"
                >
                  -
                </button>
                <span className="text-xl font-semibold w-12 text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 rounded-lg border border-gray-300 hover:bg-gray-100"
                >
                  +
                </button>
              </div>
            </div>

            {/* 총 금액 */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium">총 금액</span>
                <div className="text-right">
                  <span className="text-3xl font-bold text-primary-900">
                    {formatPrice(product.price * quantity)}
                  </span>
                  <span className="text-gray-600 ml-1">원</span>
                </div>
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex space-x-4">
              <button
                onClick={handleAddToCart}
                disabled={product.stock <= 0}
                className="flex-1 bg-primary-800 text-white py-4 rounded-lg font-semibold text-lg hover:bg-primary-900 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {product.stock > 0 ? '장바구니 담기' : '품절'}
              </button>
              <button
                onClick={() => {
                  handleAddToCart()
                  router.push('/cart')
                }}
                disabled={product.stock <= 0}
                className="flex-1 bg-gray-900 text-white py-4 rounded-lg font-semibold text-lg hover:bg-gray-800 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                바로 구매
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

