-- ==========================================
-- orders 테이블에 퀵배달 시간대 컬럼 추가
-- ==========================================
--
-- 사용법:
-- Supabase SQL Editor에서 실행
-- ==========================================

-- 1. quick_delivery_time 컬럼 추가
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS quick_delivery_time VARCHAR(50) DEFAULT NULL;

-- ✅ 완료! 이제 퀵배달 시간대를 저장할 수 있습니다.

-- 예시:
-- - "10:00~11:00"
-- - "19:00~20:00"
-- - "21:00~22:00"

-- 확인 쿼리:
-- SELECT id, delivery_type, quick_delivery_time FROM orders WHERE delivery_type = 'quick';


