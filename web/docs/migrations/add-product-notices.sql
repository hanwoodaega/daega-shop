-- 상품고시정보 마스터/값 테이블
-- - 카테고리별 고시 항목 정의 + 상품별 값 저장

create table if not exists public.product_notice_categories (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.product_notice_fields (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid not null references public.product_notice_categories(id) on delete cascade,
  key text not null,
  label text not null,
  required boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.product_notice_values (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  field_id uuid not null references public.product_notice_fields(id) on delete cascade,
  value text not null,
  created_at timestamptz not null default now(),
  unique (product_id, field_id)
);

-- products 테이블에 고시 카테고리 참조 컬럼 추가 (상품당 1개 카테고리 기준)
alter table public.products
  add column if not exists notice_category_id uuid references public.product_notice_categories(id);

create index if not exists idx_product_notice_values_product
  on public.product_notice_values (product_id);

-- RLS 설정: 상품고시정보는 누구나 읽기 가능, 쓰기는 service_role(API)만 사용
alter table public.product_notice_categories enable row level security;
alter table public.product_notice_fields enable row level security;
alter table public.product_notice_values enable row level security;

create policy "Allow public read for notice categories"
  on public.product_notice_categories for select
  to anon, authenticated
  using (true);

create policy "Allow public read for notice fields"
  on public.product_notice_fields for select
  to anon, authenticated
  using (true);

create policy "Allow public read for notice values"
  on public.product_notice_values for select
  to anon, authenticated
  using (true);

