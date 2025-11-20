import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { assertAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    assertAdmin()
  } catch (e: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category') || '선물세트'
  const search = searchParams.get('search') || ''

  try {
    let query = supabaseAdmin
      .from('products')
      .select('*')
      .eq('category', category)
      .order('gift_display_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ products: data || [] })
  } catch (error: any) {
    console.error('선물 상품 조회 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

