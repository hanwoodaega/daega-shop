import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        {/* 히어로 섹션 */}
        <section className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-20">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-5xl font-bold mb-6">
              대가 정육백화점
            </h1>
            <p className="text-xl mb-8 text-primary-100">
              최고급 한우와 신선한 정육을 합리적인 가격으로
            </p>
            <Link href="/products">
              <button className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold text-lg hover:bg-gray-100 transition">
                상품 둘러보기
              </button>
            </Link>
          </div>
        </section>

        {/* 특징 섹션 */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">왜 대가를 선택해야 할까요?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-md text-center">
                <div className="text-4xl mb-4">🏆</div>
                <h3 className="text-xl font-semibold mb-2">최고급 품질</h3>
                <p className="text-gray-600">
                  엄선된 1++ 등급 한우와 신선한 정육만을 취급합니다
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md text-center">
                <div className="text-4xl mb-4">🚚</div>
                <h3 className="text-xl font-semibold mb-2">신속한 배송</h3>
                <p className="text-gray-600">
                  신선도 유지를 위한 콜드체인 시스템으로 당일 배송
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md text-center">
                <div className="text-4xl mb-4">💰</div>
                <h3 className="text-xl font-semibold mb-2">합리적인 가격</h3>
                <p className="text-gray-600">
                  중간 유통 과정을 최소화하여 최적의 가격을 제공합니다
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 인기 카테고리 */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">인기 카테고리</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Link href="/products?category=한우" className="group">
                <div className="bg-gradient-to-br from-red-50 to-red-100 p-8 rounded-xl shadow-md hover:shadow-xl transition group-hover:scale-105 transform">
                  <div className="text-5xl mb-4 text-center">🥩</div>
                  <h3 className="text-2xl font-bold text-center mb-2">한우</h3>
                  <p className="text-gray-600 text-center">
                    최고급 1++ 등급 한우
                  </p>
                </div>
              </Link>
              <Link href="/products?category=돼지고기" className="group">
                <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-8 rounded-xl shadow-md hover:shadow-xl transition group-hover:scale-105 transform">
                  <div className="text-5xl mb-4 text-center">🥓</div>
                  <h3 className="text-2xl font-bold text-center mb-2">돼지고기</h3>
                  <p className="text-gray-600 text-center">
                    신선한 국내산 돼지고기
                  </p>
                </div>
              </Link>
              <Link href="/products?category=수입육" className="group">
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-8 rounded-xl shadow-md hover:shadow-xl transition group-hover:scale-105 transform">
                  <div className="text-5xl mb-4 text-center">🍖</div>
                  <h3 className="text-2xl font-bold text-center mb-2">수입육</h3>
                  <p className="text-gray-600 text-center">
                    미국산, 호주산 프리미엄 육류
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* CTA 섹션 */}
        <section className="bg-primary-600 text-white py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">
              지금 바로 신선한 정육을 만나보세요
            </h2>
            <p className="text-xl mb-8 text-primary-100">
              오늘 주문하시면 내일 아침 신선하게 배송됩니다
            </p>
            <Link href="/products">
              <button className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold text-lg hover:bg-gray-100 transition">
                쇼핑 시작하기
              </button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

