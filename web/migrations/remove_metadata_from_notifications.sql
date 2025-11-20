-- notifications 테이블에서 metadata 필드 제거
ALTER TABLE notifications 
DROP COLUMN IF EXISTS metadata;

-- 인덱스도 제거
DROP INDEX IF EXISTS idx_notifications_metadata;

