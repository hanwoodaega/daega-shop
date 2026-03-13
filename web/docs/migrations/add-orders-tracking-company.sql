-- orders 테이블에 택배사(tracking_company) 컬럼 추가
-- 배송조회 링크: https://tracker.delivery/#/{택배사코드}/{송장번호}
-- 한글 택배사명 저장 (예: 롯데택배, CJ대한통운)

alter table public.orders
  add column if not exists tracking_company text;

comment on column public.orders.tracking_company is '택배사명 (한글, 예: 롯데택배). tracker.delivery 배송조회용 코드 매핑에 사용';
