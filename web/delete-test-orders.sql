-- ==========================================
-- 테스트 주문 삭제 스크립트
-- ==========================================
-- 
-- 사용법:
-- 1. YOUR_USER_ID를 실제 사용자 ID로 교체
-- 2. Supabase SQL Editor에 붙여넣고 Run
-- 3. 완료!
--
-- 주의: 이 작업은 되돌릴 수 없습니다!
-- ==========================================

-- ==========================================
-- 옵션 1: 특정 사용자의 모든 주문 삭제 (추천)
-- ==========================================
DELETE FROM orders 
WHERE user_id = 'YOUR_USER_ID';  -- ← 여기를 수정!

-- order_items는 CASCADE로 자동 삭제됩니다

-- ==========================================
-- 옵션 2: 최근 주문만 삭제 (최근 3개)
-- ==========================================
/*
DELETE FROM orders 
WHERE user_id = 'YOUR_USER_ID'  -- ← 여기를 수정!
AND id IN (
  SELECT id FROM orders 
  WHERE user_id = 'YOUR_USER_ID'  -- ← 여기를 수정!
  ORDER BY created_at DESC 
  LIMIT 3
);
*/

-- ==========================================
-- 옵션 3: 특정 날짜 이후 주문만 삭제 (오늘 생성된 주문)
-- ==========================================
/*
DELETE FROM orders 
WHERE user_id = 'YOUR_USER_ID'  -- ← 여기를 수정!
AND created_at >= CURRENT_DATE;
*/

-- ==========================================
-- 옵션 4: 특정 주문 ID로 삭제
-- ==========================================
/*
DELETE FROM orders 
WHERE id = 'ORDER_ID_HERE';  -- ← 주문 ID 입력
*/

-- ==========================================
-- 삭제 전 확인: 내 주문 목록 보기
-- ==========================================
/*
SELECT 
  id,
  status,
  total_amount,
  shipping_name,
  created_at
FROM orders 
WHERE user_id = 'YOUR_USER_ID'  -- ← 여기를 수정!
ORDER BY created_at DESC;
*/

-- ✅ 완료! 주문이 삭제되었습니다.

