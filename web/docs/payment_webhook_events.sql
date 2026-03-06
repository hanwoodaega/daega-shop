-- 토스 웹훅 중복 수신 방지: transmission_id 기준으로 한 번만 처리
-- Supabase SQL Editor에서 실행하거나 마이그레이션으로 적용

create table if not exists payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  transmission_id text not null,
  event_type text not null default 'PAYMENT_STATUS_CHANGED',
  order_id text,
  payment_key text,
  toss_order_id text,
  outcome text not null,
  processed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint payment_webhook_events_transmission_id_key unique (transmission_id)
);

create index if not exists payment_webhook_events_transmission_id_idx
  on payment_webhook_events (transmission_id);
create index if not exists payment_webhook_events_processed_at_idx
  on payment_webhook_events (processed_at);

comment on table payment_webhook_events is '토스 웹훅 수신 이력 (중복 처리 방지용)';
comment on column payment_webhook_events.transmission_id is '토스 헤더 tosspayments-webhook-transmission-id';
comment on column payment_webhook_events.outcome is 'processed | ignored_already_paid | duplicate';
