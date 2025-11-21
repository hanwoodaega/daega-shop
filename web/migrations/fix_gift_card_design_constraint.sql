-- gift_card_design 체크 제약 조건 수정
-- 현재 사용하는 값: birthday-1, thanks-1, thanks-2, celebration-1, celebration-2

-- 기존 제약 조건 제거
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_gift_card_design_check;

-- 새로운 제약 조건 추가 (허용되는 값들)
ALTER TABLE orders 
ADD CONSTRAINT orders_gift_card_design_check 
CHECK (
  gift_card_design IS NULL 
  OR gift_card_design IN (
    'birthday',
    'anniversary', 
    'thanks',
    'celebration',
    'birthday-1',
    'thanks-1',
    'thanks-2',
    'celebration-1',
    'celebration-2'
  )
);

