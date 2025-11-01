-- ==========================================
-- orders 테이블에 배달 유형(delivery_type) 추가
-- ==========================================
--
-- 배달 유형: pickup(픽업), quick(퀵배달), regular(택배배달)
--
-- 사용법:
-- Supabase SQL Editor에서 실행
-- ==========================================

-- 1. delivery_type 컬럼 추가
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS delivery_type VARCHAR(20) DEFAULT 'regular';

-- 2. 기존 데이터 업데이트 (shipping_address를 기반으로 추측)
UPDATE orders 
SET delivery_type = CASE
  WHEN shipping_address LIKE '%픽업%' OR shipping_address LIKE '%매장%' THEN 'pickup'
  WHEN shipping_address LIKE '%퀵배달%' THEN 'quick'
  ELSE 'regular'
END
WHERE delivery_type IS NULL OR delivery_type = 'regular';

-- 3. 체크 제약조건 추가 (선택사항)
ALTER TABLE orders 
ADD CONSTRAINT check_delivery_type 
CHECK (delivery_type IN ('pickup', 'quick', 'regular'));

-- 4. 인덱스 생성 (선택사항 - 배달 유형별 조회가 많을 경우)
CREATE INDEX IF NOT EXISTS idx_orders_delivery_type ON orders(delivery_type);

-- ✅ 완료! 이제 orders 테이블에 delivery_type 컬럼이 추가되었습니다.

-- 확인 쿼리:
-- SELECT id, delivery_type, shipping_address, status FROM orders ORDER BY created_at DESC LIMIT 10;

