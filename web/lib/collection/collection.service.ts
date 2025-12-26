import { DEFAULT_PAGE_SIZE } from '@/lib/utils/constants'
import { Collection } from './collection.types'
import { Product } from '@/lib/supabase/supabase'

export interface FetchCollectionParams {
  slug: string
  page?: number
  limit?: number
  sort?: 'default' | 'price_asc' | 'price_desc'
  signal?: AbortSignal
}

export interface FetchCollectionResponse {
  collection: Collection | null
  products: Product[]
  totalPages: number
}

export async function fetchCollection({
  slug,
  page = 1,
  limit = DEFAULT_PAGE_SIZE,
  sort = 'default',
  signal,
}: FetchCollectionParams): Promise<FetchCollectionResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    sort: sort,
  })

  const apiUrl = `/api/collections/${slug}?${params.toString()}`

  const response = await fetch(apiUrl, {
    cache: 'no-store',
    signal,
  })

  if (!response.ok) {
    if (response.status === 404) {
      return {
        collection: null,
        products: [],
        totalPages: 0,
      }
    }
    throw new Error('컬렉션 조회 실패')
  }

  const data = await response.json()

  if (!data.collection) {
    throw new Error('컬렉션 데이터가 없습니다.')
  }

  return {
    collection: data.collection,
    products: data.products || [],
    totalPages: data.totalPages || 0,
  }
}

// 홈페이지용: 컬렉션 섹션 데이터 페칭 (limit=4, 타임딜 처리 포함)
export interface FetchCollectionSectionParams {
  collectionType: string
  signal?: AbortSignal
}

export interface FetchCollectionSectionResponse {
  collection: Collection | null
  products: Product[]
  isTimedeal?: boolean
  timedealEndAt?: string | null
}

export async function fetchCollectionSection({
  collectionType,
  signal,
}: FetchCollectionSectionParams): Promise<FetchCollectionSectionResponse> {
  // 타임딜은 별도 API 사용
  const apiPath = collectionType === 'timedeal' 
    ? '/api/timedeals?limit=4'
    : `/api/collections/${collectionType}?limit=4`
  
  const response = await fetch(apiPath, {
    signal,
  })
  
  if (!response.ok) {
    return {
      collection: null,
      products: [],
    }
  }

  const data = await response.json()
  
  // 타임딜은 timedeal 객체 사용, 다른 컬렉션은 collection 객체 사용
  const collectionData = collectionType === 'timedeal' ? data.timedeal : data.collection
  
  // 컬렉션이 없거나 상품이 없으면 빈 배열 반환
  if (!collectionData || !data.products || data.products.length === 0) {
    return {
      collection: null,
      products: [],
    }
  }

  // 타임딜 종료 시간 체크
  if (collectionType === 'timedeal' && collectionData.end_at) {
    const now = new Date()
    const endTime = new Date(collectionData.end_at)
    if (endTime <= now) {
      return {
        collection: null,
        products: [],
      }
    }
  }

  // 상품 데이터 변환
  const activeProducts = (data.products || []).map((product: any) => ({
    ...product
  } as Product))

  return {
    collection: collectionData as Collection,
    products: activeProducts,
    isTimedeal: collectionType === 'timedeal',
    timedealEndAt: collectionType === 'timedeal' ? collectionData.end_at : null,
  }
}
