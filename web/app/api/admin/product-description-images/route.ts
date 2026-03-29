import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/supabase-admin'
import { ensureAdminApi } from '@/lib/auth/admin-auth'
import sharp from 'sharp'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'

const BUCKET = 'product-descriptions'
const MAX_WIDTH = 1000

export async function POST(request: NextRequest) {
  const unauthorized = await ensureAdminApi()
  if (unauthorized) return unauthorized

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const productId = formData.get('product_id') as string | null

    if (!file || file.size === 0) {
      return NextResponse.json({ error: '파일을 선택해주세요.' }, { status: 400 })
    }
    if (!productId || productId.trim() === '') {
      return NextResponse.json({ error: '상품을 선택해주세요.' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'webp'
    const safeExt = ['webp', 'jpg', 'jpeg', 'png'].includes(ext) ? ext : 'webp'
    const filePath = `${productId.trim()}/${randomUUID()}.${safeExt}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const processedBuffer = await sharp(buffer)
      .resize(MAX_WIDTH, null, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer()

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(filePath, processedBuffer, {
        contentType: 'image/webp',
        upsert: false,
      })

    if (uploadError) {
      console.error('[product-description-images] upload error:', uploadError)
      if (uploadError.message?.includes('Bucket not found')) {
        return NextResponse.json(
          { error: `Storage 버킷 "${BUCKET}"이 없습니다. Supabase에서 생성 후 공개로 설정해주세요.` },
          { status: 400 }
        )
      }
      return NextResponse.json({ error: uploadError.message || '업로드 실패' }, { status: 400 })
    }

    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(filePath)
    const imageUrl = urlData.publicUrl

    const { data: maxOrder } = await supabaseAdmin
      .from('product_description_images')
      .select('sort_order')
      .eq('product_id', productId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextOrder = (maxOrder?.sort_order ?? -1) + 1

    const { data: row, error: insertError } = await supabaseAdmin
      .from('product_description_images')
      .insert({
        product_id: productId,
        image_url: imageUrl,
        sort_order: nextOrder,
      })
      .select('id, product_id, image_url, sort_order, created_at')
      .single()

    if (insertError) {
      console.error('[product-description-images] insert error:', insertError)
      return NextResponse.json({ error: insertError.message || 'DB 저장 실패' }, { status: 500 })
    }

    return NextResponse.json({ image: row })
  } catch (e: unknown) {
    console.error('[product-description-images] POST error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '서버 오류' },
      { status: 500 }
    )
  }
}
