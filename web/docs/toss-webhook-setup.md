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

## 3) Notes
- Webhook events are sent as JSON via POST.
- The handler verifies the payment by calling Toss Payments with `TOSS_SECRET_KEY`.
- Order status updates:
  - `DONE` -> `ORDER_RECEIVED`
  - `CANCELED`, `PARTIAL_CANCELED`, `ABORTED`, `EXPIRED` -> `cancelled`
