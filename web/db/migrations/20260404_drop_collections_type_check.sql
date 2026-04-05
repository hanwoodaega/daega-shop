-- collections.type was limited by a check constraint (e.g. best, sale, no9 only).
-- Admin can define arbitrary URL-safe types; public API matches on type string.
ALTER TABLE collections DROP CONSTRAINT IF EXISTS collections_type_check;
