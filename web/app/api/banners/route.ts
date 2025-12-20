import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

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
      return NextResponse.json({ error: '배너 조회 실패' }, {
        status: 500,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      })
    }
    
    return NextResponse.json({ banners: banners || [] }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    console.error('배너 조회 에러:', error)
    return NextResponse.json({ error: '배너 조회 실패' }, {
      status: 500,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  }
}

