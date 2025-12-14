-- banners 테이블 필드명 변경 및 title 필드 추가
-- 실행 전: 백업 권장

-- 1. title_black을 subtitle_black으로 변경
ALTER TABLE banners 
  RENAME COLUMN title_black TO subtitle_black;

-- 2. title_red를 subtitle_red로 변경
ALTER TABLE banners 
  RENAME COLUMN title_red TO subtitle_red;

-- 3. 새로운 title 컬럼 추가 (nullable)
ALTER TABLE banners 
  ADD COLUMN IF NOT EXISTS title TEXT;

-- 완료 후 확인
-- SELECT id, title, subtitle_black, subtitle_red, description, image_url, background_color, slug, is_active, sort_order 
-- FROM banners 
-- LIMIT 5;


