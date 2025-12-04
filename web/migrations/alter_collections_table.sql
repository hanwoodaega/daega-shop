-- 기존 collections 테이블에 새로운 컬럼 추가
-- 이미 존재하는 컬럼은 에러가 발생하지 않도록 IF NOT EXISTS 사용 불가 (PostgreSQL 제한)
-- 각 컬럼을 개별적으로 추가 (이미 존재하면 에러 발생)

-- description 컬럼 추가
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'collections' AND column_name = 'description'
  ) THEN
    ALTER TABLE collections ADD COLUMN description TEXT;
  END IF;
END $$;

-- image_url 컬럼 추가
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'collections' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE collections ADD COLUMN image_url TEXT;
  END IF;
END $$;

-- color_theme 컬럼 추가
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'collections' AND column_name = 'color_theme'
  ) THEN
    ALTER TABLE collections ADD COLUMN color_theme JSONB;
  END IF;
END $$;

-- sort_order 컬럼 추가
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'collections' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE collections ADD COLUMN sort_order INTEGER DEFAULT 0;
  END IF;
END $$;

-- is_active 컬럼 제거 (이미 제거되었을 수도 있음)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'collections' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE collections DROP COLUMN is_active;
  END IF;
END $$;

-- 인덱스 추가 (이미 존재하면 에러 발생하지 않음)
CREATE INDEX IF NOT EXISTS idx_collections_sort_order ON collections(sort_order);

-- is_active 인덱스 제거 (존재하는 경우)
DROP INDEX IF EXISTS idx_collections_is_active;

