"use client"

import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/lib/auth/auth-context'
import { useProfileInfo } from '@/lib/swr'
import { useDefaultAddressSWR } from '@/lib/swr/useAddresses'

export default function HomeHeroUserBanner() {
  const { user, loading } = useAuth()
  const { data: profileInfo } = useProfileInfo()
  const { address } = useDefaultAddressSWR(!loading && !!user)

  if (loading) return null

  // 비회원: 로그인 유도 배너
  if (!user) {
    return (
      <div className="w-full bg-white lg:border-b lg:border-gray-200">
        <div className="max-w-[1000px] lg:max-w-[450px] mx-auto px-4 py-3 text-base text-gray-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1 min-w-0">
            <span className="font-semibold">로그인해 주세요</span>
            <Link
              href="/auth/login"
              prefetch={false}
              className="text-base font-semibold text-gray-900"
            >
              {'>'}
            </Link>
          </div>
          <div className="ml-auto flex-shrink-0">
            <div className="relative w-[140px] h-[52px] sm:w-[165px] sm:h-[60px] rounded-md overflow-hidden">
              <Image
                src="/images/badges/guest-order-lookup.png"
                alt="비회원 주문조회 안내"
                fill
                sizes="(min-width: 640px) 165px, 140px"
                className="object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const rawName = profileInfo?.name || (user as any)?.user_metadata?.name || ''
  const displayName = rawName || '회원'

  const fullAddress = address?.address || ''
  const shortAddress = fullAddress.split('(')[0].trim()

  return (
    <div className="w-full bg-white lg:border-b lg:border-gray-200">
      <Link
        href="/profile"
        prefetch={false}
        className="block max-w-[1000px] lg:max-w-[450px] mx-auto px-4 py-3 text-base text-gray-800"
        aria-label="마이페이지로 이동"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-base">{displayName}님</span>
              <span className="text-base font-semibold text-gray-900">{'>'}</span>
            </div>
            {shortAddress && (
              <span className="text-sm text-gray-600 mt-0.5">{shortAddress}</span>
            )}
          </div>
          <div className="ml-auto flex-shrink-0">
            <div className="relative w-[140px] h-[52px] sm:w-[165px] sm:h-[60px] rounded-md overflow-hidden">
              <Image
                src="/images/badges/free-shipping.png"
                alt="5만원 이상 구매시 무료배송"
                fill
                sizes="(min-width: 640px) 165px, 140px"
                className="object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </Link>
    </div>
  )
}

