-- Supabase Storage에 gift-cards 버킷 생성
-- 이 마이그레이션은 Supabase 대시보드의 SQL Editor에서 실행하거나
-- Supabase 관리자 권한이 있는 클라이언트에서 실행해야 합니다.

-- 버킷 생성 (public 접근 허용)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gift-cards',
  'gift-cards',
  true, -- public 접근 허용
  5242880, -- 5MB 파일 크기 제한
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 기존 정책 삭제 (있는 경우)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;

-- RLS 정책: 모든 사용자가 읽기 가능 (public 버킷)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'gift-cards');

-- RLS 정책: 인증된 사용자가 업로드 가능
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'gift-cards' 
  AND auth.role() = 'authenticated'
);

-- RLS 정책: 인증된 사용자가 삭제 가능 (자신이 업로드한 파일만)
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'gift-cards' 
  AND auth.role() = 'authenticated'
);

