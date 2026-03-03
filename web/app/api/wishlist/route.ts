import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/supabase-server'
import { requireActiveUserFromServer } from '@/lib/auth/auth-server'

export const dynamic = 'force-dynamic'

// GET: 위시리스트 조회
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    
    // 서버에서 사용자 인증 확인
    const authResult = await requireActiveUserFromServer()
    if ('error' in authResult) {
      const status = authResult.error === 'unauthorized' ? 401 : 403
      const errorMessage = authResult.error === 'unauthorized' ? '로그인이 필요합니다.' : '접근 권한이 없습니다.'
      return NextResponse.json({ error: errorMessage }, { status })
    }
    const user = authResult.user

    // 위시리스트 조회 (상품 정보와 함께)
    const { data, error } = await supabase
      .from('wishlists')
      .select(`
        id,
        product_id,
        created_at,
        products (
          id,
          name,
          price,
          brand
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('위시리스트 조회 실패:', error)
      return NextResponse.json({ error: '위시리스트 조회 실패' }, { status: 500 })
    }

    // product_id만 추출한 배열 반환 (기존 localStorage 형식과 호환)
    const productIds = (data || []).map((item: any) => item.product_id)

    return NextResponse.json({ 
      success: true, 
      items: productIds,
      details: data // 상세 정보도 함께 반환
    })
  } catch (error) {
    console.error('위시리스트 조회 에러:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// POST: 위시리스트에 상품 추가
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // 서버에서 사용자 인증 확인
    const authResult = await requireActiveUserFromServer()
    if ('error' in authResult) {
      const status = authResult.error === 'unauthorized' ? 401 : 403
      const errorMessage = authResult.error === 'unauthorized' ? '로그인이 필요합니다.' : '접근 권한이 없습니다.'
      return NextResponse.json({ error: errorMessage }, { status })
    }
    const user = authResult.user

    const { product_id } = await request.json()

    if (!product_id) {
      return NextResponse.json({ error: '상품 ID가 필요합니다.' }, { status: 400 })
    }

    // 위시리스트에 추가 (중복 시 무시)
    const { data, error } = await supabase
      .from('wishlists')
      .insert({
        user_id: user.id,
        product_id
      })
      .select()
      .single()

    if (error) {
      // 중복 에러는 무시 (이미 찜한 상품)
      if (error.code === '23505') {
        return NextResponse.json({ 
          success: true, 
          message: '이미 찜한 상품입니다.',
          exists: true
        })
      }
      console.error('위시리스트 추가 실패:', error)
      return NextResponse.json({ error: '위시리스트 추가 실패' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: '찜 목록에 추가되었습니다.',
      data 
    })
  } catch (error) {
    console.error('위시리스트 추가 에러:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// DELETE: 위시리스트에서 상품 제거
export async function DELETE(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // 서버에서 사용자 인증 확인
    const authResult = await requireActiveUserFromServer()
    if ('error' in authResult) {
      const status = authResult.error === 'unauthorized' ? 401 : 403
      const errorMessage = authResult.error === 'unauthorized' ? '로그인이 필요합니다.' : '접근 권한이 없습니다.'
      return NextResponse.json({ error: errorMessage }, { status })
    }
    const user = authResult.user

    const { product_id } = await request.json()

    if (!product_id) {
      return NextResponse.json({ error: '상품 ID가 필요합니다.' }, { status: 400 })
    }

    // 위시리스트에서 제거
    const { error } = await supabase
      .from('wishlists')
      .delete()
      .eq('user_id', user.id)
      .eq('product_id', product_id)

    if (error) {
      console.error('위시리스트 제거 실패:', error)
      return NextResponse.json({ error: '위시리스트 제거 실패' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: '찜 목록에서 제거되었습니다.' 
    })
  } catch (error) {
    console.error('위시리스트 제거 에러:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

