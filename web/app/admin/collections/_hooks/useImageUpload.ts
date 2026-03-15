import { useState, useRef } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase/supabase'

interface UseImageUploadOptions {
  bucket: string
  maxSizeMB?: number
  /** true면 서버 API(/api/admin/upload-image)로 업로드 (RLS 회피, 관리자 전용) */
  useServerUpload?: boolean
  /** true면 서버에서 비율 유지하며 리사이즈·압축만 (잘리지 않음) */
  preserveAspect?: boolean
}

export function useImageUpload({ bucket, maxSizeMB = 10, useServerUpload = false, preserveAspect = false }: UseImageUploadOptions) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadImage = async (file: File): Promise<string | null> => {
    // 파일 크기 제한
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`파일 크기는 ${maxSizeMB}MB 이하여야 합니다.`, { duration: 3000 })
      return null
    }

    // 이미지 파일 타입 확인
    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드 가능합니다.', { duration: 3000 })
      return null
    }

    setUploading(true)
    try {
      if (useServerUpload) {
        const form = new FormData()
        form.set('file', file)
        form.set('bucket', bucket)
        if (preserveAspect) form.set('preserveAspect', 'true')
        const res = await fetch('/api/admin/upload-image', { method: 'POST', body: form })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast.error(data.error || '이미지 업로드 실패', { duration: 3000 })
          return null
        }
        toast.success('이미지 업로드 완료', { duration: 2000 })
        return data.url ?? null
      }

      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png'
      const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`

      // 클라이언트에서 직접 Supabase Storage에 업로드
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        })

      if (error) {
        console.error('이미지 업로드 실패:', error)
        toast.error(error.message || '이미지 업로드 실패', { duration: 3000 })
        return null
      }

      // 공개 URL 가져오기
      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(filePath)
      toast.success('이미지 업로드 완료', { duration: 2000 })
      return publicUrlData.publicUrl
    } catch (error: any) {
      console.error('이미지 업로드 실패:', error)
      toast.error('이미지 업로드에 실패했습니다.', { duration: 3000 })
      return null
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>): Promise<string | null> => {
    const file = e.target.files?.[0]
    if (!file) return null
    return await uploadImage(file)
  }

  return {
    uploading,
    fileInputRef,
    uploadImage,
    handleFileSelect,
  }
}

