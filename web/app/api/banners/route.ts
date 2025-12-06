import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

// 동적 라우트로 처리 (cookies 사용)
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createSupabaseServerClient()
    
    const { data: banners, error } = await supabase
      .from('banners')
      .select('id, title, subtitle_black, subtitle_red, description, image_url, background_color, slug')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
    
    if (error) {
      console.error('배너 조회 실패:', error)
      return NextResponse.json({ error: '배너 조회 실패' }, { status: 500 })
    }
    
    return NextResponse.json({ banners: banners || [] })
  } catch (error) {
    console.error('배너 조회 에러:', error)
    return NextResponse.json({ error: '배너 조회 실패' }, { status: 500 })
  }
}

