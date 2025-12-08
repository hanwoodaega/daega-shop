import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { assertAdmin } from '@/lib/admin-auth'

// GET: 배너의 상품 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    assertAdmin()
  } catch (e: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = params
    
    const { data, error } = await supabaseAdmin
      .from('banner_products')
      .select(`
        id,
        product_id,
        products (
          id,
          name,
          price,
          brand,
          category
        )
      `)
      .eq('banner_id', id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ products: data || [] })
  } catch (error: any) {
    console.error('배너 상품 조회 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// POST: 배너에 상품 추가
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    assertAdmin()
  } catch (e: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = params
    const body = await request.json()
    const { product_ids } = body

    if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
      return NextResponse.json({ error: '상품 ID 배열이 필요합니다.' }, { status: 400 })
    }

    // 배너 존재 확인
    const { data: banner, error: bannerError } = await supabaseAdmin
      .from('banners')
      .select('id')
      .eq('id', id)
      .single()

    if (bannerError || !banner) {
      return NextResponse.json({ error: '배너를 찾을 수 없습니다.' }, { status: 404 })
    }

    // product_id 존재 여부 검증
    const { data: validProducts, error: productsCheckError } = await supabaseAdmin
      .from('products')
      .select('id')
      .in('id', product_ids)

    if (productsCheckError) {
      return NextResponse.json({ error: '상품 조회 실패' }, { status: 400 })
    }

    if (!validProducts || validProducts.length !== product_ids.length) {
      return NextResponse.json({ error: '유효하지 않은 상품 ID가 포함되어 있습니다.' }, { status: 400 })
    }

    // 중복 체크: 이미 배너에 추가된 상품이 있는지 확인
    const { data: existingProducts, error: existingCheckError } = await supabaseAdmin
      .from('banner_products')
      .select('product_id')
      .eq('banner_id', id)
      .in('product_id', product_ids)

    if (existingCheckError) {
      return NextResponse.json({ error: '중복 체크 실패' }, { status: 400 })
    }

    if (existingProducts && existingProducts.length > 0) {
      const existingIds = existingProducts.map((ep: any) => ep.product_id).join(', ')
      return NextResponse.json({ 
        error: `이미 추가된 상품이 있습니다: ${existingIds}` 
      }, { status: 400 })
    }

    // 상품 추가
    const bannerProducts = product_ids.map((product_id: string) => ({
      banner_id: id,
      product_id,
    }))

    const { data, error } = await supabaseAdmin
      .from('banner_products')
      .insert(bannerProducts)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ products: data })
  } catch (error: any) {
    console.error('상품 추가 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// DELETE: 배너에서 상품 제거
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    assertAdmin()
  } catch (e: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = params
    const { searchParams } = new URL(request.url)
    const product_id = searchParams.get('product_id')

    if (!product_id) {
      return NextResponse.json({ error: 'product_id가 필요합니다.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('banner_products')
      .delete()
      .eq('banner_id', id)
      .eq('product_id', product_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('상품 제거 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

