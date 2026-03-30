-- orders 테이블의 레거시 선물/수령인 컬럼 제거
alter table if exists public.orders
  drop column if exists shipping_name,
  drop column if exists shipping_phone,
  drop column if exists is_gift,
  drop column if exists gift_token,
  drop column if exists gift_message,
  drop column if exists gift_expires_at,
  drop column if exists gift_recipient_phone,
  drop column if exists payment_method;
