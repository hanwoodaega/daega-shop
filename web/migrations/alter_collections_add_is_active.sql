-- collections 테이블에서 start_at, end_at 제거하고 is_active 추가
ALTER TABLE collections 
  DROP COLUMN IF EXISTS start_at,
  DROP COLUMN IF EXISTS end_at,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 기존 데이터는 모두 활성화 상태로 설정
UPDATE collections SET is_active = true WHERE is_active IS NULL;

