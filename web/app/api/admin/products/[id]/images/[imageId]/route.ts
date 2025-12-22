import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/supabase-admin'
import { assertAdmin } from '@/lib/auth/admin-auth'

export const dynamic = 'force-dynamic'

// DELETE: 상품 이미지 삭제
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; imageId: string }> | { id: string; imageId: string } }
) {
  try {
    assertAdmin()
  } catch (e: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id, imageId } = 'then' in params ? await params : params
    
    const { error } = await supabaseAdmin
      .from('product_images')
      .delete()
      .eq('id', imageId)
      .eq('product_id', id)

    if (error) {
      console.error('이미지 삭제 실패:', error)
      return NextResponse.json({ 
        error: error.message || '이미지 삭제 실패',
        code: error.code 
      }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('이미지 삭제 에러:', e)
    return NextResponse.json({ error: e?.message || '서버 오류' }, { status: 500 })
  }
}

// PATCH: 상품 이미지 우선순위 변경
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; imageId: string }> | { id: string; imageId: string } }
) {
  try {
    assertAdmin()
  } catch (e: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id, imageId } = 'then' in params ? await params : params
    const body = await request.json()
    const { priority } = body

    if (priority === undefined || priority === null) {
      return NextResponse.json({ error: 'priority is required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('product_images')
      .update({ priority, updated_at: new Date().toISOString() })
      .eq('id', imageId)
      .eq('product_id', id)
      .select()
      .single()

    if (error) {
      console.error('이미지 우선순위 변경 실패:', error)
      return NextResponse.json({ 
        error: error.message || '이미지 우선순위 변경 실패',
        code: error.code 
      }, { status: 500 })
    }

    return NextResponse.json({ image: data })
  } catch (e: any) {
    console.error('이미지 우선순위 변경 에러:', e)
    return NextResponse.json({ error: e?.message || '서버 오류' }, { status: 500 })
  }
}

