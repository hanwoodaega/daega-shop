import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { assertAdmin } from '@/lib/admin-auth'
import { getKSTNowISO } from '@/lib/time-utils'

// GET: 타임딜 목록 조회 (관리자)
// 새로운 timedeals 테이블 구조 사용
export async function GET(request: NextRequest) {
  try {
    assertAdmin()
  } catch (e: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active_only') === 'true'
    const now = getKSTNowISO()

    let query = supabaseAdmin
      .from('timedeals')
      .select('*')
      .order('created_at', { ascending: false })

    // 활성 타임딜만 조회
    if (activeOnly) {
      query = query
        .lte('start_at', now)
        .gte('end_at', now)
    }

    const { data: timedeals, error: timedealError } = await query

    if (timedealError) {
      return NextResponse.json({ error: timedealError.message }, { status: 400 })
    }

    // 각 타임딜의 상품 목록 조회
    const timedealsWithProducts = await Promise.all(
      (timedeals || []).map(async (timedeal) => {
        const { data: timedealProducts, error: productsError } = await supabaseAdmin
          .from('timedeal_products')
          .select(`
            id,
            discount_percent,
            sort_order,
            products (
              id,
              name,
              price,
              brand,
              category
            )
          `)
          .eq('timedeal_id', timedeal.id)
          .order('sort_order', { ascending: true })

        if (productsError) {
          console.error('타임딜 상품 조회 실패:', productsError)
          return {
            ...timedeal,
            products: []
          }
        }

        const products = (timedealProducts || []).map((tp: any) => {
          const product = Array.isArray(tp.products) ? tp.products[0] : tp.products
          if (!product) return null

          return {
            id: tp.id, // timedeal_products의 id
            product_id: tp.product_id || product.id, // 상품 ID
            discount_percent: tp.discount_percent || 0,
            sort_order: tp.sort_order || 0,
            products: {
              id: product.id,
              name: product.name,
              price: product.price,
              image_url: null,
              brand: product.brand,
              category: product.category,
            }
          }
        }).filter(Boolean)

        return {
          ...timedeal,
          products
        }
      })
    )

    return NextResponse.json({
      timedeals: timedealsWithProducts,
    })
  } catch (error: any) {
    console.error('타임딜 조회 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// POST: 새 타임딜 생성
export async function POST(request: NextRequest) {
  try {
    assertAdmin()
  } catch (e: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { title, description, start_at, end_at, products } = body

    if (!title || !start_at || !end_at) {
      return NextResponse.json({ 
        error: '제목, 시작 시간, 종료 시간은 필수입니다.' 
      }, { status: 400 })
    }

    // 타임딜 생성
    const { data: newTimedeal, error: createError } = await supabaseAdmin
      .from('timedeals')
      .insert({
        title,
        description: description || null,
        start_at,
        end_at,
      })
      .select()
      .single()

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    // 타임딜 상품 추가
    if (products && Array.isArray(products) && products.length > 0) {
      const timedealProducts = products.map((p: any, index: number) => ({
        timedeal_id: newTimedeal.id,
        product_id: p.product_id || p.id,
        discount_percent: p.discount_percent || 0,
        sort_order: p.sort_order !== undefined ? p.sort_order : index,
      }))

      const { error: productsError } = await supabaseAdmin
        .from('timedeal_products')
        .insert(timedealProducts)

      if (productsError) {
        // 타임딜은 생성되었지만 상품 추가 실패 - 타임딜 삭제
        await supabaseAdmin
          .from('timedeals')
          .delete()
          .eq('id', newTimedeal.id)

        return NextResponse.json({ error: productsError.message }, { status: 400 })
      }
    }

    return NextResponse.json({ success: true, timedeal: newTimedeal })
  } catch (error: any) {
    console.error('타임딜 생성 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// PUT: 타임딜 업데이트
export async function PUT(request: NextRequest) {
  try {
    assertAdmin()
  } catch (e: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, title, description, start_at, end_at, products } = body

    if (!id) {
      return NextResponse.json({ error: '타임딜 ID는 필수입니다.' }, { status: 400 })
    }

    // 타임딜 업데이트
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description || null
    if (start_at !== undefined) updateData.start_at = start_at
    if (end_at !== undefined) updateData.end_at = end_at

    const { data: updatedTimedeal, error: updateError } = await supabaseAdmin
      .from('timedeals')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    // 상품 목록 업데이트
    if (products !== undefined) {
      // 기존 상품 제거
      await supabaseAdmin
        .from('timedeal_products')
        .delete()
        .eq('timedeal_id', id)

      // 새 상품 추가
      if (Array.isArray(products) && products.length > 0) {
        const timedealProducts = products.map((p: any, index: number) => ({
          timedeal_id: id,
          product_id: p.product_id || p.id,
          discount_percent: p.discount_percent || 0,
          sort_order: p.sort_order !== undefined ? p.sort_order : index,
        }))

        const { error: productsError } = await supabaseAdmin
          .from('timedeal_products')
          .insert(timedealProducts)

        if (productsError) {
          return NextResponse.json({ error: productsError.message }, { status: 400 })
        }
      }
    }

    return NextResponse.json({ success: true, timedeal: updatedTimedeal })
  } catch (error: any) {
    console.error('타임딜 업데이트 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// DELETE: 타임딜 삭제
export async function DELETE(request: NextRequest) {
  try {
    assertAdmin()
  } catch (e: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: '타임딜 ID는 필수입니다.' }, { status: 400 })
    }

    // CASCADE로 timedeal_products도 자동 삭제됨
    const { error: deleteError } = await supabaseAdmin
      .from('timedeals')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('타임딜 삭제 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
