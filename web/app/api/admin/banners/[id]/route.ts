import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag, revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { assertAdmin } from '@/lib/admin-auth'

// GET: 배너 조회 (상품 목록 포함)
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
    const { data: banner, error: bannerError } = await supabaseAdmin
      .from('banners')
      .select('*')
      .eq('id', params.id)
      .single()

    if (bannerError || !banner) {
      return NextResponse.json({ error: bannerError?.message || '배너를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 배너 상품 목록 조회
    const { data: bannerProducts, error: productsError } = await supabaseAdmin
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
      .eq('banner_id', params.id)

    if (productsError) {
      console.error('배너 상품 조회 실패:', productsError)
    }

    return NextResponse.json({ 
      banner,
      products: bannerProducts || []
    })
  } catch (error: any) {
    console.error('배너 조회 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// PUT: 배너 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    assertAdmin()
  } catch (e: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { title, subtitle_black, subtitle_red, description, image_url, background_color, is_active, sort_order, slug } = body

    // slug 중복 검사 (slug가 변경되는 경우)
    if (slug !== undefined && slug && slug.trim()) {
      const normalizedSlug = slug.trim()
      
      // 다른 배너에서 같은 slug를 사용하는지 확인
      const { data: existing } = await supabaseAdmin
        .from('banners')
        .select('id')
        .eq('slug', normalizedSlug)
        .neq('id', params.id)
        .maybeSingle()

      if (existing) {
        return NextResponse.json({ error: '이미 사용 중인 slug입니다.' }, { status: 400 })
      }
    }

    const updateData: any = {}
    if (title !== undefined) updateData.title = title || null
    if (subtitle_black !== undefined) updateData.subtitle_black = subtitle_black || null
    if (subtitle_red !== undefined) updateData.subtitle_red = subtitle_red || null
    if (description !== undefined) updateData.description = description || null
    if (image_url !== undefined) updateData.image_url = image_url
    if (background_color !== undefined) updateData.background_color = background_color
    if (is_active !== undefined) updateData.is_active = is_active
    if (sort_order !== undefined) updateData.sort_order = sort_order
    if (slug !== undefined) updateData.slug = slug?.trim() || null
    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabaseAdmin
      .from('banners')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // 캐시 무효화
    revalidateTag('banner')
    revalidatePath('/')

    return NextResponse.json({ banner: data })
  } catch (error: any) {
    console.error('배너 수정 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// DELETE: 배너 삭제
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
    const { error } = await supabaseAdmin
      .from('banners')
      .delete()
      .eq('id', params.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // 캐시 무효화
    revalidateTag('banner')
    revalidatePath('/')

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('배너 삭제 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

