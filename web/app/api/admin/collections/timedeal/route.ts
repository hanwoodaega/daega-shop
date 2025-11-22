import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { assertAdmin } from '@/lib/admin-auth'

// GET: 타임딜 컬렉션 조회
export async function GET(request: NextRequest) {
  try {
    assertAdmin()
  } catch (e: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 타임딜 컬렉션 조회 (단 1개만 존재)
    const { data: collection, error: collectionError } = await supabaseAdmin
      .from('collections')
      .select('*')
      .eq('type', 'timedeal')
      .maybeSingle()

    if (collectionError) {
      return NextResponse.json({ error: collectionError.message }, { status: 400 })
    }

    if (!collection) {
      return NextResponse.json({ 
        collection: null,
        products: [],
        title: '오늘만 특가!'
      })
    }

    // 타임딜 컬렉션의 상품 목록 조회 (프로모션 정보 포함)
    const { data: collectionProducts, error: productsError } = await supabaseAdmin
      .from('collection_products')
      .select(`
        id,
        product_id,
        priority,
        products (
          id,
          name,
          price,
          image_url,
          brand,
          category,
          promotion_products (
            promotion_id,
            promotions (
              id,
              type,
              buy_qty,
              discount_percent,
              is_active,
              start_at,
              end_at
            )
          )
        )
      `)
      .eq('collection_id', collection.id)
      .order('priority', { ascending: true })

    if (productsError) {
      return NextResponse.json({ error: productsError.message }, { status: 400 })
    }

    // flash_sale 테이블은 더 이상 사용하지 않음 (타임딜은 전시만 함)

    // 종료 시간 체크는 클라이언트에서 처리

    // 상품 데이터 정리 및 프로모션 정보 처리
    const products = (collectionProducts || []).map((cp: any) => {
      const product = Array.isArray(cp.products) ? cp.products[0] : cp.products
      if (!product) return null

      // 활성화된 프로모션 찾기
      let activePromotion = null
      if (product.promotion_products && product.promotion_products.length > 0) {
        const now = new Date()
        for (const pp of product.promotion_products) {
          const promo = Array.isArray(pp.promotions) ? pp.promotions[0] : pp.promotions
          if (promo && promo.is_active) {
            const startAt = promo.start_at ? new Date(promo.start_at) : null
            const endAt = promo.end_at ? new Date(promo.end_at) : null
            const isInDateRange = (!startAt || now >= startAt) && (!endAt || now <= endAt)
            
            if (isInDateRange) {
              activePromotion = promo
              break
            }
          }
        }
      }

      return {
        ...product,
        promotion: activePromotion,
      }
    }).filter(Boolean)

    return NextResponse.json({
      collection,
      products,
      title: collection?.title || '오늘만 특가!',
      start_time: collection?.start_at || null,
      end_time: collection?.end_at || null,
    })
  } catch (error: any) {
    console.error('타임딜 컬렉션 조회 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// PUT: 타임딜 컬렉션 업데이트
export async function PUT(request: NextRequest) {
  try {
    assertAdmin()
  } catch (e: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { title, start_at, end_at, product_ids } = body

    // 타임딜 컬렉션 조회 또는 생성
    let { data: collection, error: collectionError } = await supabaseAdmin
      .from('collections')
      .select('*')
      .eq('slug', 'timedeal')
      .maybeSingle()

    if (collectionError && collectionError.code !== 'PGRST116') {
      return NextResponse.json({ error: collectionError.message }, { status: 400 })
    }

    // 컬렉션이 없으면 생성
    if (!collection) {
      const { data: newCollection, error: createError } = await supabaseAdmin
        .from('collections')
        .insert({
          type: 'timedeal',
          title: title || '오늘만 특가!',
          start_at: start_at || null,
          end_at: end_at || null,
        })
        .select()
        .single()

      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 400 })
      }
      collection = newCollection
    } else {
      // 컬렉션 업데이트
      const updateData: any = {
        updated_at: new Date().toISOString(),
      }

      if (title !== undefined) updateData.title = title || null
      if (start_at !== undefined) updateData.start_at = start_at || null
      if (end_at !== undefined) {
        updateData.end_at = end_at || null
      }

      const { data: updatedCollection, error: updateError } = await supabaseAdmin
        .from('collections')
        .update(updateData)
        .eq('id', collection.id)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 })
      }
      collection = updatedCollection
    }

    // flash_sale_settings는 더 이상 사용하지 않음 (collections 테이블로 통합됨)

    // 상품 목록 업데이트
    if (product_ids && Array.isArray(product_ids)) {
      // 기존 상품 제거
      await supabaseAdmin
        .from('collection_products')
        .delete()
        .eq('collection_id', collection.id)

      // 새 상품 추가
      if (product_ids.length > 0) {
        const collectionProducts = product_ids.map((product_id: string, index: number) => ({
          collection_id: collection.id,
          product_id,
          priority: index,
        }))

        await supabaseAdmin
          .from('collection_products')
          .insert(collectionProducts)
      }

      // flash_sale 테이블은 더 이상 사용하지 않음 (타임딜은 전시만 함)
    }

    return NextResponse.json({ success: true, collection })
  } catch (error: any) {
    console.error('타임딜 컬렉션 업데이트 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

