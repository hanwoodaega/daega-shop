import { Suspense } from 'react'
import Footer from '@/components/layout/Footer'
import ProductDetailPageClient from './ProductDetailPageClient'
import { createSupabaseServerClient } from '@/lib/supabase/supabase-server'
import { PRODUCT_SELECT_FIELDS, enrichProductsServer } from '@/lib/product/product.service'
import { Product } from '@/lib/supabase/supabase'

interface ProductImage {
  id: string
  image_url: string
  priority: number
}

interface ProductDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params
  let initialProduct: Product | null = null
  let initialImages: ProductImage[] = []

  try {
    const supabase = await createSupabaseServerClient()
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

    let data
    let error

    if (isUUID) {
      const result = await supabase
        .from('products')
        .select(PRODUCT_SELECT_FIELDS)
        .eq('id', id)
        .neq('status', 'deleted')
        .single()

      data = result.data
      error = result.error
    } else {
      const result = await supabase
        .from('products')
        .select(PRODUCT_SELECT_FIELDS)
        .eq('slug', id)
        .neq('status', 'deleted')
        .single()

      data = result.data
      error = result.error

      if ((error || !data) && !isUUID) {
        const retryResult = await supabase
          .from('products')
          .select(PRODUCT_SELECT_FIELDS)
          .eq('id', id)
          .neq('status', 'deleted')
          .single()

        data = retryResult.data
        error = retryResult.error
      }
    }

    if (!error && data) {
      const enrichedProducts = await enrichProductsServer([data])
      initialProduct = enrichedProducts[0] || data

      const { data: images } = await supabase
        .from('product_images')
        .select('id, image_url, priority')
        .eq('product_id', data.id)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true })

      initialImages = images || []
    }
  } catch {
    initialProduct = null
    initialImages = []
  }

  let initialDescriptionImages: Array<{ id: string; image_url: string; sort_order: number }> = []
  if (initialProduct?.id) {
    try {
      const supabaseDesc = await createSupabaseServerClient()
      const { data: descImages } = await supabaseDesc
        .from('product_description_images')
        .select('id, image_url, sort_order')
        .eq('product_id', initialProduct.id)
        .order('sort_order', { ascending: true })
      initialDescriptionImages = descImages ?? []
    } catch {
      initialDescriptionImages = []
    }
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
          <div className="container mx-auto px-4 h-14 md:h-16 flex items-center justify-between">
            <button
              className="flex items-center gap-2 text-gray-800 hover:text-gray-900 transition"
              aria-label="뒤로가기"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              className="p-2 hover:bg-gray-100 rounded-full transition relative"
              aria-label="장바구니"
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </button>
          </div>
        </header>
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-800"></div>
        </div>
        <Footer />
      </div>
    }>
      <ProductDetailPageClient
        productId={id}
        initialProduct={initialProduct}
        initialImages={initialImages}
        initialDescriptionImages={initialDescriptionImages}
      />
    </Suspense>
  )
}
