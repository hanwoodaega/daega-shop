import { revalidatePath, revalidateTag } from 'next/cache'

/** 홈 RSC 등 `fetch(..., { tags: [BANNER_CACHE_TAG] })` 와 동일해야 함 */
export const BANNER_CACHE_TAG = 'banner'

/** 공개 배너 데이터 변경 후 (관리자 API에서 호출). slug 변경 시 이전 slug도 넘기면 해당 상세 경로도 무효화 */
export function revalidateBannersPublicCache(
  slug?: string | null,
  previousSlug?: string | null
): void {
  revalidateTag(BANNER_CACHE_TAG, 'default')
  revalidatePath('/')
  const cur = slug && String(slug).trim()
  const prev = previousSlug && String(previousSlug).trim()
  if (cur) revalidatePath(`/banners/${cur}`)
  if (prev && prev !== cur) revalidatePath(`/banners/${prev}`)
}
