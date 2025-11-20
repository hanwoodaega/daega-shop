-- 주문 생성 시 포인트 적립 방지
-- create_order_with_transaction 함수에서 포인트 적립 로직이 있다면 제거해야 합니다.

-- 데이터베이스 함수 확인 방법:
-- Supabase Dashboard > SQL Editor에서 다음 쿼리 실행:
-- 
-- SELECT pg_get_functiondef(oid) 
-- FROM pg_proc 
-- WHERE proname = 'create_order_with_transaction';

-- 만약 함수 내부에 포인트 적립 로직이 있다면, 해당 부분을 제거하거나 주석 처리해야 합니다.
-- 포인트 적립은 구매확정 시(/api/orders/confirm)에만 이루어져야 합니다.

-- 참고: 주문 생성 시에는 포인트를 적립하지 않습니다.
-- 포인트 적립은 배송완료 후 사용자가 구매확정 버튼을 눌렀을 때만 발생합니다.

