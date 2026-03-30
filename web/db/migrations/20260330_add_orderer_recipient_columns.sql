-- Add sender/recipient columns for non-link gift flow.
-- Keep shipping_* for backward compatibility and existing lookup APIs.

alter table if exists public.orders
  add column if not exists orderer_name text,
  add column if not exists orderer_phone text,
  add column if not exists recipient_name text,
  add column if not exists recipient_phone text;

-- Backfill existing rows so old data remains query-friendly.
update public.orders
set
  orderer_name = coalesce(orderer_name, shipping_name),
  orderer_phone = coalesce(orderer_phone, shipping_phone),
  recipient_name = coalesce(recipient_name, shipping_name),
  recipient_phone = coalesce(recipient_phone, shipping_phone)
where
  orderer_name is null
  or orderer_phone is null
  or recipient_name is null
  or recipient_phone is null;
