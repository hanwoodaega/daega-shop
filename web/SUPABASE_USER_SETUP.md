# Supabase 사용자 테이블 설정 가이드

## 📋 개요

사용자가 로그인하면 Supabase에 저장되지만, 두 곳에 저장됩니다:
1. **`auth.users`** - Supabase 내장 인증 테이블 (자동 생성)
2. **`public.users`** - 커스텀 사용자 프로필 테이블 (직접 생성 필요)

## 🔧 설정 방법

### 1️⃣ Supabase 대시보드 접속
1. https://supabase.com 로그인
2. 프로젝트 선택
3. 좌측 메뉴에서 **SQL Editor** 클릭

### 2️⃣ 스키마 실행
`supabase-schema.sql` 파일의 내용을 복사하여 SQL Editor에 붙여넣고 실행하세요.

**중요**: 기존 테이블이 있다면 다음 순서로 실행하세요:

#### Option A: 전체 재설정 (주의: 기존 데이터 삭제됨)
```sql
-- 1. 기존 테이블 삭제 (있는 경우)
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS cart_items CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. supabase-schema.sql 전체 실행
```

#### Option B: users 테이블만 추가 (기존 데이터 유지)
```sql
-- users 테이블만 생성
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100),
  phone VARCHAR(20),
  profile_image TEXT,
  provider VARCHAR(50) DEFAULT 'email',
  naver_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, provider)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'provider', 'email')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 인덱스
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_naver_id ON users(naver_id);

-- RLS 정책
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid() = id);
```

### 3️⃣ 기존 사용자 마이그레이션 (선택사항)

이미 auth.users에 사용자가 있다면, public.users로 마이그레이션하세요:

```sql
-- 기존 auth.users 데이터를 public.users로 복사
INSERT INTO public.users (id, email, name, provider)
SELECT 
  id, 
  email,
  COALESCE(raw_user_meta_data->>'name', email) as name,
  COALESCE(raw_user_meta_data->>'provider', 'email') as provider
FROM auth.users
ON CONFLICT (id) DO NOTHING;
```

## ✅ 확인 방법

### 1️⃣ SQL Editor에서 확인
```sql
-- public.users 테이블 확인
SELECT * FROM public.users;

-- auth.users와 조인해서 확인
SELECT 
  u.id,
  u.email,
  u.name,
  u.provider,
  a.created_at as auth_created_at
FROM public.users u
JOIN auth.users a ON u.id = a.id;
```

### 2️⃣ Supabase Dashboard에서 확인
- **Authentication > Users**: auth.users의 사용자 목록
- **Table Editor > users**: public.users의 사용자 프로필

## 🔄 작동 방식

```
사용자 회원가입/로그인
         ↓
   auth.users에 저장
         ↓
   Trigger 자동 실행
         ↓
   public.users에 프로필 생성
```

### Trigger 상세
- **언제**: auth.users에 새 사용자가 INSERT될 때
- **무엇**: 자동으로 public.users에 프로필 레코드 생성
- **데이터**: email, name, provider 등

## 🚨 문제 해결

### 문제: 로그인해도 users 테이블에 안 보임
**원인**: Trigger가 실행되지 않았거나, 기존 사용자
**해결**:
1. Trigger 확인: `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';`
2. 기존 사용자 마이그레이션 실행 (위 참조)

### 문제: "relation public.users does not exist"
**원인**: users 테이블이 생성되지 않음
**해결**: Option B 실행

### 문제: "violates foreign key constraint"
**원인**: auth.users에 없는 사용자를 users에 추가하려고 함
**해결**: auth.users를 통해서만 사용자 생성 (signUp 사용)

## 📊 테이블 구조

### auth.users (Supabase 내장)
- `id` (UUID) - Primary Key
- `email` (VARCHAR)
- `encrypted_password` (VARCHAR)
- `raw_user_meta_data` (JSONB) - 커스텀 데이터
- `created_at` (TIMESTAMP)
- 기타 Supabase 관리 필드들...

### public.users (커스텀)
- `id` (UUID) - Foreign Key → auth.users(id)
- `email` (VARCHAR)
- `name` (VARCHAR)
- `phone` (VARCHAR)
- `profile_image` (TEXT)
- `provider` (VARCHAR) - 'email', 'naver', 'kakao', 'google'
- `naver_id` (VARCHAR) - 네이버 OAuth ID
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## 🔐 보안 (RLS)

Row Level Security가 활성화되어 있어 사용자는 자신의 프로필만 볼 수 있습니다:

```sql
-- 읽기: 본인만
SELECT * FROM users WHERE auth.uid() = id;

-- 수정: 본인만
UPDATE users SET name = '새이름' WHERE auth.uid() = id;
```

## 💡 참고
- Supabase Dashboard의 Authentication 탭에서 auth.users 확인
- Table Editor 탭에서 public.users 확인
- 두 테이블은 Trigger로 자동 동기화됨


