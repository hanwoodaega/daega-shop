-- ==========================================
-- quick_delivery_time을 delivery_time으로 변경
-- ==========================================
--
-- 픽업 시간과 퀵배달 시간을 하나의 컬럼으로 관리
--
-- 사용법:
-- Supabase SQL Editor에서 실행
-- ==========================================

-- 옵션 A: quick_delivery_time이 이미 있는 경우 (컬럼명 변경)
ALTER TABLE orders 
RENAME COLUMN quick_delivery_time TO delivery_time;

-- 옵션 B: quick_delivery_time이 없는 경우 (새로 생성)
-- ALTER TABLE orders 
-- ADD COLUMN IF NOT EXISTS delivery_time VARCHAR(50) DEFAULT NULL;

-- ✅ 완료! 이제 delivery_time 컬럼으로 픽업/퀵배달 시간을 모두 관리합니다.

-- 사용 예시:
-- 픽업: delivery_type='pickup', delivery_time='15:00'
-- 퀵배달: delivery_type='quick', delivery_time='19:00~20:00'
-- 택배: delivery_type='regular', delivery_time=NULL

-- 확인 쿼리:
-- SELECT id, delivery_type, delivery_time FROM orders WHERE delivery_time IS NOT NULL;

