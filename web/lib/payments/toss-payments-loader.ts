import { loadTossPayments } from '@tosspayments/tosspayments-sdk'

export type TossPaymentsInstance = Awaited<ReturnType<typeof loadTossPayments>>

let cachedClientKey: string | null = null
let cachedPromise: Promise<TossPaymentsInstance> | null = null

/**
 * 동일 clientKey에 대해 `loadTossPayments`를 한 번만 수행하고 결과를 재사용합니다.
 * 체크아웃에서 `preloadTossPayments()`로 미리 호출하면 결제 버튼 직후 SDK 대기가 줄어듭니다.
 */
export function getTossPayments(clientKey: string): Promise<TossPaymentsInstance> {
  if (!clientKey) {
    return Promise.reject(new Error('Toss client key is missing'))
  }
  if (cachedClientKey !== clientKey) {
    cachedClientKey = clientKey
    cachedPromise = loadTossPayments(clientKey)
  }
  return cachedPromise!
}

/**
 * 모의 결제·키 없음이 아닐 때만 백그라운드로 SDK 로드 시작 (실패 시 캐시 무효화, 이후 재시도 가능)
 */
export function preloadTossPayments(): void {
  const key = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY
  if (!key) return
  if (process.env.NEXT_PUBLIC_TOSS_MOCK === 'true') return

  void getTossPayments(key).catch(() => {
    cachedClientKey = null
    cachedPromise = null
  })
}
