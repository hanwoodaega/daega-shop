import { NextResponse } from 'next/server'
import { dbErrorResponse, unknownErrorResponse } from '@/lib/api/api-errors'
import { supabaseAdmin } from '@/lib/supabase/supabase-admin'
import { ensureAdminApi } from '@/lib/auth/admin-auth'

export const dynamic = 'force-dynamic'

// GET: 상품의 이미지 목록 조회
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = 'then' in params ? await params : params

    const { data, error } = await supabaseAdmin
      .from('product_images')
      .select('*')
      .eq('product_id', id)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      return dbErrorResponse('admin product_images GET', error)
    }

    return NextResponse.json({ images: data || [] })
  } catch (e: unknown) {
    return unknownErrorResponse('admin product_images GET', e)
  }
}

// POST: 상품 이미지 추가
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const unauthorized = await ensureAdminApi()
  if (unauthorized) return unauthorized

  try {
    const { id } = 'then' in params ? await params : params
    const body = await request.json()
    const { image_url, priority } = body

    if (!image_url) {
      return NextResponse.json({ error: 'image_url is required' }, { status: 400 })
    }

    // 우선순위가 지정되지 않으면 가장 큰 우선순위 + 1로 설정
    let finalPriority = priority
    if (finalPriority === undefined || finalPriority === null) {
      const { data: existingImages } = await supabaseAdmin
        .from('product_images')
        .select('priority')
        .eq('product_id', id)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1)
      
      finalPriority = existingImages && existingImages.length > 0
        ? (existingImages[0].priority || 0) + 1
        : 0
    }

    const { data, error } = await supabaseAdmin
      .from('product_images')
      .insert({
        product_id: id,
        image_url,
        priority: finalPriority,
      })
      .select()
      .single()

    if (error) {
      return dbErrorResponse('admin product_images POST', error)
    }

    return NextResponse.json({ image: data })
  } catch (e: unknown) {
    return unknownErrorResponse('admin product_images POST', e)
  }
}

