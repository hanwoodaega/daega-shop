# Toss Payments Webhook Setup

## 1) DB schema updates
Add columns to store Toss order/payment identifiers.

```sql
alter table orders
  add column if not exists toss_order_id text,
  add column if not exists toss_payment_key text;

create index if not exists orders_toss_order_id_idx
  on orders (toss_order_id);

create index if not exists orders_toss_payment_key_idx
  on orders (toss_payment_key);
```

## 2) Webhook endpoint
The webhook endpoint is:

```
/api/payments/toss/webhook
```

Register this URL in the Toss Payments Developer Center Webhook menu.

## 3) 현재 동작 (1단계 — 최소 방어)
- **이미 결제완료(ORDER_RECEIVED)면** 주문 조회 후 바로 200 반환, 재처리 안 함.
- **같은 orderId / 이미 반영된 상태**면 업데이트 스킵 후 200.
- try/catch로 예외 시에도 200 반환 (토스 재전송 유도 방지).
- 로그에 `eventType`, `paymentKey`, `orderId` 출력 (`[Toss webhook]`).

**2단계(선택)**  
웹훅 중복이 자주 보이거나, 문자/재고 등 부작용·장애 추적이 필요해지면 `docs/payment_webhook_events.sql` 로 `payment_webhook_events` 테이블과 `transmission_id` unique를 추가해 두 단계로 확장할 수 있습니다.

## 4) Notes
- Webhook events are sent as JSON via POST.
- The handler verifies the payment by calling Toss Payments with `TOSS_SECRET_KEY`.
- Order status updates:
  - `DONE` -> `ORDER_RECEIVED`
  - `CANCELED`, `PARTIAL_CANCELED`, `ABORTED`, `EXPIRED` -> `cancelled`
