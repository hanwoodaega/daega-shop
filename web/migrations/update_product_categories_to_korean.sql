-- products 테이블의 category 컬럼 값을 영어 slug에서 한글로 변경
-- hanwoo → 한우
-- handon → 한돈
-- imported → 수입육
-- chicken → 닭·오리
-- processed → 가공육
-- seasoned → 양념육
-- vegetable → 과일·야채
-- gift-set → 선물세트

UPDATE products
SET category = '한우'
WHERE category = 'hanwoo';

UPDATE products
SET category = '한돈'
WHERE category = 'handon';

UPDATE products
SET category = '수입육'
WHERE category = 'imported';

UPDATE products
SET category = '닭·오리'
WHERE category = 'chicken';

UPDATE products
SET category = '가공육'
WHERE category = 'processed';

UPDATE products
SET category = '양념육'
WHERE category = 'seasoned';

UPDATE products
SET category = '과일·야채'
WHERE category = 'vegetable';

UPDATE products
SET category = '선물세트'
WHERE category = 'gift-set';

-- 변경 결과 확인 (선택사항)
-- SELECT category, COUNT(*) as count
-- FROM products
-- WHERE status != 'deleted'
-- GROUP BY category
-- ORDER BY category;

