-- notifications 테이블에 metadata 필드 추가
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 인덱스 생성 (선택사항)
CREATE INDEX IF NOT EXISTS idx_notifications_metadata ON notifications USING GIN (metadata);

