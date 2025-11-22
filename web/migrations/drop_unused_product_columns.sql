-- =====================================================
-- Products 테이블 불필요한 컬럼 제거
-- =====================================================
-- 주의: 이 스크립트는 애플리케이션 코드 업데이트 완료 후에만 실행하세요!
-- =====================================================

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

-- 필터링용 컬럼 제거 (컬렉션 시스템으로 대체됨)
ALTER TABLE products DROP COLUMN IF EXISTS is_best;
ALTER TABLE products DROP COLUMN IF EXISTS is_sale;

