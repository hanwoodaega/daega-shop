'use client'

import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="hidden lg:block">
        <Header showCartButton />
      </div>
      <main className="flex-1 flex items-center justify-center px-6 pt-12 pb-16 lg:pb-20">
        <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-xl font-semibold text-gray-900">비밀번호 재설정</h1>
        <p className="text-sm text-gray-600">
          비밀번호 재설정은 휴대폰 인증을 통해 진행됩니다.
        </p>
        <Link href="/auth/find-password" className="inline-flex justify-center w-full bg-blue-900 text-white py-3 rounded-lg font-semibold">
          비밀번호 재설정으로 이동
        </Link>
      </div>
      </main>
      <div className="mt-20 w-full lg:mt-28 shrink-0">
        <Footer />
      </div>
    </div>
  )
}

