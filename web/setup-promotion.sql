-- 1+1 / 2+1 프로모션 기능 추가
-- Supabase SQL Editor에서 실행하세요

-- 프로모션 타입 필드 추가
ALTER TABLE products
ADD COLUMN IF NOT EXISTS promotion_type TEXT CHECK (promotion_type IN ('1+1', '2+1'));

-- 같은 프로모션 그룹의 상품 ID 배열
ALTER TABLE products
ADD COLUMN IF NOT EXISTS promotion_products TEXT[];

-- 필터 필드 추가
ALTER TABLE products
ADD COLUMN IF NOT EXISTS is_new BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_best BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_sale BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_budget BOOLEAN DEFAULT false;

-- 기존 데이터 기본값 설정
UPDATE products 
SET 
  is_new = COALESCE(is_new, false),
  is_best = COALESCE(is_best, false),
  is_sale = COALESCE(is_sale, false),
  is_budget = COALESCE(is_budget, false);

-- 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_products_promotion ON products(promotion_type) WHERE promotion_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_is_new ON products(is_new) WHERE is_new = true;
CREATE INDEX IF NOT EXISTS idx_products_is_best ON products(is_best) WHERE is_best = true;
CREATE INDEX IF NOT EXISTS idx_products_is_sale ON products(is_sale) WHERE is_sale = true;
CREATE INDEX IF NOT EXISTS idx_products_is_budget ON products(is_budget) WHERE is_budget = true;

-- 완료 메시지
SELECT '✅ 프로모션 기능 설정 완료! 이제 /admin/promotions 에서 프로모션을 만들 수 있습니다.' as message;

