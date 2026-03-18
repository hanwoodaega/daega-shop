-- product_images에 storage path 컬럼 추가
-- - 기존에는 public URL(image_url)만 저장했으나,
--   장기적으로는 Storage 경로(image_path)를 기준으로 URL을 생성하는 것이 더 유연하다.
-- - 이 스크립트는 Supabase SQL Editor 또는 마이그레이션 도구에서 실행한다.

ALTER TABLE public.product_images
  ADD COLUMN IF NOT EXISTS image_path text;

COMMENT ON COLUMN public.product_images.image_path IS
  'Supabase Storage 내 객체 경로 (예: product-images/{filename}.jpg). URL은 getPublicUrl(image_path)로 생성.';

-- 기존 image_url에서 bucket 이하 경로를 추출해 image_path로 백필
-- 예시 URL:
--   https://<project>.supabase.co/storage/v1/object/public/product-images/<path>
-- split_part(image_url, '/product-images/', 2) → <path>
UPDATE public.product_images
SET image_path = split_part(image_url, '/product-images/', 2)
WHERE image_url IS NOT NULL
  AND (image_path IS NULL OR image_path = '');

