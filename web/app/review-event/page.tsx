'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import BottomNavbar from '@/components/BottomNavbar'

export default function ReviewEventPage() {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              리뷰이벤트 준비중입니다
            </h1>
            <p className="text-gray-600">
              곧 만나요!
            </p>
          </div>
        </div>
      </div>
      <Footer />
      <BottomNavbar />
    </>
  )
}

