-- flash_sale_settings 테이블 제거
-- 타임딜 제목, 시작/종료 시간은 collections 테이블로 통합됨

-- flash_sale_settings 테이블 삭제
DROP TABLE IF EXISTS flash_sale_settings CASCADE;

-- flash_sale 테이블은 유지 (각 상품의 타임딜 가격 저장용)

