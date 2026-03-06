-- status가 'deleted'인 상품을 DB에서 완전 삭제
-- Supabase Dashboard → SQL Editor에서 실행

-- 1) 해당 상품의 이미지 먼저 삭제 (product_images)
DELETE FROM product_images
WHERE product_id IN (
  SELECT id FROM products WHERE status = 'deleted'
);

-- 2) status='deleted' 인 상품 삭제
DELETE FROM products
WHERE status = 'deleted';

-- 삭제된 행 수 확인이 필요하면 위 DELETE 전에 아래로 개수만 조회할 수 있음:
-- SELECT COUNT(*) FROM products WHERE status = 'deleted';

-- ※ products 삭제 시 FK 오류가 나면, 해당 product_id를 참조하는 테이블을
--   먼저 정리한 뒤 2)를 다시 실행하세요.
--   예: carts, wishlists, collection_products, promotion_products, order_items 등
