-- products 테이블의 category 컬럼 값을 한글에서 영어 slug로 변경
-- 한우 → hanwoo
-- 한돈 → handon
-- 수입육 → imported
-- 닭·오리 → chicken
-- 가공육 → processed
-- 양념육 → seasoned
-- 과일·야채 → vegetable
-- 선물세트 → gift-set

UPDATE products
SET category = 'hanwoo'
WHERE category = '한우';

UPDATE products
SET category = 'handon'
WHERE category = '한돈';

UPDATE products
SET category = 'imported'
WHERE category = '수입육';

UPDATE products
SET category = 'chicken'
WHERE category = '닭·오리';

UPDATE products
SET category = 'processed'
WHERE category = '가공육';

UPDATE products
SET category = 'seasoned'
WHERE category = '양념육';

UPDATE products
SET category = 'vegetable'
WHERE category = '과일·야채';

UPDATE products
SET category = 'gift-set'
WHERE category = '선물세트';

-- 변경 결과 확인 (선택사항)
-- SELECT category, COUNT(*) as count
-- FROM products
-- WHERE status != 'deleted'
-- GROUP BY category
-- ORDER BY category;

