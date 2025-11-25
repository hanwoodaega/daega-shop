-- flash_sale 테이블 제거
-- 타임딜은 이제 전시만 하며, 별도 할인 가격을 설정하지 않음
-- 기존 할인/프로모션이 있는 상품들을 타임딜 컬렉션에 추가하여 전시

-- flash_sale 테이블 삭제
DROP TABLE IF EXISTS flash_sale CASCADE;

-- 참고: 타임딜 상품은 collections 테이블의 'timedeal' 컬렉션과
-- collection_products 테이블을 통해 관리됩니다.
-- 각 상품의 기존 가격과 프로모션 정보는 products, promotions 테이블에서 관리됩니다.



