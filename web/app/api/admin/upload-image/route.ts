import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/supabase-admin'
import { ensureAdminApi } from '@/lib/auth/admin-auth'
import sharp from 'sharp'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const unauthorized = await ensureAdminApi()
  if (unauthorized) return unauthorized

  try {
    const form = await request.formData()
    const file = form.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 })
    }

    // 버킷 지정 (기본값: product-images)
    const bucket = (form.get('bucket') as string) || 'product-images'
    const preserveAspect = form.get('preserveAspect') === 'true'
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png'
    const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let processedBuffer: Buffer
    let contentType: string

    // 배너/컬렉션 버킷: 원본 유지
    if (bucket === 'banner-images' || bucket === 'collection-images') {
      processedBuffer = buffer
      contentType = file.type || 'image/png'
    } else if (bucket === 'product-images' && preserveAspect) {
      // 컬렉션 등: 비율 유지하며 최대 1200px 안으로 리사이즈 + 압축 (잘리지 않음)
      processedBuffer = await sharp(buffer)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer()
      contentType = 'image/jpeg'
    } else {
      // 상품 이미지: 1:1 비율로 리사이즈·압축 (cover)
      processedBuffer = await sharp(buffer)
        .resize(800, 800, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 85 })
        .toBuffer()
      contentType = 'image/jpeg'
    }

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, processedBuffer, {
        contentType,
        upsert: false,
      })

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError)
      // 버킷이 없는 경우 더 명확한 에러 메시지 제공
      const errorMessage = uploadError.message || String(uploadError)
      if (errorMessage.includes('Bucket not found') || errorMessage.includes('404')) {
        return NextResponse.json({ 
          error: `${bucket} 버킷이 존재하지 않습니다. Supabase Storage에서 버킷을 생성해주세요.` 
        }, { status: 400 })
      }
      // RLS 정책 위반 오류 처리
      if (errorMessage.includes('row-level security') || errorMessage.includes('RLS')) {
        return NextResponse.json({ 
          error: 'RLS 정책 위반: 관리자 권한으로 업로드할 수 없습니다. Supabase Storage 버킷의 RLS 정책을 확인해주세요.' 
        }, { status: 403 })
      }
      return NextResponse.json({ error: errorMessage || '이미지 업로드 실패' }, { status: 400 })
    }

    const { data: publicUrlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(filePath)
    return NextResponse.json({ url: publicUrlData.publicUrl })
  } catch (e: any) {
    console.error('Image upload error:', e)
    return NextResponse.json({ error: e?.message || 'Upload failed' }, { status: 500 })
  }
}


