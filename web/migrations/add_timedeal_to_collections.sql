-- =====================================================
-- 타임딜 컬렉션 시스템 통합
-- =====================================================
-- 타임딜을 collections 테이블로 관리하도록 변경
-- =====================================================

-- 1. collections 테이블에 타임딜 관련 컬럼 추가
ALTER TABLE collections 
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS start_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS end_at TIMESTAMP WITH TIME ZONE;

-- 2. 타임딜 컬렉션 생성 (단 1개만 존재)
INSERT INTO collections (name, slug, priority, is_active, title, start_at, end_at)
VALUES ('타임딜', 'timedeal', 0, false, '오늘만 특가!', NULL, NULL)
ON CONFLICT (slug) DO UPDATE
SET 
  name = EXCLUDED.name,
  updated_at = NOW();

-- 3. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_collections_end_at ON collections(end_at) WHERE slug = 'timedeal' AND is_active = true;

-- 4. 타임딜 컬렉션이 1개만 존재하도록 제약 조건 추가 (애플리케이션 레벨에서 관리)
-- 데이터베이스 레벨에서는 UNIQUE 제약을 걸 수 없으므로 애플리케이션에서 관리

-- =====================================================
-- 기존 flash_sale 데이터를 컬렉션으로 마이그레이션 (선택사항)
-- =====================================================
-- 기존 타임딜 상품이 있다면 collection_products로 이동
DO $$
DECLARE
  timedeal_collection_id UUID;
  flash_sale_end_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- 타임딜 컬렉션 ID 조회
  SELECT id INTO timedeal_collection_id FROM collections WHERE slug = 'timedeal' LIMIT 1;
  
  -- flash_sale_settings에서 종료 시간 조회
  SELECT end_time INTO flash_sale_end_time 
  FROM flash_sale_settings 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  -- 타임딜 컬렉션이 있고, 종료 시간이 있고, 아직 종료되지 않았다면
  IF timedeal_collection_id IS NOT NULL AND flash_sale_end_time IS NOT NULL AND flash_sale_end_time > NOW() THEN
    -- 컬렉션 활성화
    UPDATE collections 
    SET 
      is_active = true,
      updated_at = NOW()
    WHERE id = timedeal_collection_id;
    
    -- 기존 flash_sale 상품을 collection_products로 이동
    INSERT INTO collection_products (collection_id, product_id, priority, created_at)
    SELECT 
      timedeal_collection_id,
      fs.product_id,
      ROW_NUMBER() OVER (ORDER BY fs.created_at) - 1,
      fs.created_at
    FROM flash_sale fs
    WHERE fs.is_active = true 
      AND fs.end_at > NOW()
    ON CONFLICT (collection_id, product_id) DO NOTHING;
  END IF;
END $$;

