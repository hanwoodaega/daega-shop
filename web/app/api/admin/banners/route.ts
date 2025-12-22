import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag, revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase/supabase-admin'
import { assertAdmin } from '@/lib/auth/admin-auth'

// GET: 배너 목록 조회
export async function GET(request: NextRequest) {
  try {
    assertAdmin()
  } catch (e: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('banners')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ banners: data || [] })
  } catch (error: any) {
    console.error('배너 조회 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// POST: 배너 생성
export async function POST(request: NextRequest) {
  try {
    assertAdmin()
  } catch (e: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { title, subtitle_black, subtitle_red, description, image_url, background_color, is_active, sort_order, slug } = body

    if (!image_url) {
      return NextResponse.json({ error: 'image_url은 필수입니다.' }, { status: 400 })
    }

    // slug 중복 검사 (slug가 제공된 경우)
    if (slug && slug.trim()) {
      const normalizedSlug = slug.trim()
      
      const { data: existing } = await supabaseAdmin
        .from('banners')
        .select('id')
        .eq('slug', normalizedSlug)
        .maybeSingle()

      if (existing) {
        return NextResponse.json({ error: '이미 사용 중인 slug입니다.' }, { status: 400 })
      }
    }

    const { data, error } = await supabaseAdmin
      .from('banners')
      .insert({
        title: title || null,
        subtitle_black: subtitle_black || null,
        subtitle_red: subtitle_red || null,
        description: description || null,
        image_url,
        background_color: background_color || '#FFFFFF',
        is_active: is_active !== undefined ? is_active : true,
        sort_order: sort_order || 0,
        slug: slug?.trim() || null,
      })
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
    console.error('배너 생성 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

