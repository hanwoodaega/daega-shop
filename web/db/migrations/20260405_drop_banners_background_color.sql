-- 메인 배너는 이미지 전용 표시; 배경색 컬럼 제거
ALTER TABLE banners DROP COLUMN IF EXISTS background_color;
