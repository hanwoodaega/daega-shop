import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// GET: 활성화된 히어로 슬라이드 목록 조회 (공개 API)
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()

    const { data, error } = await supabase
      .from('hero_slides')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('히어로 슬라이드 조회 실패:', error)
      return NextResponse.json({ slides: [] })
    }

    return NextResponse.json({ slides: data || [] })
  } catch (error: any) {
    console.error('히어로 슬라이드 조회 실패:', error)
    return NextResponse.json({ slides: [] })
  }
}

