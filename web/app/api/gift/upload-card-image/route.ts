import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { imageData } = await request.json()
    
    if (!imageData || !imageData.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid image data' }, { status: 400 })
    }

    // data URL에서 base64 데이터 추출
    const base64Data = imageData.split(',')[1]
    const buffer = Buffer.from(base64Data, 'base64')

    const bucket = 'gift-cards'
    const filePath = `generated/${Date.now()}-${Math.random().toString(36).slice(2)}.png`

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType: 'image/png',
        upsert: false,
      })

    if (uploadError) {
      console.error('이미지 업로드 실패:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 400 })
    }

    const { data: publicUrlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(filePath)
    return NextResponse.json({ url: publicUrlData.publicUrl })
  } catch (e: any) {
    console.error('이미지 업로드 에러:', e)
    return NextResponse.json({ error: e?.message || 'Upload failed' }, { status: 500 })
  }
}


