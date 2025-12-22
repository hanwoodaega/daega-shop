import { Product } from '@/lib/supabase/supabase'
import { getTargetSlug, getBudgetSlug } from './categorySlug'
import { GiftTarget } from '../_types'

export async function fetchAllProducts(searchQuery?: string): Promise<Product[]> {
  const response = await fetch(`/api/admin/products?limit=1000`, {
    credentials: 'include',
  })

  if (response.status === 401) {
    throw new Error('UNAUTHORIZED')
  }

  if (!response.ok) {
    throw new Error('상품 조회 실패')
  }

  const data = await response.json()
  let products = data.items || []

  if (searchQuery) {
    products = products.filter((p: Product) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  return products
}

export async function fetchAllCategories() {
  const response = await fetch('/api/admin/gift-categories', {
    credentials: 'include',
  })
  if (!response.ok) throw new Error('카테고리 조회 실패')
  const data = await response.json()
  return data.categories || []
}

export async function fetchCategoryBySlug(slug: string) {
  const response = await fetch(`/api/admin/gift-categories?slug=${slug}`, {
    credentials: 'include',
  })
  if (!response.ok) throw new Error('카테고리 조회 실패')
  const data = await response.json()
  return data.categories?.[0] ?? null
}

export async function fetchCategoryProducts(categoryId: string) {
  const response = await fetch(`/api/admin/gift-categories/${categoryId}`, {
    credentials: 'include',
  })
  if (!response.ok) throw new Error('카테고리 상세 조회 실패')
  const data = await response.json()
  return data.products || []
}

export async function addProductToCategory(
  categoryId: string,
  productId: string,
  priority: number
) {
  const response = await fetch(`/api/admin/gift-categories/${categoryId}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      product_ids: [productId],
      priority,
    }),
  })

  if (response.status === 401) {
    throw new Error('UNAUTHORIZED')
  }

  if (!response.ok) {
    throw new Error('추가 실패')
  }
}

export async function removeProductFromCategory(categoryId: string, productId: string) {
  const response = await fetch(
    `/api/admin/gift-categories/${categoryId}/products?product_id=${productId}`,
    {
      method: 'DELETE',
      credentials: 'include',
    }
  )

  if (response.status === 401) {
    throw new Error('UNAUTHORIZED')
  }

  if (!response.ok) {
    throw new Error('제거 실패')
  }
}

export async function updateProductPriority(
  categoryId: string,
  productId: string,
  priority: number
) {
  const response = await fetch(`/api/admin/gift-categories/${categoryId}/products`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ product_id: productId, priority }),
  })

  if (!response.ok) {
    throw new Error('순서 변경 실패')
  }
}

export async function checkProductInCategory(
  categoryId: string,
  productId: string
): Promise<boolean> {
  // product_id 쿼리 파라미터로 서버에서 필터링하여 효율성 향상
  const response = await fetch(`/api/admin/gift-categories/${categoryId}?product_id=${productId}`, {
    credentials: 'include',
  })
  if (!response.ok) return false
  const data = await response.json()
  return (data.products?.length ?? 0) > 0
}

export async function toggleProductInCategory(
  categoryId: string,
  productId: string,
  isInCategory: boolean
) {
  if (isInCategory) {
    await removeProductFromCategory(categoryId, productId)
  } else {
    await addProductToCategory(categoryId, productId, 999999)
  }
}

export async function toggleTargetCategory(
  productId: string,
  target: GiftTarget,
  isInCategory: boolean
) {
  const slug = getTargetSlug(target)
  const category = await fetchCategoryBySlug(slug)
  if (!category) throw new Error('카테고리를 찾을 수 없습니다')

  await toggleProductInCategory(category.id, productId, isInCategory)
}

export async function toggleBudgetCategory(
  productId: string,
  budgetSlug: string,
  isInCategory: boolean
) {
  const category = await fetchCategoryBySlug(budgetSlug)
  if (!category) throw new Error('카테고리를 찾을 수 없습니다')

  await toggleProductInCategory(category.id, productId, isInCategory)
}

export async function toggleFeaturedCategory(productId: string, isInCategory: boolean) {
  const category = await fetchCategoryBySlug('featured')
  if (!category) throw new Error('카테고리를 찾을 수 없습니다')

  await toggleProductInCategory(category.id, productId, isInCategory)
}

/**
 * 카테고리 상품 데이터를 정규화하는 유틸리티
 * products join 결과가 배열 또는 객체로 올 수 있는 구조를 처리
 */
export function normalizeCategoryProduct(cp: any): Product | null {
  const product = Array.isArray(cp.products) ? cp.products[0] : cp.products
  if (!product) return null
  return product as Product
}

