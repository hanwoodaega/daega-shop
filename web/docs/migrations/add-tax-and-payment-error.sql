-- 결제 검증 및 비과세 금액 지원을 위한 스키마 변경
-- Supabase SQL Editor 또는 마이그레이션 도구에서 실행

-- 1. products.tax_type (과세/비과세 구분)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS tax_type text DEFAULT 'taxable'
  CHECK (tax_type IN ('taxable', 'tax_free'));

COMMENT ON COLUMN products.tax_type IS '과세(taxable) 또는 비과세(tax_free). 기본: taxable';

-- 2. orders.tax_free_amount (비과세 금액, 토스 검증용)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS tax_free_amount integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN orders.tax_free_amount IS '비과세 금액 합계(원). 토스 결제 검증 시 사용';

-- 3. orders.points_used, orders.coupon_discount_amount (할인 스냅샷)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS points_used integer NOT NULL DEFAULT 0;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS coupon_discount_amount integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN orders.points_used IS '주문 당시 실제 사용된 포인트 합계(원) 스냅샷';
COMMENT ON COLUMN orders.coupon_discount_amount IS '주문 당시 실제 적용된 쿠폰 할인 금액(원) 스냅샷';

-- 4. orders.status에 'payment_error' 사용 가능
-- (status가 text/varchar면 별도 수정 불필요)
