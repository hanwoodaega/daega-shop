-- collections 테이블 구조 변경
-- name, slug, priority, is_active, is_time_limited 컬럼 제거
-- type 컬럼 추가 (timedeal, best, sale, no9)

-- 1단계: type 컬럼 추가 (먼저 추가해야 함)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'collections' AND column_name = 'type'
  ) THEN
    ALTER TABLE collections ADD COLUMN type TEXT;
  END IF;
END $$;

-- 2단계: 기존 데이터 마이그레이션 (slug를 type으로 변환)
DO $$
DECLARE
  v_timedeal_id UUID;
  v_best_id UUID;
  v_sale_id UUID;
  v_no9_id UUID;
BEGIN
  -- 기존 컬렉션 ID 조회 (slug로)
  SELECT id INTO v_timedeal_id FROM collections WHERE slug = 'timedeal' LIMIT 1;
  SELECT id INTO v_best_id FROM collections WHERE slug = 'best' LIMIT 1;
  SELECT id INTO v_sale_id FROM collections WHERE slug = 'sale' LIMIT 1;
  SELECT id INTO v_no9_id FROM collections WHERE slug = 'no9' LIMIT 1;

  -- 기존 컬렉션에 type 설정
  IF v_timedeal_id IS NOT NULL THEN
    UPDATE collections SET type = 'timedeal' WHERE id = v_timedeal_id;
  END IF;

  IF v_best_id IS NOT NULL THEN
    UPDATE collections SET type = 'best' WHERE id = v_best_id;
  END IF;

  IF v_sale_id IS NOT NULL THEN
    UPDATE collections SET type = 'sale' WHERE id = v_sale_id;
  END IF;

  IF v_no9_id IS NOT NULL THEN
    UPDATE collections SET type = 'no9' WHERE id = v_no9_id;
  END IF;

  -- 기존 컬렉션이 없으면 생성
  IF v_timedeal_id IS NULL THEN
    INSERT INTO collections (type, title, start_at, end_at, created_at, updated_at)
    VALUES ('timedeal', '오늘만 특가!', NULL, NULL, NOW(), NOW());
  END IF;

  IF v_best_id IS NULL THEN
    INSERT INTO collections (type, created_at, updated_at)
    VALUES ('best', NOW(), NOW());
  END IF;

  IF v_sale_id IS NULL THEN
    INSERT INTO collections (type, created_at, updated_at)
    VALUES ('sale', NOW(), NOW());
  END IF;

  IF v_no9_id IS NULL THEN
    INSERT INTO collections (type, created_at, updated_at)
    VALUES ('no9', NOW(), NOW());
  END IF;
END $$;

-- 3단계: type 컬럼을 NOT NULL로 변경
UPDATE collections SET type = 'best' WHERE type IS NULL;
ALTER TABLE collections ALTER COLUMN type SET NOT NULL;

-- 4단계: 기존 컬럼 제거
ALTER TABLE collections 
  DROP COLUMN IF EXISTS name,
  DROP COLUMN IF EXISTS slug,
  DROP COLUMN IF EXISTS priority,
  DROP COLUMN IF EXISTS is_active,
  DROP COLUMN IF EXISTS is_time_limited;

-- type에 CHECK 제약조건 추가
ALTER TABLE collections 
  DROP CONSTRAINT IF EXISTS collections_type_check;

ALTER TABLE collections 
  ADD CONSTRAINT collections_type_check 
  CHECK (type IN ('timedeal', 'best', 'sale', 'no9'));

-- type에 UNIQUE 제약조건 추가 (각 타입당 하나만 존재)
ALTER TABLE collections 
  DROP CONSTRAINT IF EXISTS collections_type_unique;

CREATE UNIQUE INDEX IF NOT EXISTS collections_type_unique ON collections(type);

-- 기존 인덱스 제거
DROP INDEX IF EXISTS collections_slug_idx;
DROP INDEX IF EXISTS collections_is_active_idx;
DROP INDEX IF EXISTS collections_priority_idx;
DROP INDEX IF EXISTS collections_end_at_idx;

-- type 인덱스 추가
CREATE INDEX IF NOT EXISTS collections_type_idx ON collections(type);

