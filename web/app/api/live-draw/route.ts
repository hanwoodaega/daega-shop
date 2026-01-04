import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/supabase-server'
import { calculateAutoStatus, getEffectiveStatus } from '@/lib/livedraw/livedraw.service'
import type { LiveDrawWithEffectiveStatus } from '@/lib/livedraw/livedraw.types'

export const dynamic = 'force-dynamic'

// GET: 라이브 추첨 조회 (공개 API)
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // 가장 최근 라이브 추첨 조회
    const { data: liveDraw, error } = await supabase
      .from('live_draws')
      .select('*')
      .order('live_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('라이브 추첨 조회 실패:', error)
      return NextResponse.json({ 
        liveDraw: null
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      })
    }

    if (!liveDraw) {
      return NextResponse.json({ 
        liveDraw: null
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      })
    }

    // 자동 상태 계산
    const autoStatus = calculateAutoStatus(liveDraw.live_date)
    
    // effective_status 계산 (manual_status 우선)
    const effectiveStatus = getEffectiveStatus(liveDraw.manual_status, autoStatus)

    const liveDrawWithStatus: LiveDrawWithEffectiveStatus = {
      ...liveDraw,
      effective_status: effectiveStatus,
    }

    return NextResponse.json({
      liveDraw: liveDrawWithStatus,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    })
  } catch (error: any) {
    console.error('라이브 추첨 조회 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

