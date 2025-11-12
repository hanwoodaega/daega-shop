-- reviews 테이블에 title 컬럼 추가

ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS title VARCHAR(100);

-- 기존 리뷰의 title은 NULL로 설정 (선택사항이므로)
COMMENT ON COLUMN public.reviews.title IS '리뷰 제목 (선택사항, 최대 100자)';

