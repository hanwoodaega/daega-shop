-- =====================================================
-- 상품 스키마 재구성 마이그레이션
-- =====================================================
-- 목적: products 테이블을 기본 정보만 포함하도록 단순화하고,
--       할인/선물/프로모션 정보를 별도 테이블로 분리
-- =====================================================

-- 기존 테이블 삭제 (데이터 백업 필요시 주의!)
-- 주의: 이 스크립트는 기존 테이블을 삭제하고 새로 생성합니다.
-- 데이터가 중요하다면 먼저 백업하세요!

DROP TABLE IF EXISTS promotion_products CASCADE;
DROP TABLE IF EXISTS promotions CASCADE;
DROP TABLE IF EXISTS gift_category_products CASCADE;
DROP TABLE IF EXISTS gift_categories CASCADE;
DROP TABLE IF EXISTS flash_sale CASCADE;

-- 1. 선물 카테고리 테이블 생성
CREATE TABLE gift_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. 선물 카테고리-상품 매핑 테이블 생성
CREATE TABLE gift_category_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_category_id UUID NOT NULL REFERENCES gift_categories(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(gift_category_id, product_id)
);

-- 3. 프로모션 마스터 테이블 생성
CREATE TABLE promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bogo', 'percent')),
  buy_qty INTEGER,  -- bogo 전용 (1, 2, 3)
  discount_percent NUMERIC,  -- percent 전용
  start_at TIMESTAMP WITH TIME ZONE,
  end_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  -- 제약조건: bogo는 buy_qty 필수, percent는 discount_percent 필수
  CONSTRAINT check_bogo CHECK (
    (type = 'bogo' AND buy_qty IS NOT NULL AND discount_percent IS NULL) OR
    (type = 'percent' AND discount_percent IS NOT NULL AND buy_qty IS NULL)
  )
);

-- 4. 프로모션-상품 매핑 테이블 생성
CREATE TABLE promotion_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  group_id TEXT,  -- 묶음 구성용 (같은 그룹끼리 1+1/2+1/3+1 계산)
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(promotion_id, product_id)
);

-- 5. 타임딜(플래시 세일) 테이블 생성
CREATE TABLE flash_sale (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  start_at TIMESTAMP WITH TIME ZONE,
  end_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 6. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_gift_categories_slug ON gift_categories(slug);
CREATE INDEX IF NOT EXISTS idx_gift_categories_priority ON gift_categories(priority DESC);

CREATE INDEX IF NOT EXISTS idx_gift_category_products_category ON gift_category_products(gift_category_id);
CREATE INDEX IF NOT EXISTS idx_gift_category_products_product ON gift_category_products(product_id);
CREATE INDEX IF NOT EXISTS idx_gift_category_products_priority ON gift_category_products(priority DESC);

CREATE INDEX IF NOT EXISTS idx_promotions_type ON promotions(type);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_promotions_dates ON promotions(start_at, end_at);

CREATE INDEX IF NOT EXISTS idx_promotion_products_promotion ON promotion_products(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_products_product ON promotion_products(product_id);
CREATE INDEX IF NOT EXISTS idx_promotion_products_group ON promotion_products(group_id);
CREATE INDEX IF NOT EXISTS idx_promotion_products_priority ON promotion_products(priority DESC);

CREATE INDEX IF NOT EXISTS idx_flash_sale_product ON flash_sale(product_id);
CREATE INDEX IF NOT EXISTS idx_flash_sale_active ON flash_sale(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_flash_sale_dates ON flash_sale(start_at, end_at);

-- 7. 기존 데이터를 새 테이블로 마이그레이션하는 함수
CREATE OR REPLACE FUNCTION migrate_product_data()
RETURNS void AS $$
DECLARE
  product_record RECORD;
  promo_id UUID;
  gift_cat_id UUID;
  featured_order_val INTEGER;
BEGIN
  -- 프로모션 데이터 마이그레이션 (컬럼이 존재하는 경우에만)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'discount_percent'
  ) THEN
    FOR product_record IN 
      SELECT id, discount_percent, promotion_type, promotion_products
      FROM products
      WHERE discount_percent IS NOT NULL OR promotion_type IS NOT NULL
    LOOP
      -- 할인율이 있는 경우 프로모션 생성
      IF product_record.discount_percent IS NOT NULL THEN
        INSERT INTO promotions (title, type, discount_percent, is_active)
        VALUES (
          '상품 할인',
          'percent',
          product_record.discount_percent,
          true
        )
        ON CONFLICT DO NOTHING
        RETURNING id INTO promo_id;
        
        IF promo_id IS NOT NULL THEN
          INSERT INTO promotion_products (promotion_id, product_id)
          VALUES (promo_id, product_record.id)
          ON CONFLICT DO NOTHING;
        END IF;
      END IF;
      
      -- 프로모션 타입이 있는 경우 (1+1, 2+1 등)
      IF product_record.promotion_type IS NOT NULL THEN
        INSERT INTO promotions (title, type, buy_qty, is_active)
        VALUES (
          product_record.promotion_type || ' 프로모션',
          'bogo',
          CASE 
            WHEN product_record.promotion_type = '1+1' THEN 1
            WHEN product_record.promotion_type = '2+1' THEN 2
            WHEN product_record.promotion_type = '3+1' THEN 3
            ELSE 1
          END,
          true
        )
        ON CONFLICT DO NOTHING
        RETURNING id INTO promo_id;
        
        IF promo_id IS NOT NULL THEN
          INSERT INTO promotion_products (promotion_id, product_id)
          VALUES (promo_id, product_record.id)
          ON CONFLICT DO NOTHING;
        END IF;
      END IF;
    END LOOP;
  END IF;
  
  -- 선물 관련 데이터 마이그레이션 (컬럼이 존재하는 경우에만)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'gift_target'
  ) THEN
    FOR product_record IN 
      SELECT id, gift_target, gift_budget_targets, gift_featured
      FROM products
      WHERE gift_target IS NOT NULL OR gift_budget_targets IS NOT NULL OR gift_featured = true
    LOOP
      -- 실시간 인기 선물세트
      IF product_record.gift_featured = true THEN
        INSERT INTO gift_categories (name, slug, priority)
        VALUES ('실시간 인기', 'featured', 1)
        ON CONFLICT (slug) DO NOTHING
        RETURNING id INTO gift_cat_id;
        
        IF gift_cat_id IS NULL THEN
          SELECT id INTO gift_cat_id FROM gift_categories WHERE slug = 'featured';
        END IF;
        
        IF gift_cat_id IS NOT NULL THEN
          -- gift_featured_order 컬럼이 있으면 사용, 없으면 0
          featured_order_val := 0;
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'products' AND column_name = 'gift_featured_order'
          ) THEN
            SELECT gift_featured_order INTO featured_order_val 
            FROM products WHERE id = product_record.id;
          END IF;
          
          INSERT INTO gift_category_products (gift_category_id, product_id, priority)
          VALUES (gift_cat_id, product_record.id, COALESCE(featured_order_val, 0))
          ON CONFLICT DO NOTHING;
        END IF;
      END IF;
      
      -- 예산별 카테고리
      IF product_record.gift_budget_targets IS NOT NULL THEN
        FOR gift_cat_id IN 
          SELECT id FROM gift_categories 
          WHERE slug IN ('under-50k', 'over-50k', 'over-100k', 'over-200k')
        LOOP
          INSERT INTO gift_category_products (gift_category_id, product_id, priority)
          VALUES (gift_cat_id, product_record.id, 0)
          ON CONFLICT DO NOTHING;
        END LOOP;
      END IF;
      
      -- 대상별 카테고리
      IF product_record.gift_target IS NOT NULL THEN
        FOR gift_cat_id IN 
          SELECT id FROM gift_categories 
          WHERE slug IN ('child', 'parent', 'lover', 'friend')
        LOOP
          INSERT INTO gift_category_products (gift_category_id, product_id, priority)
          VALUES (gift_cat_id, product_record.id, 0)
          ON CONFLICT DO NOTHING;
        END LOOP;
      END IF;
    END LOOP;
  END IF;
  
  -- 타임딜 데이터 마이그레이션 (컬럼이 존재하는 경우에만)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'flash_sale_price'
  ) THEN
    INSERT INTO flash_sale (product_id, price, end_at, is_active)
    SELECT 
      id,
      flash_sale_price,
      flash_sale_end_time,
      CASE WHEN flash_sale_end_time > NOW() THEN true ELSE false END
    FROM products
    WHERE flash_sale_price IS NOT NULL AND flash_sale_end_time IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 마이그레이션 함수 실행
SELECT migrate_product_data();

-- 8. 기본 선물 카테고리 데이터 삽입
INSERT INTO gift_categories (name, slug, priority) VALUES
  ('실시간 인기', 'featured', 1),
  ('5만원 미만', 'under-50k', 2),
  ('5만원 이상', 'over-50k', 3),
  ('10만원 이상', 'over-100k', 4),
  ('20만원 이상', 'over-200k', 5),
  ('아이', 'child', 6),
  ('부모님', 'parent', 7),
  ('연인', 'lover', 8),
  ('친구', 'friend', 9)
ON CONFLICT (slug) DO NOTHING;

-- 9. RLS (Row Level Security) 정책 설정
ALTER TABLE gift_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_category_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE flash_sale ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능 (기존 정책이 있으면 삭제 후 생성)
DROP POLICY IF EXISTS "gift_categories_select" ON gift_categories;
CREATE POLICY "gift_categories_select" ON gift_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "gift_category_products_select" ON gift_category_products;
CREATE POLICY "gift_category_products_select" ON gift_category_products FOR SELECT USING (true);

DROP POLICY IF EXISTS "promotions_select" ON promotions;
CREATE POLICY "promotions_select" ON promotions FOR SELECT USING (true);

DROP POLICY IF EXISTS "promotion_products_select" ON promotion_products;
CREATE POLICY "promotion_products_select" ON promotion_products FOR SELECT USING (true);

DROP POLICY IF EXISTS "flash_sale_select" ON flash_sale;
CREATE POLICY "flash_sale_select" ON flash_sale FOR SELECT USING (true);

-- 관리자만 쓰기 가능 (서비스 역할 사용)
-- 실제 구현 시 서비스 역할로 INSERT/UPDATE/DELETE 수행

-- =====================================================
-- 주의사항:
-- 1. 이 마이그레이션은 기존 데이터를 새 구조로 마이그레이션합니다.
-- 2. products 테이블의 컬럼 제거는 별도로 진행해야 합니다.
-- 3. 애플리케이션 코드 업데이트가 필요합니다.
-- =====================================================

-- 10. products 테이블에서 불필요한 컬럼 제거 함수 (애플리케이션 코드 업데이트 완료 후 실행)
CREATE OR REPLACE FUNCTION drop_unused_product_columns()
RETURNS void AS $$
BEGIN
  -- 할인/프로모션 관련 컬럼 제거
  ALTER TABLE products DROP COLUMN IF EXISTS discount_percent;
  ALTER TABLE products DROP COLUMN IF EXISTS promotion_type;
  ALTER TABLE products DROP COLUMN IF EXISTS promotion_products;
  
  -- 타임딜 관련 컬럼 제거
  ALTER TABLE products DROP COLUMN IF EXISTS is_flash_sale;
  ALTER TABLE products DROP COLUMN IF EXISTS flash_sale_price;
  ALTER TABLE products DROP COLUMN IF EXISTS flash_sale_end_time;
  
  -- 선물 관련 컬럼 제거
  ALTER TABLE products DROP COLUMN IF EXISTS gift_target;
  ALTER TABLE products DROP COLUMN IF EXISTS gift_display_order;
  ALTER TABLE products DROP COLUMN IF EXISTS gift_budget_targets;
  ALTER TABLE products DROP COLUMN IF EXISTS gift_budget_order;
  ALTER TABLE products DROP COLUMN IF EXISTS gift_featured;
  ALTER TABLE products DROP COLUMN IF EXISTS gift_featured_order;
  
  -- is_best, is_sale은 유지 (필터링용으로 사용 중)
  -- 필요시 제거: ALTER TABLE products DROP COLUMN IF EXISTS is_best;
  -- 필요시 제거: ALTER TABLE products DROP COLUMN IF EXISTS is_sale;
END;
$$ LANGUAGE plpgsql;

-- 컬럼 제거 함수는 수동으로 실행 (애플리케이션 코드 업데이트 완료 후)
-- SELECT drop_unused_product_columns();
