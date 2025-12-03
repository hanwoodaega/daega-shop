'use client'

import Header from '@/components/Header'
import BottomNavbar from '@/components/BottomNavbar'

export default function ReviewEventPage() {
  return (
    <>
      <Header />
      <div className="min-h-screen" style={{ backgroundColor: '#B2F5EA' }}>
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-10">
            <p className="text-4xl md:text-5xl font-bold uppercase tracking-[0.3em] text-blue-700">리뷰이벤트</p>
            <h1 className="text-2xl md:text-3xl font-light text-black mt-4">구매 후기를 남겨주신 고객님께 <br /> 감사 적립금을 제공합니다.</h1>
          </div>
          {/* 인스타그램 스타일 플레이스홀더 */}
          <div className="relative mr-auto mb-16 max-w-[32rem]">
            <div className="max-w-[16rem] md:max-w-[18rem]">
              <div className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
                <div className="flex items-center gap-2 px-2.5 py-1.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-400 to-orange-400" />
                  <div className="flex-1">
                    <p className="text-[11px] font-semibold text-gray-900">@meat_daily_life</p>
                  </div>
                  <div className="text-gray-400 text-lg">•••</div>
                </div>
                <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400 text-[10px] uppercase tracking-[0.3em]">
                  {/* 여기에 자유롭게 꾸며주세요 */}
                </div>
                <div className="px-2.5 pt-2 pb-1">
                  <div className="relative flex items-center justify-center">
                    <div className="absolute left-0 flex items-center gap-4 text-gray-700">
                      <svg className="w-5 h-5 text-red-500" fill="currentColor" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                      </svg>
                    </div>
                    <div className="flex justify-center gap-1 text-gray-400 text-xs">
                      <span>•</span>
                      <span>•</span>
                      <span>•</span>
                      <span>•</span>
                    </div>
                  </div>
                </div>
                <div className="px-2.5 pb-2.5 space-y-1 text-[11px] text-gray-900">
                  <p className="font-semibold text-xs">hanwoodaega님 외 여러 명이 좋아합니다.</p>
                  <p className="leading-snug text-xs">
                    <span className="font-semibold mr-1 text-xs">meat_daily_life</span>
                    오늘 저녁 고기 미쳤다… 부드럽고 육즙가득해서 집들이에도 딱!
                  </p>
                  <p className="text-blue-600 text-[11px]">#대가정육마트 #고기맛집</p>
                </div>
              </div>
            </div>
            <div className="absolute top-16 left-[45%] w-[11rem] md:w-[12rem] h-20 border border-gray-300 shadow-2xl flex flex-col items-center justify-center" style={{ backgroundColor: '#FFFFF0' }}>
              <p className="text-2xl font-extrabold text-gray-900">2000P</p>
              <p className="text-xs text-gray-500 mt-1">인스타그램 리뷰 작성 시</p>
            </div>
          </div>

          {/* 네이버 블로그 스타일 플레이스홀더 */}
          <div className="relative max-w-[32rem] ml-auto -mt-10 mb-20">
            <div className="max-w-[16rem] md:max-w/[18rem] ml-auto">
              <div className="bg-white border border-gray-200 rounded-xl shadow-md overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-200 grid grid-cols-[auto,2fr,auto] items-center gap-2">
                  <div className="flex items-center gap-1">
                    <div className="w-5 h-5 rounded-full bg-green-600 text-white text-[9px] font-semibold flex items-center justify-center">N</div>
                    <p className="text-[11px] font-semibold text-green-600">blog</p>
                  </div>
                  <div className="text-center text-xs font-semibold text-gray-900">고기러버J</div>
                  <div className="text-gray-500 text-lg justify-self-end">☰</div>
                </div>
                <div className="px-4 py-3 space-y-1">
                  <p className="text-sm font-semibold text-gray-900 mt-1.5">대가정육 내돈내산 후기, 만족도 100%</p>
                  <p className="text-[11px] text-gray-500">2025.12.10</p>
                </div>
                <div className="w-full h-56 bg-gray-100" />
              </div>
            </div>
            <div className="absolute top-36 right-[45%] w-[11rem] md:w-[12rem] h-20 border border-gray-300 shadow-2xl flex flex-col items-center justify-center" style={{ backgroundColor: '#FFFFF0' }}>
              <p className="text-2xl font-extrabold text-gray-900">5000P</p>
              <p className="text-xs text-gray-500 mt-1">블로그/카페 리뷰 작성 시</p>
            </div>
          </div>

          {/* 겹치는 카드 컨테이너 */}
          <div className="relative max-w-4xl mx-auto">
            <div className="flex flex-col items-center gap-8 md:gap-12">
              {/* 첫 번째 카드 - 사진리뷰 */}
              <div className="relative w-full max-w-md md:max-w-lg bg-white shadow-lg p-4 md:p-6">
                <div className="absolute top-0 left-0 w-6 h-6 text-white flex items-center justify-center font-bold text-sm" style={{ backgroundColor: '#10B981' }}>
                  1
                </div>
                <div className="mt-4 md:mt-6 mb-6 md:mb-8 flex items-center gap-2 md:gap-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 md:w-6 md:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-base md:text-lg font-normal text-gray-900 leading-relaxed text-left">
                    사진 리뷰를 남기면 리뷰 하나당<br />500 포인트 자동 적립
                  </h3>
                </div>
                <div className="mt-6 md:mt-8">
                  <div className="bg-gray-50 border border-gray-200 p-3 md:p-4">
                    <p className="text-sm md:text-base text-gray-600 mb-2">1. 상품 사진을 찍어서 구매 후기를 남겨주세요.</p>
                    <p className="text-sm md:text-base text-gray-600">2. 구매한 상품 모두 작성 가능해요.</p>
                  </div>
                </div>
              </div>

              {/* 두 번째 카드 - 인스타그램 리뷰 */}
              <div className="relative w-full max-w-md md:max-w-lg bg-white shadow-lg p-4 md:p-6">
                <div className="absolute top-0 left-0 w-6 h-6 text-white flex items-center justify-center font-bold text-sm" style={{ backgroundColor: '#10B981' }}>
                  2
                </div>
                <div className="mt-4 md:mt-6 mb-6 md:mb-8 flex items-center gap-2 md:gap-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </div>
                  <h3 className="text-base md:text-lg font-normal text-gray-900 leading-relaxed text-left">
                    인스타그램 리뷰를 남기면<br />2000 포인트 적립
                  </h3>
                </div>
                <div className="mt-6 md:mt-8">
                  <div className="bg-gray-50 border border-gray-200 p-3 md:p-4">
                    <p className="text-sm md:text-base text-gray-600 mb-2">1. 전체 공개로 글을 남겨주세요.</p>
                    <p className="text-sm md:text-base text-gray-600 mb-2">2. 게시글 본문에 해시태그 #대가정육마트을 포함해주세요.</p>
                    <p className="text-sm md:text-base text-gray-600">3. 사진 1매 이상 첨부해주세요.</p>
                  </div>
                </div>
              </div>

              {/* 세 번째 카드 - 네이버블로그 리뷰 */}
              <div className="relative w-full max-w-md md:max-w-lg bg-white shadow-lg p-4 md:p-6">
                <div className="absolute top-0 left-0 w-6 h-6 text-white flex items-center justify-center font-bold text-sm" style={{ backgroundColor: '#10B981' }}>
                  3
                </div>
                <div className="mt-4 md:mt-6 mb-6 md:mb-8 flex items-center gap-2 md:gap-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 md:w-6 md:h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M16.273 12.845L7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727v12.845z"/>
                    </svg>
                  </div>
                  <h3 className="text-base md:text-lg font-normal text-gray-900 leading-relaxed text-left">
                    네이버 블로그, 카페 리뷰를 남기면<br />5000 포인트 적립
                  </h3>
                </div>
                <div className="mt-6 md:mt-8">
                  <div className="bg-gray-50 border border-gray-200 p-3 md:p-4">
                    <p className="text-sm md:text-base text-gray-600 mb-2">1. 전체 공개로 글을 남겨주세요.</p>
                    <p className="text-sm md:text-base text-gray-600 mb-2">2. 게시물 제목과 내용에 대가정육마트을 포함해주세요.</p>
                    <p className="text-sm md:text-base text-gray-600">3. 사진 5매 이상 첨부해주세요.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 이벤트 안내 */}
          <div className="max-w-4xl mx-auto mt-16 bg-white rounded-lg shadow-md py-8 px-5 md:px-7">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">이벤트 참여 방법</h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 text-white rounded-full flex items-center justify-center font-bold" style={{ backgroundColor: '#10B981' }}>1</div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">리뷰 작성</h3>
                  <p className="text-gray-600 text-sm">위의 방법 중 하나로 리뷰를 작성해주세요.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 text-white rounded-full flex items-center justify-center font-bold" style={{ backgroundColor: '#10B981' }}>2</div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">리뷰 제출</h3>
                  <p className="text-gray-600 text-sm">작성한 리뷰 링크를 아래 카카오 채널로 <br />보내주세요.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 text-white rounded-full flex items-center justify-center font-bold" style={{ backgroundColor: '#10B981' }}>3</div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">혜택 받기</h3>
                  <p className="text-gray-600 text-sm">검토 후 적립금을 지급해드립니다.</p>
                </div>
              </div>
            </div>
            <div className="mt-10 text-center">
              <a
                href="https://pf.kakao.com/_your_channel_id"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-yellow-300 hover:bg-yellow-400 text-gray-900 font-semibold px-6 py-3 rounded-lg shadow-md transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3z"/>
                </svg>
                <span>카카오 채널로 리뷰 제출하기</span>
              </a>
              <p className="text-xs text-gray-500 mt-3">여기 사이트에 등록하신 리뷰는 검토 후 적립금이 자동 지급됩니다.</p>
            </div>
          </div>
        </div>
        <div className="h-32 md:h-40"></div>
      </div>
      <BottomNavbar />
    </>
  )
}


