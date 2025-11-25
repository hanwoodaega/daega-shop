# Products 테이블 컬럼 제거 가이드

## 제거 가능한 컬럼 목록

스키마 재구성에 따라 다음 컬럼들을 제거할 수 있습니다:

### 1. 할인 관련 컬럼
- ✅ **discount_percent** → `promotions` 테이블로 이동
  - 할인율 정보는 `promotions` 테이블의 `promotion_type='percent'`로 관리

### 2. 프로모션 관련 컬럼
- ✅ **promotion_type** → `promotions` 테이블로 이동
  - '1+1', '2+1', '3+1' 등은 `promotions` 테이블의 `promotion_type='bundle'`로 관리
- ✅ **promotion_products** → `promotions` 테이블로 이동
  - 증정 상품 정보는 `promotion_products` 테이블로 관리

### 3. 타임딜 관련 컬럼
- ✅ **is_flash_sale** → `flash_sale` 테이블로 이동
  - 타임딜 여부는 `flash_sale` 테이블의 존재 여부로 판단
- ✅ **flash_sale_price** → `flash_sale` 테이블로 이동
  - 타임딜 가격은 `flash_sale.price`로 관리
- ✅ **flash_sale_end_time** → `flash_sale` 테이블로 이동
  - 타임딜 종료 시간은 `flash_sale.end_at`으로 관리

### 4. 선물 관련 컬럼
- ✅ **gift_target** → `gift_category_products` 테이블로 이동
  - 선물 대상은 `gift_categories`와 `gift_category_products`로 관리
- ✅ **gift_display_order** → `gift_category_products` 테이블로 이동
  - 표시 순서는 `gift_category_products.priority`로 관리
- ✅ **gift_budget_targets** → `gift_category_products` 테이블로 이동
  - 예산 카테고리는 `gift_categories`와 `gift_category_products`로 관리
- ✅ **gift_budget_order** → `gift_category_products` 테이블로 이동
  - 예산별 순서는 `gift_category_products.priority`로 관리
- ✅ **gift_featured** → `gift_category_products` 테이블로 이동
  - 실시간 인기 여부는 'featured' 카테고리로 관리
- ✅ **gift_featured_order** → `gift_category_products` 테이블로 이동
  - 실시간 인기 순서는 `gift_category_products.priority`로 관리

### 5. 필터링용 컬럼
- ✅ **is_best** → `collections` 테이블로 이동
  - "베스트" 컬렉션으로 관리
- ✅ **is_sale** → `collections` 테이블로 이동
  - "특가" 컬렉션으로 관리

## 최종 products 테이블 구조

제거 후 남을 컬럼:

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | UUID | 기본키 |
| slug | TEXT | URL 슬러그 |
| brand | TEXT | 브랜드명 |
| name | TEXT | 상품명 |
| price | NUMERIC | 가격 |
| image_url | TEXT | 이미지 URL |
| category | TEXT | 카테고리 |
| average_rating | NUMERIC | 평균 별점 |
| review_count | INTEGER | 리뷰 개수 |
| created_at | TIMESTAMP | 생성일시 |
| updated_at | TIMESTAMP | 수정일시 |

**제거 완료:**
- `is_best` - 컬렉션 시스템으로 대체됨
- `is_sale` - 컬렉션 시스템으로 대체됨

## 제거 순서

1. **1단계: 데이터 마이그레이션**
   - `migrations/restructure_products_schema.sql` 실행
   - 기존 데이터를 새 테이블로 마이그레이션

2. **2단계: 애플리케이션 코드 업데이트**
   - 모든 쿼리에서 제거할 컬럼 참조 제거
   - 새 테이블 구조에 맞게 코드 수정

3. **3단계: 컬럼 제거**
   - 애플리케이션 코드 업데이트 완료 후
   - `ALTER TABLE products DROP COLUMN ...` 실행

## 주의사항

⚠️ **중요**: 컬럼 제거 전에 반드시:
1. 데이터 마이그레이션 완료 확인
2. 애플리케이션 코드에서 해당 컬럼 사용 여부 확인
3. 백업 수행
4. 테스트 환경에서 먼저 검증

## 제거 스크립트 예시

```sql
-- 데이터 마이그레이션 완료 후 실행
ALTER TABLE products 
  DROP COLUMN IF EXISTS discount_percent,
  DROP COLUMN IF EXISTS promotion_type,
  DROP COLUMN IF EXISTS promotion_products,
  DROP COLUMN IF EXISTS is_flash_sale,
  DROP COLUMN IF EXISTS flash_sale_price,
  DROP COLUMN IF EXISTS flash_sale_end_time,
  DROP COLUMN IF EXISTS gift_target,
  DROP COLUMN IF EXISTS gift_display_order,
  DROP COLUMN IF EXISTS gift_budget_targets,
  DROP COLUMN IF EXISTS gift_budget_order,
  DROP COLUMN IF EXISTS gift_featured,
  DROP COLUMN IF EXISTS gift_featured_order,
  DROP COLUMN IF EXISTS is_best,
  DROP COLUMN IF EXISTS is_sale;
```

