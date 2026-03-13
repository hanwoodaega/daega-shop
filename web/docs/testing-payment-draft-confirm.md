# 결제(draft + confirm) 테스트 가이드

## 1. 사전 준비

### 1) order_drafts 테이블 생성

Supabase SQL Editor에서 실행:

```bash
# 또는 프로젝트 내
cat docs/migrations/add-order-drafts.sql
```

`docs/migrations/add-order-drafts.sql` 내용을 Supabase 대시보드 → SQL Editor에 붙여넣고 실행.

### 2) 환경 변수

- **Mock 테스트**: `NEXT_PUBLIC_TOSS_MOCK=true` 이면 토스 결제창 없이 바로 success 페이지로 리다이렉트.
- **실결제 테스트**: `NEXT_PUBLIC_TOSS_CLIENT_KEY`, `TOSS_SECRET_KEY` 설정 (토스 개발자센터에서 발급).

---

## 2. Mock으로 전체 플로우 테스트 (추천)

토스 API 없이 draft → success → confirm 까지 검증.

1. `.env.local`에 설정:
   ```env
   NEXT_PUBLIC_TOSS_MOCK=true
   ```
   (또는 `NEXT_PUBLIC_TOSS_CLIENT_KEY` 없으면 코드에서 자동으로 mock 처리)

2. 앱 실행:
   ```bash
   npm run dev
   ```

3. 테스트 순서:
   - 장바구니에 상품 넣기 → 결제하기 페이지 이동
   - 배송/주문 정보 입력 후 **결제하기** 클릭
   - **바로** `/checkout/toss/success?paymentKey=MOCK_xxx&orderId=xxx&mock=1` 로 이동해야 함 (토스 창 안 뜸)
   - "결제 확인 중..." 후 주문 완료 페이지(`/orders` 또는 비회원 시 `/order-lookup?...&done=1`)로 이동

4. 확인할 것:
   - [ ] `order_drafts`에 방금 생성된 row가 **없음** (confirm 시 삭제됨)
   - [ ] `orders`에 새 주문 있음, `toss_order_id` = success URL의 orderId
   - [ ] 회원이면 장바구니에서 결제한 상품 제거됨
   - [ ] success URL을 **한 번 더** 열어도 같은 주문으로 리다이렉트 (idempotency)

---

## 3. 실결제(토스) 테스트

1. `.env.local`:
   ```env
   NEXT_PUBLIC_TOSS_CLIENT_KEY=test_ck_...
   TOSS_SECRET_KEY=test_sk_...
   NEXT_PUBLIC_TOSS_MOCK=false
   ```
   (테스트 키는 토스 개발자센터에서 발급)

2. 결제하기 클릭 → 토스 결제창 → 테스트 카드로 결제
3. 결제 완료 후 success 페이지 → confirm 호출 → 주문 생성·리다이렉트까지 동일하게 확인.

---

## 4. 예외 시나리오

### draft 만료

1. draft 생성 후 30분 지나게 하기 (또는 DB에서 `order_drafts.expires_at`을 과거로 수정).
2. 같은 orderId로 success 페이지 접속 (`/checkout/toss/success?orderId=해당uuid&paymentKey=MOCK_xxx&mock=1`).
3. **기대**: 400 "주문 유효 시간이 만료되었습니다. 결제 화면에서 다시 시도해주세요."

### draft 없음 (잘못된 orderId)

1. 존재하지 않는 uuid를 orderId로 success URL 접속.
2. **기대**: 400 "주문 정보를 찾을 수 없습니다. 결제 화면에서 다시 시도해주세요."

### confirm 중복 호출 (idempotency)

1. Mock으로 결제 한 번 성공.
2. 브라우저에서 success URL을 **그대로** 다시 로드 (같은 paymentKey, orderId).
3. **기대**: 동일한 주문으로 리다이렉트, 주문이 2개 생기지 않음.

---

## 5. 디버깅 팁

- **draft가 생성 안 됨**: `POST /api/orders/draft` 호출 실패. Network 탭에서 500/400 확인, 서버 로그에 `[orders/draft]` 로그 확인.
- **success에서 400**: confirm 시 draft 조회 실패 또는 만료. `orderId`가 draft API에서 받은 uuid와 같은지 확인.
- **장바구니가 안 비어짐**: confirm 응답에 `cartRemove`가 오는지, success 페이지에서 해당 배열로 `removeFromCartDB` / `setCartItems` 호출하는지 확인.
