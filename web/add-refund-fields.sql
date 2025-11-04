-- ==========================================
-- orders 테이블에 환불 관련 필드 추가
-- ==========================================
--
-- 환불 상태: null(환불없음), pending(환불대기), processing(환불처리중), completed(환불완료)
--
-- 사용법:
-- Supabase SQL Editor에서 실행
-- ==========================================

-- 1. refund_status 컬럼 추가
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS refund_status VARCHAR(20) DEFAULT NULL;

-- 2. refund_amount 컬럼 추가 (환불 금액)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10, 2) DEFAULT NULL;

-- 3. refund_requested_at 컬럼 추가 (환불 요청 시간)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS refund_requested_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 4. refund_completed_at 컬럼 추가 (환불 완료 시간)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS refund_completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 5. 체크 제약조건 추가
ALTER TABLE orders 
ADD CONSTRAINT check_refund_status 
CHECK (refund_status IN (NULL, 'pending', 'processing', 'completed'));

-- 6. 기존 취소된 주문 업데이트
UPDATE orders 
SET 
  refund_status = 'completed',
  refund_amount = total_amount,
  refund_requested_at = updated_at,
  refund_completed_at = updated_at
WHERE status = 'cancelled' AND refund_status IS NULL;

-- ✅ 완료! 이제 orders 테이블에 환불 관련 필드가 추가되었습니다.

-- 확인 쿼리:
-- SELECT id, status, refund_status, refund_amount, total_amount FROM orders WHERE status = 'cancelled';


