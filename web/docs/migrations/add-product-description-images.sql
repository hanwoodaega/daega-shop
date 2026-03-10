-- 상품 설명 이미지 테이블
-- - 각 상품별 설명용 이미지를 여러 장 저장
-- - 실제 파일은 Supabase Storage (예: bucket: product-descriptions)에 저장하고,
--   이 테이블에는 public URL 또는 storage 경로만 보관

create table if not exists public.product_description_images (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- 같은 상품 내에서 정렬 순서를 빠르게 조회하기 위한 인덱스
create index if not exists idx_product_description_images_product_sort
  on public.product_description_images (product_id, sort_order);

-- RLS: 상품 상세 페이지에서 비로그인 사용자도 설명 이미지를 볼 수 있도록 공개 읽기 허용
alter table public.product_description_images enable row level security;

create policy "Allow public read for product description images"
  on public.product_description_images for select
  to anon, authenticated
  using (true);

-- 관리자 API는 service_role로 호출하므로 RLS를 우회하여 insert/update/delete 가능