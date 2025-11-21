-- 모든 테이블 데이터 삭제 (외래 키 제약 조건 고려)
-- 주의: 이 스크립트는 모든 데이터를 영구적으로 삭제합니다!

-- 방법 1: TRUNCATE 사용 (더 빠름, Supabase에서 CASCADE가 작동하지 않을 수 있음)
-- 방법 2: DELETE 사용 (아래 주석 해제하여 사용)

-- ============================================
-- 방법 1: TRUNCATE (빠르지만 CASCADE가 안 될 수 있음)
-- ============================================

-- 외래 키를 참조하는 테이블부터 삭제
TRUNCATE TABLE order_items CASCADE;
TRUNCATE TABLE reviews CASCADE;
TRUNCATE TABLE point_history CASCADE;
TRUNCATE TABLE user_coupons CASCADE;

-- 주문 테이블 삭제
TRUNCATE TABLE orders CASCADE;

-- 사용자 관련 테이블 (users는 삭제하지 않음, auth.users에 있음)
TRUNCATE TABLE user_points CASCADE;
TRUNCATE TABLE notifications CASCADE;
TRUNCATE TABLE carts CASCADE;

-- 독립적인 테이블들
TRUNCATE TABLE coupons CASCADE;
TRUNCATE TABLE order_number_offsets CASCADE;

-- ============================================
-- 방법 2: DELETE 사용 (TRUNCATE가 안 될 경우 아래 주석 해제)
-- ============================================

-- DELETE FROM order_items;
-- DELETE FROM reviews;
-- DELETE FROM point_history;
-- DELETE FROM user_coupons;
-- DELETE FROM orders;
-- DELETE FROM user_points;
-- DELETE FROM notifications;
-- DELETE FROM carts;
-- DELETE FROM coupons;
-- DELETE FROM order_number_offsets;

-- 확인용: 각 테이블의 레코드 수 확인
SELECT 
  'order_items' as table_name, COUNT(*) as count FROM order_items
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'reviews', COUNT(*) FROM reviews
UNION ALL
SELECT 'point_history', COUNT(*) FROM point_history
UNION ALL
SELECT 'user_coupons', COUNT(*) FROM user_coupons
UNION ALL
SELECT 'user_points', COUNT(*) FROM user_points
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'carts', COUNT(*) FROM carts
UNION ALL
SELECT 'coupons', COUNT(*) FROM coupons
UNION ALL
SELECT 'order_number_offsets', COUNT(*) FROM order_number_offsets;

