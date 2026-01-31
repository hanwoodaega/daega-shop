# OTP/Reset 테이블 스키마

아래 테이블이 있어야 새 회원가입/아이디찾기/비밀번호 재설정이 동작합니다.

## 1) auth_otps

```sql
create table if not exists auth_otps (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  purpose text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  resend_available_at timestamptz not null,
  locked_until timestamptz,
  verified_at timestamptz,
  verification_token_hash text,
  verification_expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists auth_otps_phone_purpose_created_at_idx
  on auth_otps (phone, purpose, created_at desc);
```

## 2) password_reset_tokens

```sql
create table if not exists password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  phone text not null,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists password_reset_tokens_token_hash_idx
  on password_reset_tokens (token_hash);
```

## 3) users 컬럼

```sql
alter table users
  add column if not exists username text;

create unique index if not exists users_username_unique
  on users (username);

create unique index if not exists users_phone_unique
  on users (phone);
```

