-- users 테이블 RLS 정책 설정
-- 사용자는 자신의 정보만 조회/수정할 수 있도록 설정

-- 1. RLS 활성화 (이미 활성화되어 있을 수 있음)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. 기존 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

-- 3. SELECT 정책: 사용자는 자신의 정보만 조회 가능
CREATE POLICY "Users can view own profile"
ON public.users
FOR SELECT
USING (auth.uid() = id);

-- 4. UPDATE 정책: 사용자는 자신의 정보만 수정 가능
CREATE POLICY "Users can update own profile"
ON public.users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 5. INSERT 정책: 사용자는 자신의 프로필만 생성 가능
CREATE POLICY "Users can insert own profile"
ON public.users
FOR INSERT
WITH CHECK (auth.uid() = id);

-- orders 테이블 RLS 정책 설정
-- 사용자는 자신의 주문만 조회할 수 있도록 설정

-- 1. RLS 활성화
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 2. 기존 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;

-- 3. SELECT 정책: 사용자는 자신의 주문만 조회 가능
CREATE POLICY "Users can view own orders"
ON public.orders
FOR SELECT
USING (auth.uid() = user_id);

-- 4. INSERT 정책: 사용자는 자신의 주문만 생성 가능
CREATE POLICY "Users can create own orders"
ON public.orders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 5. UPDATE 정책: 사용자는 자신의 주문만 수정 가능
CREATE POLICY "Users can update own orders"
ON public.orders
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

