-- user_points 테이블 RLS 정책 설정

-- RLS 활성화
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Users can view their own points" ON user_points;
DROP POLICY IF EXISTS "Users can insert their own points" ON user_points;
DROP POLICY IF EXISTS "Users can update their own points" ON user_points;

-- 사용자는 자신의 포인트만 조회 가능
CREATE POLICY "Users can view their own points"
  ON user_points
  FOR SELECT
  USING (auth.uid() = user_id);

-- 사용자는 자신의 포인트 레코드만 생성 가능
CREATE POLICY "Users can insert their own points"
  ON user_points
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 포인트만 수정 가능
CREATE POLICY "Users can update their own points"
  ON user_points
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

