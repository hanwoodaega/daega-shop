-- 만료된 order_drafts 수동 정리 (필요 시 Supabase SQL Editor에서 실행)
-- Cron API(/api/cron/cleanup-drafts)로 주기 실행하는 것을 권장.

DELETE FROM order_drafts
WHERE expires_at < now();

-- 삭제된 행 수 확인만 할 때:
-- SELECT count(*) FROM order_drafts WHERE expires_at < now();
