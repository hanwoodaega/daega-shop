'use client'

import Link from 'next/link'

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-white">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-xl font-semibold text-gray-900">비밀번호 재설정</h1>
        <p className="text-sm text-gray-600">
          비밀번호 재설정은 휴대폰 인증을 통해 진행됩니다.
        </p>
        <Link href="/auth/find-password" className="inline-flex justify-center w-full bg-blue-900 text-white py-3 rounded-lg font-semibold">
          비밀번호 재설정으로 이동
        </Link>
      </div>
    </div>
  )
}

