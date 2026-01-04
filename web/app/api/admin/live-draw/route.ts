import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase/supabase-admin'
import { assertAdmin } from '@/lib/auth/admin-auth'
import { calculateAutoStatus, getEffectiveStatus } from '@/lib/livedraw/livedraw.service'
import type { LiveDrawWithEffectiveStatus } from '@/lib/livedraw/livedraw.types'

// GET: 라이브 추첨 조회 (관리자)
export async function GET(request: NextRequest) {
  try {
    assertAdmin()
  } catch (e: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 가장 최근 라이브 추첨 조회
    const { data: liveDraw, error } = await supabaseAdmin
      .from('live_draws')
      .select('*')
      .order('live_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('라이브 추첨 조회 에러:', error)
      // 테이블이 없을 경우를 위한 더 자세한 에러 메시지
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'live_draws 테이블이 존재하지 않습니다. 마이그레이션을 실행해주세요.',
          details: error.message 
        }, { status: 400 })
      }
      return NextResponse.json({ 
        error: error.message || '라이브 추첨 조회 실패',
        code: error.code,
        details: error 
      }, { status: 400 })
    }

    if (!liveDraw) {
      return NextResponse.json({ liveDraw: null })
    }

    // 자동 상태 계산
    const autoStatus = calculateAutoStatus(liveDraw.live_date)
    
    // effective_status 계산
    const effectiveStatus = getEffectiveStatus(liveDraw.manual_status, autoStatus)

    const liveDrawWithStatus: LiveDrawWithEffectiveStatus = {
      ...liveDraw,
      effective_status: effectiveStatus,
    }

    return NextResponse.json({ liveDraw: liveDrawWithStatus })
  } catch (error: any) {
    console.error('라이브 추첨 조회 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// POST: 라이브 추첨 생성 또는 업데이트
export async function POST(request: NextRequest) {
  try {
    assertAdmin()
  } catch (e: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      status,
      manual_status,
      live_date,
      youtube_live_id,
      youtube_replay_id,
      title,
      description,
    } = body

    if (!live_date) {
      return NextResponse.json({ 
        error: '방송 일시는 필수입니다.' 
      }, { status: 400 })
    }

    // 기존 라이브 추첨이 있는지 확인
    const { data: existing } = await supabaseAdmin
      .from('live_draws')
      .select('id')
      .limit(1)
      .maybeSingle()

    let result
    if (existing) {
      // 업데이트
      const { data, error } = await supabaseAdmin
        .from('live_draws')
        .update({
          status: status || 'upcoming',
          manual_status: manual_status || null,
          live_date,
          youtube_live_id: youtube_live_id || null,
          youtube_replay_id: youtube_replay_id || null,
          title: title || null,
          description: description || null,
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      result = data
    } else {
      // 생성
      const { data, error } = await supabaseAdmin
        .from('live_draws')
        .insert({
          status: status || 'upcoming',
          manual_status: manual_status || null,
          live_date,
          youtube_live_id: youtube_live_id || null,
          youtube_replay_id: youtube_replay_id || null,
          title: title || null,
          description: description || null,
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      result = data
    }

    // 캐시 무효화
    revalidatePath('/live-draw')
    revalidatePath('/')

    return NextResponse.json({ success: true, liveDraw: result })
  } catch (error: any) {
    console.error('라이브 추첨 저장 실패:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

