import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // slug 또는 UUID로 조회 (먼저 slug로 시도, 없으면 UUID로)
    let query = supabase
      .from('products')
      .select('*')
      .eq('slug', params.id)
      .single()

    let { data, error } = await query

    // slug로 찾지 못했으면 UUID로 시도
    if (error || !data) {
      query = supabase
        .from('products')
        .select('*')
        .eq('id', params.id)
        .single()
      
      const result = await query
      data = result.data
      error = result.error
    }

    if (error || !data) {
      return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('상품 조회 실패:', error)
    return NextResponse.json({ error: '상품 조회 실패' }, { status: 500 })
  }
}




