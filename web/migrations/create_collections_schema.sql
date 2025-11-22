-- =====================================================
-- 컬렉션 시스템 마이그레이션
-- =====================================================
-- 목적: 베스트, 특가, 한우대가 NO.9 등 컬렉션을 관리하고
--       메인 메뉴에서 사용할 수 있도록 함
-- =====================================================

-- 1. 컬렉션 테이블 생성
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. 컬렉션-상품 매핑 테이블 생성
CREATE TABLE IF NOT EXISTS collection_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(collection_id, product_id)
);

-- 3. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_collections_slug ON collections(slug);
CREATE INDEX IF NOT EXISTS idx_collections_active ON collections(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_collections_priority ON collections(priority DESC);

CREATE INDEX IF NOT EXISTS idx_collection_products_collection ON collection_products(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_products_product ON collection_products(product_id);
CREATE INDEX IF NOT EXISTS idx_collection_products_priority ON collection_products(priority DESC);

-- 4. 기본 컬렉션 데이터 삽입
INSERT INTO collections (name, slug, priority, is_active) VALUES
  ('베스트', 'best', 1, true),
  ('특가', 'sale', 2, true),
  ('한우대가 No.9', 'no9', 3, true)
ON CONFLICT (slug) DO NOTHING;

-- 5. RLS (Row Level Security) 정책 설정
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_products ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능 (기존 정책이 있으면 삭제 후 생성)
DROP POLICY IF EXISTS "collections_select" ON collections;
CREATE POLICY "collections_select" ON collections FOR SELECT USING (true);

DROP POLICY IF EXISTS "collection_products_select" ON collection_products;
CREATE POLICY "collection_products_select" ON collection_products FOR SELECT USING (true);

-- 관리자만 쓰기 가능 (서비스 역할 사용)
-- 실제 구현 시 서비스 역할로 INSERT/UPDATE/DELETE 수행

-- =====================================================
-- 사용 예시:
-- 
-- 1. 베스트 컬렉션에 상품 추가:
--    INSERT INTO collection_products (collection_id, product_id, priority)
--    SELECT 
--      (SELECT id FROM collections WHERE slug = 'best'),
--      '상품ID',
--      0
--    ON CONFLICT DO NOTHING;
--
-- 2. 컬렉션별 상품 조회:
--    SELECT p.*
--    FROM products p
--    INNER JOIN collection_products cp ON p.id = cp.product_id
--    INNER JOIN collections c ON cp.collection_id = c.id
--    WHERE c.slug = 'best' AND c.is_active = true
--    ORDER BY cp.priority ASC;
-- =====================================================

