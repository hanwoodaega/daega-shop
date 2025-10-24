-- 추가 상품 데이터 삽입

-- 한우 추가 상품
INSERT INTO products (name, description, price, image_url, category, stock, unit, weight, origin) VALUES
('한우 1++ 꽃등심', '마블링이 풍부한 최상급 꽃등심입니다.', 98000, 'https://via.placeholder.com/400x300?text=꽃등심', '한우', 35, 'kg', 1.0, '국내산 한우'),
('한우 1+ 갈비살', '구이용으로 최고인 한우 갈비살입니다.', 75000, 'https://via.placeholder.com/400x300?text=갈비살', '한우', 45, 'kg', 1.0, '국내산 한우'),
('한우 1+ 살치살', '부드럽고 고소한 한우 살치살입니다.', 82000, 'https://via.placeholder.com/400x300?text=살치살', '한우', 30, 'kg', 1.0, '국내산 한우'),
('한우 1등급 국거리', '국물요리에 최적화된 한우입니다.', 42000, 'https://via.placeholder.com/400x300?text=국거리', '한우', 60, 'kg', 1.0, '국내산 한우'),
('한우 1등급 사태', '찜이나 장조림용 한우 사태입니다.', 38000, 'https://via.placeholder.com/400x300?text=사태', '한우', 50, 'kg', 1.0, '국내산 한우');

-- 돼지고기 추가 상품
INSERT INTO products (name, description, price, image_url, category, stock, unit, weight, origin) VALUES
('돼지 앞다리살', '부드러운 식감의 앞다리살입니다.', 12000, 'https://via.placeholder.com/400x300?text=앞다리살', '돼지고기', 90, 'kg', 1.0, '국내산'),
('돼지 뒷다리살', '구이와 볶음에 좋은 뒷다리살입니다.', 13000, 'https://via.placeholder.com/400x300?text=뒷다리살', '돼지고기', 85, 'kg', 1.0, '국내산'),
('돼지 항정살', '고급스러운 맛의 항정살입니다.', 22000, 'https://via.placeholder.com/400x300?text=항정살', '돼지고기', 65, 'kg', 1.0, '국내산'),
('돼지 가브리살', '담백하고 부드러운 가브리살입니다.', 19000, 'https://via.placeholder.com/400x300?text=가브리살', '돼지고기', 70, 'kg', 1.0, '국내산'),
('돼지 등갈비', '찜용 등갈비입니다.', 16000, 'https://via.placeholder.com/400x300?text=등갈비', '돼지고기', 75, 'kg', 1.0, '국내산');

-- 수입육 추가 상품
INSERT INTO products (name, description, price, image_url, category, stock, unit, weight, origin) VALUES
('미국산 티본 스테이크', '두 가지 부위를 즐기는 티본 스테이크입니다.', 52000, 'https://via.placeholder.com/400x300?text=티본', '수입육', 55, 'kg', 1.0, '미국산'),
('호주산 채끝등심', '부드러운 호주산 등심입니다.', 42000, 'https://via.placeholder.com/400x300?text=호주등심', '수입육', 65, 'kg', 1.0, '호주산'),
('미국산 안심', '스테이크용 최고급 안심입니다.', 58000, 'https://via.placeholder.com/400x300?text=미국안심', '수입육', 45, 'kg', 1.0, '미국산'),
('호주산 양갈비', '특유의 풍미가 있는 양갈비입니다.', 35000, 'https://via.placeholder.com/400x300?text=양갈비', '수입육', 50, 'kg', 1.0, '호주산');

-- 닭 상품
INSERT INTO products (name, description, price, image_url, category, stock, unit, weight, origin) VALUES
('국내산 생닭', '신선한 국내산 통닭입니다.', 8000, 'https://via.placeholder.com/400x300?text=생닭', '닭', 120, 'kg', 1.0, '국내산'),
('닭가슴살', '고단백 저지방 닭가슴살입니다.', 12000, 'https://via.placeholder.com/400x300?text=닭가슴살', '닭', 150, 'kg', 1.0, '국내산'),
('닭다리살', '부드럽고 맛있는 닭다리살입니다.', 10000, 'https://via.placeholder.com/400x300?text=닭다리살', '닭', 140, 'kg', 1.0, '국내산'),
('닭날개', '바삭하게 튀겨먹기 좋은 닭날개입니다.', 9000, 'https://via.placeholder.com/400x300?text=닭날개', '닭', 130, 'kg', 1.0, '국내산'),
('닭안심', '부드러운 닭안심입니다.', 13000, 'https://via.placeholder.com/400x300?text=닭안심', '닭', 110, 'kg', 1.0, '국내산'),
('국내산 오리고기', '건강한 국내산 오리고기입니다.', 15000, 'https://via.placeholder.com/400x300?text=오리고기', '닭', 80, 'kg', 1.0, '국내산');

-- 가공육 상품
INSERT INTO products (name, description, price, image_url, category, stock, unit, weight, origin) VALUES
('프리미엄 소시지', '최고급 돼지고기로 만든 소시지입니다.', 18000, 'https://via.placeholder.com/400x300?text=소시지', '가공육', 200, 'kg', 0.5, '국내산'),
('베이컨', '구이와 샌드위치에 최고인 베이컨입니다.', 22000, 'https://via.placeholder.com/400x300?text=베이컨', '가공육', 180, 'kg', 0.5, '국내산'),
('프랑크 소시지', '어린이들이 좋아하는 프랑크 소시지입니다.', 15000, 'https://via.placeholder.com/400x300?text=프랑크', '가공육', 220, 'kg', 0.5, '국내산'),
('햄', '샌드위치와 김밥용 햄입니다.', 12000, 'https://via.placeholder.com/400x300?text=햄', '가공육', 250, 'kg', 0.5, '국내산'),
('슬라이스 햄', '얇게 썬 슬라이스 햄입니다.', 14000, 'https://via.placeholder.com/400x300?text=슬라이스햄', '가공육', 200, 'kg', 0.5, '국내산'),
('목살 햄', '두툼한 목살 햄입니다.', 16000, 'https://via.placeholder.com/400x300?text=목살햄', '가공육', 170, 'kg', 0.5, '국내산'),
('스팸', '다양한 요리에 활용되는 스팸입니다.', 8000, 'https://via.placeholder.com/400x300?text=스팸', '가공육', 300, '개', 0.3, '수입산');

-- 조리육 상품
INSERT INTO products (name, description, price, image_url, category, stock, unit, weight, origin) VALUES
('양념 돼지갈비', '바로 구워먹을 수 있는 양념 돼지갈비입니다.', 25000, 'https://via.placeholder.com/400x300?text=양념갈비', '조리육', 100, 'kg', 1.0, '국내산'),
('양념 LA갈비', '부드러운 LA갈비에 양념을 더했습니다.', 58000, 'https://via.placeholder.com/400x300?text=양념LA갈비', '조리육', 80, 'kg', 1.0, '미국산'),
('불고기', '즉석에서 바로 요리할 수 있는 불고기입니다.', 32000, 'https://via.placeholder.com/400x300?text=불고기', '조리육', 120, 'kg', 1.0, '국내산 한우'),
('닭갈비', '매콤달콤한 닭갈비입니다.', 18000, 'https://via.placeholder.com/400x300?text=닭갈비', '조리육', 150, 'kg', 1.0, '국내산'),
('제육볶음', '바로 볶아먹는 제육볶음입니다.', 20000, 'https://via.placeholder.com/400x300?text=제육볶음', '조리육', 130, 'kg', 1.0, '국내산'),
('양념 삼겹살', '특제 양념에 재운 삼겹살입니다.', 22000, 'https://via.placeholder.com/400x300?text=양념삼겹살', '조리육', 110, 'kg', 1.0, '국내산'),
('너비아니', '전통 방식의 너비아니입니다.', 45000, 'https://via.placeholder.com/400x300?text=너비아니', '조리육', 70, 'kg', 1.0, '국내산 한우');

-- 야채 상품
INSERT INTO products (name, description, price, image_url, category, stock, unit, weight, origin) VALUES
('상추', '신선한 쌈 채소 상추입니다.', 5000, 'https://via.placeholder.com/400x300?text=상추', '야채', 200, '단', 0.3, '국내산'),
('깻잎', '향긋한 깻잎입니다.', 4500, 'https://via.placeholder.com/400x300?text=깻잎', '야채', 180, '단', 0.2, '국내산'),
('양파', '구이와 샐러드에 좋은 양파입니다.', 3000, 'https://via.placeholder.com/400x300?text=양파', '야채', 300, 'kg', 1.0, '국내산'),
('마늘', '국내산 깐마늘입니다.', 12000, 'https://via.placeholder.com/400x300?text=마늘', '야채', 150, 'kg', 0.5, '국내산'),
('대파', '국과 찌개에 필수인 대파입니다.', 4000, 'https://via.placeholder.com/400x300?text=대파', '야채', 250, '단', 0.3, '국내산'),
('고추', '매운맛을 더하는 고추입니다.', 8000, 'https://via.placeholder.com/400x300?text=고추', '야채', 120, 'kg', 0.5, '국내산'),
('버섯 모듬', '다양한 버섯 모듬입니다.', 9000, 'https://via.placeholder.com/400x300?text=버섯', '야채', 160, 'kg', 0.5, '국내산'),
('쌈채소 세트', '여러 가지 쌈채소 세트입니다.', 15000, 'https://via.placeholder.com/400x300?text=쌈채소', '야채', 140, '세트', 1.0, '국내산'),
('브로콜리', '신선한 브로콜리입니다.', 6000, 'https://via.placeholder.com/400x300?text=브로콜리', '야채', 100, 'kg', 0.5, '국내산'),
('파프리카', '빨강 노랑 파프리카입니다.', 7000, 'https://via.placeholder.com/400x300?text=파프리카', '야채', 130, 'kg', 0.5, '국내산');

