import { revalidatePath, revalidateTag } from 'next/cache'

/** 홈·컬렉션 페이지 RSC fetch의 `tags`와 동일해야 함 */
export const COLLECTIONS_CACHE_TAG = 'collections'

/** 공개 컬렉션 데이터가 바뀐 뒤 캐시 무효화 (히어로의 revalidateTag 패턴과 동일) */
export function revalidateCollectionsPublicCache(): void {
  revalidateTag(COLLECTIONS_CACHE_TAG, 'default')
  revalidatePath('/')
  revalidatePath('/best')
  revalidatePath('/sale')
  revalidatePath('/no9')
  revalidatePath('/weekly-discount')
}
