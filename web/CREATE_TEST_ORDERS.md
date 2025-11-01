# 테스트 주문 생성 가이드

주문내역 페이지를 테스트하기 위한 샘플 주문 생성 방법입니다.

## 🎯 빠른 시작 (5분)

### 1️⃣ 사용자 ID 확인

**방법 A: Supabase Dashboard**
1. https://supabase.com 접속
2. 프로젝트 선택
3. **Authentication > Users** 클릭
4. 로그인한 사용자의 **ID** 복사 (예: `12345678-1234-1234-1234-123456789abc`)

**방법 B: SQL Editor**
```sql
-- 최근 가입한 사용자 ID 확인
SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 5;
```

### 2️⃣ 상품 ID 확인

**SQL Editor**에서 실행:
```sql
-- 상품 ID 확인
SELECT id, name, price FROM products LIMIT 5;
```

### 3️⃣ 테스트 주문 생성

**옵션 A: 자동 생성 (가장 쉬움) ✅**

아래 SQL을 **복사**하여 Supabase SQL Editor에 붙여넣고:
1. `YOUR_USER_ID_HERE` 부분을 실제 사용자 ID로 교체
2. **Run** 클릭

```sql
-- ====================================
-- 여기만 수정하세요!
-- ====================================
\set user_id 'YOUR_USER_ID_HERE'

-- ====================================
-- 이하 코드는 수정하지 마세요
-- ====================================

-- 테스트 주문 1: 결제 완료 (2일 전)
WITH new_order AS (
  INSERT INTO orders (user_id, total_amount, status, shipping_address, shipping_name, shipping_phone, created_at)
  VALUES (:'user_id', 125000, 'paid', '충청남도 천안시 동남구 연향동 123', '홍길동', '010-1234-5678', NOW() - INTERVAL '2 days')
  RETURNING id
),
products_sample AS (
  SELECT id, price FROM products LIMIT 2
)
INSERT INTO order_items (order_id, product_id, quantity, price)
SELECT 
  (SELECT id FROM new_order),
  id,
  CASE WHEN row_number() OVER () = 1 THEN 2 ELSE 1 END as quantity,
  price
FROM products_sample;

-- 테스트 주문 2: 배송 중 (1일 전)
WITH new_order AS (
  INSERT INTO orders (user_id, total_amount, status, shipping_address, shipping_name, shipping_phone, created_at)
  VALUES (:'user_id', 79000, 'shipped', '퀵배달 - 연향동', '김철수', '010-9876-5432', NOW() - INTERVAL '1 day')
  RETURNING id
),
products_sample AS (
  SELECT id, price FROM products LIMIT 1
)
INSERT INTO order_items (order_id, product_id, quantity, price)
SELECT (SELECT id FROM new_order), id, 1, price FROM products_sample;

-- 테스트 주문 3: 배송 완료 (5일 전)
WITH new_order AS (
  INSERT INTO orders (user_id, total_amount, status, shipping_address, shipping_name, shipping_phone, created_at)
  VALUES (:'user_id', 150000, 'delivered', '매장 픽업', '이영희', '010-5555-6666', NOW() - INTERVAL '5 days')
  RETURNING id
),
products_sample AS (
  SELECT id, price FROM products OFFSET 1 LIMIT 1
)
INSERT INTO order_items (order_id, product_id, quantity, price)
SELECT (SELECT id FROM new_order), id, 3, price FROM products_sample;

SELECT '✅ 테스트 주문 3개가 생성되었습니다!' as result;
```

---

**옵션 B: 수동 생성 (더 세밀한 제어)**

```sql
-- 1. 주문 생성
INSERT INTO orders (
  user_id,
  total_amount,
  status,
  shipping_address,
  shipping_name,
  shipping_phone
) VALUES (
  'YOUR_USER_ID',      -- ← 사용자 ID
  125000,              -- 총 금액
  'paid',              -- 상태: pending/paid/shipped/delivered/cancelled
  '충남 천안시 연향동',  -- 배송지
  '홍길동',             -- 이름
  '010-1234-5678'      -- 전화번호
) RETURNING id;  -- 주문 ID 확인

-- 2. 주문 ID 복사 (예: order_id_here)

-- 3. 주문 아이템 추가
INSERT INTO order_items (
  order_id,
  product_id,           -- ← 상품 ID (위에서 확인)
  quantity,
  price
) VALUES (
  'order_id_here',      -- ← 주문 ID
  'product_id_here',    -- ← 상품 ID
  2,                    -- 수량
  89000                 -- 가격
);
```

---

## 🔍 생성된 주문 확인

### SQL로 확인:
```sql
-- 내 주문 확인
SELECT 
  o.id,
  o.status,
  o.total_amount,
  o.shipping_name,
  o.created_at,
  COUNT(oi.id) as item_count
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.user_id = 'YOUR_USER_ID'
GROUP BY o.id
ORDER BY o.created_at DESC;
```

### 웹에서 확인:
1. 로그인
2. BottomNavbar > **MY** 클릭
3. **주문내역** 클릭
4. 생성된 주문 확인 ✅

---

## 📊 주문 상태 종류

| 상태 | 설명 | 색상 |
|------|------|------|
| `pending` | 결제 대기 | 노란색 |
| `paid` | 결제 완료 | 파란색 |
| `shipped` | 배송 중 | 보라색 |
| `delivered` | 배송 완료 | 초록색 |
| `cancelled` | 주문 취소 | 빨간색 |

---

## 🧹 테스트 주문 삭제

테스트가 끝나면 삭제:

```sql
-- 특정 사용자의 모든 주문 삭제
DELETE FROM orders WHERE user_id = 'YOUR_USER_ID';
-- order_items도 자동으로 삭제됩니다 (CASCADE)
```

---

## 💡 팁

### 다양한 시나리오 테스트:
```sql
-- 오늘 주문
created_at = NOW()

-- 어제 주문
created_at = NOW() - INTERVAL '1 day'

-- 1주일 전 주문
created_at = NOW() - INTERVAL '7 days'

-- 1달 전 주문
created_at = NOW() - INTERVAL '1 month'
```

### 여러 상품 주문:
```sql
-- 주문 생성 후 여러 아이템 추가
INSERT INTO order_items (order_id, product_id, quantity, price) VALUES
  ('order_id', 'product_id_1', 2, 89000),
  ('order_id', 'product_id_2', 1, 18000),
  ('order_id', 'product_id_3', 3, 15000);
```

---

## 🚨 문제 해결

### "Foreign key constraint" 에러
- **원인**: 존재하지 않는 user_id 또는 product_id
- **해결**: 1단계로 돌아가서 ID 다시 확인

### 주문이 안 보임
- **원인**: 다른 사용자 ID로 생성
- **해결**: WHERE user_id = 'YOUR_USER_ID' 로 확인

### RLS 에러 (Row Level Security)
- **원인**: 정책이 활성화되어 있음
- **해결**: SQL Editor는 RLS를 우회하므로 문제없음

---

## ✅ 체크리스트

- [ ] 사용자 ID 확인
- [ ] 상품 ID 확인
- [ ] SQL 스크립트에서 ID 교체
- [ ] SQL 실행
- [ ] 웹에서 주문내역 확인
- [ ] 테스트 완료 후 데이터 삭제 (선택)

---

이제 주문내역 페이지를 테스트할 수 있습니다! 🎉

