'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import BottomNavbar from '@/components/layout/BottomNavbar'
import ProductCard from '@/components/product/ProductCard'
import ProductCardSkeleton from '@/components/skeletons/ProductCardSkeleton'
import { Product } from '@/lib/supabase/supabase'

interface No9PageClientProps {
  initialProducts?: Product[]
}

export default function No9PageClient({ initialProducts }: No9PageClientProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const totalSlides = 5
  
  // 컬렉션 상품 상태
  const [products, setProducts] = useState<Product[]>(initialProducts ?? [])
  const [loading, setLoading] = useState(typeof initialProducts === 'undefined')

  useEffect(() => {
    // 초기 위치를 첫 번째 실제 슬라이드로 설정
    if (scrollContainerRef.current) {
      const slideWidth = scrollContainerRef.current.clientWidth
      scrollContainerRef.current.scrollLeft = slideWidth // 첫 번째 복제 슬라이드를 건너뛰고 실제 첫 번째 슬라이드로
    }

    const interval = setInterval(() => {
      if (scrollContainerRef.current) {
        const container = scrollContainerRef.current
        const slideWidth = container.clientWidth
        const currentScroll = container.scrollLeft
        const currentIndex = Math.round(currentScroll / slideWidth)
        const nextIndex = currentIndex + 1
        const totalSlidesWithClones = totalSlides + 2 // 실제 슬라이드 + 앞뒤 복제
        
        // 마지막 실제 슬라이드 다음(복제된 첫 번째 슬라이드)에 도달했는지 확인
        if (nextIndex >= totalSlidesWithClones - 1) {
          // 끝에 도달하면 보이지 않게 첫 번째 실제 슬라이드로 즉시 이동
          container.scrollTo({
            left: slideWidth,
            behavior: 'auto'
          })
          setCurrentSlide(0)
        } else {
          const nextScroll = nextIndex * slideWidth
          container.scrollTo({
            left: nextScroll,
            behavior: 'smooth'
          })
          // 복제 슬라이드를 고려하여 실제 슬라이드 인덱스 계산
          const actualIndex = nextIndex - 1 // 첫 번째는 복제 슬라이드
          setCurrentSlide(actualIndex >= totalSlides ? 0 : actualIndex)
        }
      }
    }, 3000) // 3초마다 자동으로 넘어감

    return () => clearInterval(interval)
  }, [totalSlides])

  // 한우대가 NO.9 카테고리 상품 조회
  useEffect(() => {
    if (typeof initialProducts !== 'undefined') {
      setLoading(false)
      return
    }

    const fetchProducts = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/collections/no9?limit=100&page=1')
        if (response.ok) {
          const data = await response.json()
          setProducts(data.products || [])
        }
      } catch (error) {
        console.error('상품 조회 실패:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [initialProducts])

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const scrollLeft = container.scrollLeft
      const slideWidth = container.clientWidth
      const slideIndex = Math.round(scrollLeft / slideWidth)
      
      // 복제 슬라이드를 고려하여 실제 슬라이드 인덱스 계산
      let actualIndex = slideIndex - 1 // 첫 번째는 복제 슬라이드
      
      // 끝에 도달했을 때 (복제된 첫 번째 슬라이드)
      if (slideIndex === totalSlides + 1) {
        // 보이지 않게 첫 번째 실제 슬라이드로 즉시 이동
        container.scrollTo({
          left: slideWidth,
          behavior: 'auto'
        })
        actualIndex = 0
      }
      // 처음으로 돌아왔을 때 (복제된 마지막 슬라이드)
      else if (slideIndex === 0) {
        // 보이지 않게 마지막 실제 슬라이드로 즉시 이동
        container.scrollTo({
          left: slideWidth * totalSlides,
          behavior: 'auto'
        })
        actualIndex = totalSlides - 1
      }
      
      if (actualIndex >= 0 && actualIndex < totalSlides) {
        setCurrentSlide(actualIndex)
      }
    }
  }

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
    if (scrollContainerRef.current) {
      const slideWidth = scrollContainerRef.current.clientWidth
      // 복제 슬라이드를 고려하여 실제 위치 계산 (첫 번째 복제 슬라이드 다음부터 시작)
      scrollContainerRef.current.scrollTo({
        left: (index + 1) * slideWidth,
        behavior: 'smooth'
      })
    }
  }
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-black min-h-[80vh]">
        <div className="container mx-auto pl-5 md:pl-7 lg:pl-9 pr-8 md:pr-12 lg:pr-16 pt-8 md:pt-12 pb-16 md:pb-24">
          <div className="text-left">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-white">
              한우대가 NO.9
            </h1>
            <p className="text-3xl md:text-4xl lg:text-5xl font-normal text-white mt-5 md:mt-6">
              한우의 절정
            </p>
            <p className="text-xl md:text-2xl lg:text-3xl font-normal text-white mt-3 md:mt-4">
              1++ 중에서도 단 7% — NO.9
            </p>
          </div>
        </div>
      </main>
      
      {/* 두 번째 연한 회색 배경 섹션 */}
      <section className="py-16 md:py-24 bg-gray-100">
        <div className="container mx-auto px-8 md:px-12 lg:px-16">
          <div className="text-left max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-normal mb-6 md:mb-8 text-black">
              프리미엄 한우 등급 No.9
            </h2>
            
            <div className="space-y-6 text-black text-base md:text-lg leading-relaxed">
              <p>
                <strong>1++ 등급</strong>의 한우 중<br />
                <strong>프리미엄 등급</strong>의 <strong>No.9</strong>
              </p>
              <p>
                높은 등급의 귀한 한우인<br />
                <strong>1++ 9등급</strong>의 판정을 받은 한우만을<br />
                엄선합니다.
              </p>
              <p>
                <strong>No.9</strong>으로<br />
                소중한 분에게<br />
                감사의 마음을 전해보세요.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* 세 번째 하얀 배경 섹션 */}
      <section className="bg-white">
        <div className="space-y-2">
          {/* 항목 1 */}
          <div className="flex flex-row">
            <div className="w-1/2 aspect-square relative">
              <Image
                src="/images/hanwoo-packaging/premium-hanwoo.jpg"
                alt="1++(9) 한우 엄선 이미지"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 50vw"
              />
            </div>
            <div className="w-1/2 p-4 md:p-12 text-center" style={{ backgroundColor: '#F5F0E8' }}>
              <div className="text-2xl md:text-5xl font-light mb-2 md:mb-4 text-black text-center">1</div>
              <h3 className="text-lg md:text-3xl font-semibold mb-2 md:mb-4 text-black">
                1++(9) 한우 엄선
              </h3>
              <p className="text-xs md:text-lg text-gray-700 leading-relaxed">
                등급이 높을수록 귀한 한우<br />
                1++ 9등급 한우만을 엄선합니다.
              </p>
            </div>
          </div>
          
          {/* 항목 2 */}
          <div className="flex flex-row">
            <div className="w-1/2 aspect-square bg-gray-700 flex items-center justify-center">
              <span className="text-gray-400 text-sm">이미지 준비중</span>
            </div>
            <div className="w-1/2 p-4 md:p-12 text-center" style={{ backgroundColor: '#F5F0E8' }}>
              <div className="text-2xl md:text-5xl font-light mb-2 md:mb-4 text-black text-center">2</div>
              <h3 className="text-lg md:text-3xl font-semibold mb-2 md:mb-4 text-black">
                한우 이력 추적 시스템
              </h3>
              <p className="text-xs md:text-lg text-gray-700 leading-relaxed">
                소의 출생부터 도축, 가공, 판매에 이르는<br />
                모든 정보를 확인하실 수 있습니다.
              </p>
            </div>
          </div>
          
          {/* 항목 3 */}
          <div className="flex flex-row">
            <div className="w-1/2 aspect-square relative">
              <Image
                src="/images/hanwoo-packaging/hanwoo-premium-packaging.jpg"
                alt="한우대가 NO.9 고급 포장 이미지"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 50vw"
                priority
              />
            </div>
            <div className="w-1/2 p-4 md:p-12 text-center" style={{ backgroundColor: '#F5F0E8' }}>
              <div className="text-2xl md:text-5xl font-light mb-2 md:mb-4 text-black text-center">3</div>
              <h3 className="text-lg md:text-3xl font-semibold mb-2 md:mb-4 text-black">
                고급 포장
              </h3>
              <p className="text-xs md:text-lg text-gray-700 leading-relaxed">
                프리미엄 지함 박스에 담겨<br />
                운반하기 좋은 고급 보냉 손잡이 가방에 포장됩니다.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* 네 번째 회색 배경 섹션 - 부위 설명서 */}
      <section className="bg-gray-100 pt-16 md:pt-24 pb-16 md:pb-24 relative">
        <div className="container mx-auto px-4 md:px-8">
          <h2 className="text-xl md:text-2xl lg:text-3xl font-normal mb-6 md:mb-8 text-center text-black">
            한우대가 NO.9<br />
            부위별 설명서
          </h2>
          
          <div className="relative">
            <div 
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="overflow-x-auto scrollbar-hide snap-x snap-mandatory"
            >
              <div className="flex">
              {/* 마지막 슬라이드 복제 (앞에 추가) - 무한 루프용 */}
              <div className="flex-shrink-0 w-full snap-center flex flex-col items-center justify-start px-4 md:px-8 py-4 md:py-6">
                <div className="w-full max-w-2xl">
                  <h3 className="text-2xl md:text-3xl font-semibold text-center mb-4 md:mb-6 text-black">업진살</h3>
                  <div className="aspect-square bg-gray-200 border border-black mb-6 md:mb-8 flex items-center justify-center w-64 md:w-64 mx-auto">
                    <span className="text-gray-400 text-sm">이미지 준비중</span>
                  </div>
                  <p className="text-base md:text-lg text-gray-600 text-center leading-relaxed">
                    마블링이 좋고 근간지방이 많아서 육즙이 가득한 소고기의 풍미를 느낄 수 있는 부위입니다.
                  </p>
                </div>
              </div>
              
              {/* 채끝 */}
              <div className="flex-shrink-0 w-full snap-center flex flex-col items-center justify-start px-4 md:px-8 py-4 md:py-6">
                <div className="w-full max-w-2xl">
                  <h3 className="text-2xl md:text-3xl font-semibold text-center mb-4 md:mb-6 text-black">채끝</h3>
                  <div className="aspect-square bg-gray-200 border border-black mb-6 md:mb-8 flex items-center justify-center w-64 md:w-64 mx-auto">
                    <span className="text-gray-400 text-sm">이미지 준비중</span>
                  </div>
                  <p className="text-base md:text-lg text-gray-600 text-center leading-relaxed">
                  부드러운 육질과 적당한 지방, 풍부한 마블링이 어우러진 스테이크·구이용 부위입니다.
                  </p>
                </div>
              </div>
              
              {/* 갈비살 */}
              <div className="flex-shrink-0 w-full snap-center flex flex-col items-center justify-start px-4 md:px-8 py-4 md:py-6">
                <div className="w-full max-w-2xl">
                  <h3 className="text-2xl md:text-3xl font-semibold text-center mb-4 md:mb-6 text-black">갈비살</h3>
                  <div className="aspect-square bg-gray-200 border border-black mb-6 md:mb-8 flex items-center justify-center w-64 md:w-64 mx-auto">
                    <span className="text-gray-400 text-sm">이미지 준비중</span>
                  </div>
                  <p className="text-base md:text-lg text-gray-600 text-center leading-relaxed">
                    쫄깃한 식감과 고소한 육향이 좋은 부위입니다.
                  </p>
                </div>
              </div>
              
              {/* 살치살 */}
              <div className="flex-shrink-0 w-full snap-center flex flex-col items-center justify-start px-4 md:px-8 py-4 md:py-6">
                <div className="w-full max-w-2xl">
                  <h3 className="text-2xl md:text-3xl font-semibold text-center mb-4 md:mb-6 text-black">살치살</h3>
                  <div className="aspect-square bg-gray-200 border border-black mb-6 md:mb-8 flex items-center justify-center w-64 md:w-64 mx-auto">
                    <span className="text-gray-400 text-sm">이미지 준비중</span>
                  </div>
                  <p className="text-base md:text-lg text-gray-600 text-center leading-relaxed">
                    등심 중에 마블리이 좋은 부위로 부드러운 식감과 풍부한 육즙을 느낄 수 있습니다.
                  </p>
                </div>
              </div>
              
              {/* 부채살 */}
              <div className="flex-shrink-0 w-full snap-center flex flex-col items-center justify-start px-4 md:px-8 py-4 md:py-6">
                <div className="w-full max-w-2xl">
                  <h3 className="text-2xl md:text-3xl font-semibold text-center mb-4 md:mb-6 text-black">부채살</h3>
                  <div className="aspect-square bg-gray-200 border border-black mb-6 md:mb-8 flex items-center justify-center w-64 md:w-64 mx-auto">
                    <span className="text-gray-400 text-sm">이미지 준비중</span>
                  </div>
                  <p className="text-base md:text-lg text-gray-600 text-center leading-relaxed">
                    앞다리에 있는 살로 근내지방이 많고 부드러운 식감의 부위입니다.
                  </p>
                </div>
              </div>
              
              {/* 업진살 */}
              <div className="flex-shrink-0 w-full snap-center flex flex-col items-center justify-start px-4 md:px-8 py-4 md:py-6">
                <div className="w-full max-w-2xl">
                  <h3 className="text-2xl md:text-3xl font-semibold text-center mb-4 md:mb-6 text-black">업진살</h3>
                  <div className="aspect-square bg-gray-200 border border-black mb-6 md:mb-8 flex items-center justify-center w-64 md:w-64 mx-auto">
                    <span className="text-gray-400 text-sm">이미지 준비중</span>
                  </div>
                  <p className="text-base md:text-lg text-gray-600 text-center leading-relaxed">
                    마블링이 좋고 근간지방이 많아서 육즙이 가득한 소고기의 풍미를 느낄 수 있는 부위입니다.
                  </p>
                </div>
              </div>
              
              {/* 첫 번째 슬라이드 복제 (뒤에 추가) - 무한 루프용 */}
              <div className="flex-shrink-0 w-full snap-center flex flex-col items-center justify-start px-4 md:px-8 py-4 md:py-6">
                <div className="w-full max-w-2xl">
                  <h3 className="text-2xl md:text-3xl font-semibold text-center mb-4 md:mb-6 text-black">채끝</h3>
                  <div className="aspect-square bg-gray-200 border border-black mb-6 md:mb-8 flex items-center justify-center w-64 md:w-64 mx-auto">
                    <span className="text-gray-400 text-sm">이미지 준비중</span>
                  </div>
                  <p className="text-base md:text-lg text-gray-600 text-center leading-relaxed">
                  부드러운 육질과 적당한 지방, 풍부한 마블링이 어우러진 스테이크·구이용 부위입니다.
                  </p>
                </div>
              </div>
            </div>
            </div>
            
            {/* 슬라이드 인디케이터 - 슬라이드 컨테이너 바로 밑 고정 위치 */}
            <div className="flex justify-center gap-3 mt-2 md:mt-3">
              {[...Array(totalSlides)].map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    currentSlide === index
                      ? 'bg-black'
                      : 'bg-gray-300'
                  }`}
                  aria-label={`슬라이드 ${index + 1}로 이동`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
      
      {/* 다섯 번째 검정 배경 섹션 - 구매 전 확인 */}
      <section className="bg-black py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-8">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-normal text-white text-center mb-12 md:mb-16">
            구매 전 확인해 주세요
          </h2>
          
          <div className="space-y-8 md:space-y-12 max-w-4xl mx-auto">
            {/* Q1 */}
            <div>
              <h3 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">
                Q. 어떻게 보관하면 되나요?
              </h3>
              <p className="text-base md:text-lg text-gray-300 leading-relaxed">
                A. 신선상품이므로 냉장 보관 시 5일 이내 섭취를 권장하며, 장기 보관 시에는 냉동 보관하시기 바랍니다.
              </p>
              <p className="text-sm md:text-base text-gray-400 mt-2 md:mt-3">
                *축산물은 보관 환경에 따라 신선도의 차이가 발생할 수 있습니다.
              </p>
            </div>
            
            {/* Q2 */}
            <div>
              <h3 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">
                Q. 상품에서 핏물이 흐르는 이유는 뭔가요?
              </h3>
              <p className="text-base md:text-lg text-gray-300 leading-relaxed">
                A. 얼리지 않은 생고기 특성상 냉장으로 인해 수축됐던 근육이 이완되면서서 나오는 핏물이며, 상품 이상이 아닙니다. 키친타올로 핏물 제거 후 조리하여 드시면 됩니다.
              </p>
            </div>
            
            {/* Q3 */}
            <div>
              <h3 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">
                Q. 고기색이 검고 어두운데 상한 건가요?
              </h3>
              <p className="text-base md:text-lg text-gray-300 leading-relaxed">
                A. 겹친 부분의 산소 부족으로 생기는 자연스러운 갈변현상이므로, 산소와 접촉하면 원래 색으로 돌아옵니다. 부패 시에에는 색이 푸르스름해지고 시큼하면서 역한 냄새가 나니 참고 부탁드립니다.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* 한우대가 NO.9 상품 섹션 */}
      {products.length > 0 && (
        <section className="bg-white py-16 md:py-24">
          <div className="container mx-auto px-4 md:px-8">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12 text-black">
              한우대가 NO.9 상품
            </h2>
            {loading ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {[...Array(4)].map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}
      
      <Footer />
      <BottomNavbar />
    </div>
  )
}
