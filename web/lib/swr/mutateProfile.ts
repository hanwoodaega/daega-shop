'use client'

import { mutate as globalMutate } from 'swr'

/**
 * 결제 완료 / 포인트·쿠폰 사용 직후 호출.
 * 프로필 요약, 포인트, 쿠폰 캐시를 무효화해 다음 사용 시 최신 데이터를 가져오도록 함.
 */
export function mutateProfileRelated(): Promise<unknown[]> {
  return Promise.all([
    globalMutate((key) => typeof key === 'string' && key === '/api/profile/info'),
    globalMutate((key) => typeof key === 'string' && key === '/api/points'),
    globalMutate((key) => typeof key === 'string' && key.startsWith('/api/points/')),
    globalMutate((key) => typeof key === 'string' && key.startsWith('/api/coupons')),
  ])
}
