-- promotions 테이블에서 start_at, end_at 컬럼 제거
ALTER TABLE promotions
DROP COLUMN IF EXISTS start_at,
DROP COLUMN IF EXISTS end_at;

-- is_active 컬럼이 없으면 추가 (기본값 true)
ALTER TABLE promotions
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

