import { NextRequest, NextResponse } from 'next/server'
import { dbErrorResponse, unknownErrorResponse } from '@/lib/api/api-errors'
import { createSupabaseServerClient } from '@/lib/supabase/supabase-server'

export const dynamic = 'force-dynamic'

// GET: 메인페이지용 활성 컬렉션 목록 조회 (공개 API)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    // 활성 컬렉션만 조회 (필요한 필드만 선택)
    const { data: collections, error } = await supabase
      .from('collections')
      .select('id, type, title, description, image_url, color_theme, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('type', { ascending: true })

    if (error) {
      return dbErrorResponse('collections GET', error)
    }

    return NextResponse.json({ collections: collections || [] })
  } catch (error: unknown) {
    return unknownErrorResponse('collections GET', error)
  }
}

