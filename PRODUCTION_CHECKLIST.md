# 상용화 배포 체크리스트

> 대가 쇼핑몰을 실제 운영 환경에 배포하기 전 반드시 개선해야 할 사항들을 정리한 문서입니다.

## 🔴 필수 (Critical) - 배포 전 반드시 구현

### 1. 결제 시스템 연동 ⭐⭐⭐

#### 1.1 PG사 선택 및 계약
**현재 상태**: 결제 기능 없음 (주문만 저장)

**필요 작업**:
- [ ] **PG사 선택 및 계약**
  - 추천: 토스페이먼츠, 네이버페이, 카카오페이, 나이스페이, KG이니시스
  - 수수료 비교 (일반적으로 3.0~3.5%)
  - 정산 주기 확인 (D+1, D+7 등)
  
- [ ] **결제 모듈 구현**
  ```typescript
  // 예시: 토스페이먼츠
  import { loadTossPayments } from '@tosspayments/payment-sdk'
  
  const tossPayments = await loadTossPayments(clientKey)
  await tossPayments.requestPayment('카드', {
    amount: total,
    orderId: orderId,
    orderName: '주문명',
    successUrl: `${window.location.origin}/order/success`,
    failUrl: `${window.location.origin}/order/fail`,
  })
  ```

- [ ] **결제 검증 (필수!)**
  ```typescript
  // /api/payment/verify
  // 클라이언트에서 받은 금액과 서버에서 계산한 금액 비교
  const serverCalculatedAmount = calculateOrderTotal(items)
  if (clientAmount !== serverCalculatedAmount) {
    throw new Error('결제 금액 위변조 감지')
  }
  ```

- [ ] **결제 상태 관리**
  - `orders` 테이블에 `payment_status` 추가
  - 상태: `pending`, `paid`, `failed`, `cancelled`, `refunded`
  - 트랜잭션 처리로 원자성 보장

#### 1.2 환불 시스템
- [ ] 환불 정책 수립 (7일 이내, 미개봉 등)
- [ ] 환불 API 구현
- [ ] 부분 환불 지원
- [ ] 환불 이력 관리

---

### 2. 관리자 보안 강화 🔒

#### 2.1 현재 보안 문제
**심각**: 관리자 비밀번호가 환경변수에 평문 저장

**필수 개선사항**:

- [ ] **관리자 계정 시스템**
  ```sql
  -- admins 테이블 생성
  CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,  -- bcrypt 해시
    name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'admin',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```

- [ ] **비밀번호 해싱**
  ```typescript
  import bcrypt from 'bcryptjs'
  
  // 회원가입 시
  const hashedPassword = await bcrypt.hash(password, 10)
  
  // 로그인 시
  const isValid = await bcrypt.compare(password, admin.password_hash)
  ```

- [ ] **JWT 토큰 기반 인증**
  ```typescript
  import jwt from 'jsonwebtoken'
  
  const token = jwt.sign(
    { adminId: admin.id, role: admin.role },
    process.env.JWT_SECRET!,
    { expiresIn: '8h' }
  )
  ```

- [ ] **세션 만료 시간 설정** (현재: 없음 → 권장: 8시간)

- [ ] **IP 화이트리스트** (선택사항)
  - 특정 IP에서만 관리자 접근 허용
  - 사무실, VPN IP 등록

#### 2.2 권한 관리 (RBAC)
- [ ] **역할 기반 접근 제어**
  - `super_admin`: 모든 권한
  - `manager`: 상품/주문 관리
  - `viewer`: 조회만 가능

- [ ] **API 엔드포인트별 권한 체크**
  ```typescript
  export async function DELETE(request: Request) {
    const admin = await verifyAdmin(request)
    if (admin.role !== 'super_admin') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }
    // ...
  }
  ```

#### 2.3 감사 로그 (Audit Log)
- [ ] **관리자 활동 로깅**
  ```sql
  CREATE TABLE admin_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES admins(id),
    action VARCHAR(100),  -- 'product_create', 'order_update' 등
    entity_type VARCHAR(50),
    entity_id UUID,
    changes JSONB,  -- 변경 내역
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```

- [ ] 로그 항목:
  - 상품 생성/수정/삭제
  - 주문 상태 변경
  - 프로모션 생성/삭제
  - 가격 변경
  - 로그인 시도 (성공/실패)

---

### 3. 환경 변수 및 시크릿 관리

#### 3.1 현재 노출된 정보
- [ ] **Supabase 키 체크**
  - `NEXT_PUBLIC_SUPABASE_URL`: 공개 OK
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: 공개 OK
  - `SUPABASE_SERVICE_ROLE_KEY`: **절대 클라이언트 노출 금지**

- [ ] **환경 변수 검증**
  ```typescript
  // lib/env.ts 개선
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET',
    'ADMIN_JWT_SECRET',
    'PAYMENT_SECRET_KEY',  // PG사 시크릿 키
  ] as const
  
  requiredEnvVars.forEach(key => {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`)
    }
  })
  ```

- [ ] **프로덕션 환경변수 분리**
  - `.env.local` (개발)
  - `.env.production` (운영)
  - Vercel/AWS 등 배포 플랫폼에서 환경변수 설정

---

### 4. 데이터베이스 보안 및 최적화

#### 4.1 Row Level Security (RLS) 강화

**현재 상태**: RLS 정책 확인 필요

**필수 정책**:
```sql
-- 사용자는 자신의 장바구니만 조회/수정
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cart"
  ON carts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cart"
  ON carts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cart"
  ON carts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cart"
  ON carts FOR DELETE
  USING (auth.uid() = user_id);

-- 주문도 마찬가지
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

-- 리뷰
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews"
  ON reviews FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can create own reviews"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews"
  ON reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews"
  ON reviews FOR DELETE
  USING (auth.uid() = user_id);

-- 배송지
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own addresses"
  ON addresses FOR ALL
  USING (auth.uid() = user_id);

-- 찜 목록
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own wishlist"
  ON wishlists FOR ALL
  USING (auth.uid() = user_id);
```

#### 4.2 인덱스 추가 (성능 최적화)

```sql
-- 상품 조회 최적화
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_created_at ON products(created_at DESC);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_stock ON products(stock);
CREATE INDEX idx_products_promotion ON products(promotion_type) WHERE promotion_type IS NOT NULL;

-- 장바구니 조회 최적화
CREATE INDEX idx_carts_user_id ON carts(user_id);
CREATE INDEX idx_carts_product_id ON carts(product_id);
CREATE INDEX idx_carts_promotion_group ON carts(promotion_group_id) WHERE promotion_group_id IS NOT NULL;

-- 주문 조회 최적화
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- 리뷰 조회 최적화
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX idx_reviews_rating ON reviews(rating);

-- 찜 목록 조회 최적화
CREATE INDEX idx_wishlists_user_product ON wishlists(user_id, product_id);
```

#### 4.3 데이터 백업
- [ ] **자동 백업 설정**
  - Supabase 자동 백업 활성화
  - 일일 백업 (최소)
  - 주간 백업 보관

- [ ] **복구 테스트**
  - 백업 복원 절차 문서화
  - 정기적 복구 테스트 실시

---

### 5. 사용자 인증 강화

#### 5.1 이메일 인증
**현재**: Naver OAuth만 지원

- [ ] **이메일 회원가입 추가**
  - 이메일 인증 필수
  - 비밀번호 강도 검증 (최소 8자, 영문+숫자+특수문자)
  
- [ ] **비밀번호 재설정**
  - 이메일 인증 링크
  - 임시 토큰 발급 (1시간 유효)

#### 5.2 소셜 로그인 확장
- [ ] 카카오 로그인
- [ ] Google 로그인
- [ ] Apple 로그인 (iOS 필수)

#### 5.3 보안 강화
- [ ] **Rate Limiting**
  ```typescript
  // 로그인 시도 제한 (IP당 5회/시간)
  // API 호출 제한 (사용자당 100회/분)
  ```

- [ ] **CSRF 보호**
  - Next.js 기본 제공, 추가 검증

- [ ] **XSS 방지**
  - 사용자 입력 sanitize
  - `dangerouslySetInnerHTML` 사용 금지

---

## 🟡 중요 (High Priority) - 배포 후 빠르게 구현

### 6. 재고 관리 시스템

**현재 문제**: 재고가 999로 고정, 실시간 재고 관리 없음

- [ ] **실시간 재고 차감**
  ```typescript
  // 주문 완료 시 트랜잭션으로 재고 차감
  const { data, error } = await supabase.rpc('decrease_stock', {
    product_id: item.productId,
    quantity: item.quantity
  })
  
  // SQL Function
  CREATE OR REPLACE FUNCTION decrease_stock(product_id UUID, quantity INT)
  RETURNS void AS $$
  BEGIN
    UPDATE products 
    SET stock = stock - quantity,
        updated_at = NOW()
    WHERE id = product_id AND stock >= quantity;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION '재고 부족';
    END IF;
  END;
  $$ LANGUAGE plpgsql;
  ```

- [ ] **동시성 제어**
  - 낙관적 잠금 (Optimistic Locking)
  - 재고 부족 시 주문 실패 처리

- [ ] **재고 알림**
  - 재고 10개 이하 시 관리자에게 알림
  - 품절 시 자동 품절 처리

- [ ] **재고 히스토리**
  ```sql
  CREATE TABLE stock_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id),
    change_amount INT,  -- +10, -5 등
    reason VARCHAR(100),  -- 'order', 'restock', 'adjustment'
    before_stock INT,
    after_stock INT,
    admin_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```

---

### 7. 주문 관리 개선

#### 7.1 주문 상태 관리
**현재**: 기본 상태만 존재

- [ ] **상세 주문 상태**
  - `pending`: 결제 대기
  - `paid`: 결제 완료
  - `preparing`: 상품 준비중
  - `shipping`: 배송중
  - `delivered`: 배송 완료
  - `cancelled`: 취소
  - `refunded`: 환불 완료

- [ ] **자동 상태 변경**
  - 결제 완료 → `paid`
  - 송장 등록 → `shipping`
  - 배송 완료 (API 연동) → `delivered`

#### 7.2 배송 시스템
- [ ] **택배사 연동**
  - CJ대한통운, 롯데택배, 우체국택배 API
  - 송장 번호 자동 등록
  - 배송 추적 기능

- [ ] **배송비 정책 관리**
  - DB로 이관 (현재는 상수로 하드코딩)
  ```sql
  CREATE TABLE shipping_policies (
    id UUID PRIMARY KEY,
    name VARCHAR(100),
    type VARCHAR(50),  -- 'regular', 'quick', 'pickup'
    free_threshold INT,  -- 무료배송 기준
    fee INT,  -- 배송비
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```

#### 7.3 알림 시스템
- [ ] **주문 확인 문자/이메일**
  - 주문 완료 시
  - 배송 시작 시
  - 배송 완료 시

- [ ] **문자 발송 서비스 연동**
  - 알리고, 카카오 알림톡, NHN Cloud SMS

---

### 8. 이미지 관리

**현재 문제**: 이미지 업로드만 있고 최적화 없음

- [ ] **이미지 최적화**
  ```typescript
  // Next.js Image Optimization
  import Image from 'next/image'
  
  <Image
    src={product.image_url}
    alt={product.name}
    width={300}
    height={300}
    quality={80}
    loading="lazy"
  />
  ```

- [ ] **CDN 사용**
  - Cloudflare Images, AWS CloudFront
  - 이미지 캐싱 및 빠른 로딩

- [ ] **이미지 리사이징**
  - 썸네일: 300x300
  - 상세: 800x800
  - 원본: 1200x1200

- [ ] **WebP 변환**
  - 용량 30~50% 감소
  - 자동 변환 파이프라인

---

### 9. 에러 처리 및 로깅

#### 9.1 에러 추적 시스템
- [ ] **Sentry 연동**
  ```bash
  npm install @sentry/nextjs
  ```
  
  ```typescript
  // sentry.client.config.ts
  import * as Sentry from '@sentry/nextjs'
  
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 1.0,
  })
  ```

- [ ] **에러 알림**
  - 관리자에게 실시간 알림
  - Slack, Discord 웹훅 연동

#### 9.2 로깅 시스템
- [ ] **구조화된 로깅**
  ```typescript
  import winston from 'winston'
  
  const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
      new winston.transports.File({ filename: 'error.log', level: 'error' }),
      new winston.transports.File({ filename: 'combined.log' }),
    ],
  })
  ```

- [ ] **로그 수집**
  - 주문 생성/실패
  - 결제 시도/실패
  - API 에러
  - 성능 메트릭

---

### 10. 성능 최적화

#### 10.1 데이터베이스 쿼리 최적화
- [ ] **N+1 쿼리 해결**
  - 현재 장바구니 로드 시 products 조인 ✅ (이미 구현됨)
  - 주문 내역도 조인으로 한 번에 로드

- [ ] **페이지네이션 개선**
  - Cursor-based pagination (offset 대신)
  - 무한 스크롤 최적화

- [ ] **캐싱 전략**
  ```typescript
  // 상품 목록 캐싱 (1분)
  export const revalidate = 60
  
  // 상품 상세 캐싱 (5분)
  export const revalidate = 300
  ```

#### 10.2 번들 최적화
- [ ] **코드 스플리팅**
  - 관리자 페이지 lazy loading
  - 모달 컴포넌트 dynamic import
  
  ```typescript
  import dynamic from 'next/dynamic'
  
  const ProductEditModal = dynamic(
    () => import('@/components/admin/ProductEditModal'),
    { ssr: false }
  )
  ```

- [ ] **이미지 lazy loading**
  - 뷰포트에 들어올 때만 로드
  - Intersection Observer 활용

#### 10.3 모니터링
- [ ] **성능 모니터링**
  - Google Analytics
  - Vercel Analytics
  - Core Web Vitals 추적

- [ ] **사용자 행동 분석**
  - 장바구니 이탈률
  - 구매 전환율
  - 인기 상품

---

## 🟢 권장 (Recommended) - 운영 중 개선

### 11. 법적 요구사항 및 약관

- [ ] **통신판매업 신고**
  - 사업자등록증 필요
  - 통신판매업 신고번호 발급

- [ ] **필수 약관 작성**
  - ✅ 이용약관 (있음)
  - ✅ 개인정보 처리방침 (있음)
  - [ ] 전자금융거래 이용약관
  - [ ] 환불/교환 정책

- [ ] **사업자 정보 표시**
  - 상호, 대표자명
  - 사업자등록번호
  - 통신판매업 신고번호
  - 주소, 연락처
  - 개인정보관리책임자

- [ ] **소비자 보호**
  - 미성년자 거래 불가
  - 쿠키 사용 동의
  - 개인정보 수집 동의

---

### 12. SEO 최적화

#### 12.1 메타데이터
- [ ] **각 페이지별 메타 태그**
  ```typescript
  // app/products/[id]/page.tsx
  export async function generateMetadata({ params }) {
    const product = await getProduct(params.id)
    return {
      title: `${product.name} | 대가 정육백화점`,
      description: product.description,
      openGraph: {
        images: [product.image_url],
      },
    }
  }
  ```

- [ ] **sitemap.xml 생성**
  ```typescript
  // app/sitemap.ts
  export default async function sitemap() {
    const products = await getAllProducts()
    return [
      { url: 'https://daega-shop.com', changeFrequency: 'daily' },
      ...products.map(p => ({
        url: `https://daega-shop.com/products/${p.id}`,
        lastModified: p.updated_at,
      })),
    ]
  }
  ```

- [ ] **robots.txt**
  ```
  User-agent: *
  Allow: /
  Disallow: /admin/
  Disallow: /api/
  
  Sitemap: https://daega-shop.com/sitemap.xml
  ```

#### 12.2 구조화된 데이터
- [ ] **Schema.org 마크업**
  ```typescript
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "image": product.image_url,
    "description": product.description,
    "brand": product.brand,
    "offers": {
      "@type": "Offer",
      "price": product.price,
      "priceCurrency": "KRW",
      "availability": product.stock > 0 ? "InStock" : "OutOfStock"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": product.average_rating,
      "reviewCount": product.review_count
    }
  }
  ```

---

### 13. 고객 지원 시스템

- [ ] **고객 센터**
  - 1:1 문의 게시판
  - FAQ
  - 채팅 상담 (채널톡, 카카오톡 채널)

- [ ] **주문 취소 기능**
  - 결제 전: 즉시 취소
  - 결제 후: 관리자 승인 필요
  - 배송 시작 후: 취소 불가

- [ ] **교환/반품 시스템**
  - 교환/반품 신청
  - 수거 배송비 처리
  - 환불 처리

---

### 14. 검색 기능 개선

**현재**: 단순 LIKE 검색

- [ ] **전문 검색 (Full-text Search)**
  ```sql
  -- PostgreSQL 전문 검색
  ALTER TABLE products ADD COLUMN search_vector tsvector;
  
  CREATE INDEX idx_products_search ON products USING gin(search_vector);
  
  CREATE TRIGGER products_search_update
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION
  tsvector_update_trigger(search_vector, 'pg_catalog.korean', name, description, brand);
  ```

- [ ] **검색 필터 개선**
  - 가격대 필터
  - 브랜드 필터
  - 원산지 필터
  - 정렬 옵션 (인기순, 최신순, 가격순, 리뷰많은순)

- [ ] **검색어 자동완성**
  - 인기 검색어
  - 최근 검색어 (로컬 스토리지)

---

### 15. 쿠폰 및 프로모션 확장

**현재**: 1+1, 2+1, 3+1만 지원

- [ ] **쿠폰 시스템**
  ```sql
  CREATE TABLE coupons (
    id UUID PRIMARY KEY,
    code VARCHAR(50) UNIQUE,
    name VARCHAR(100),
    discount_type VARCHAR(20),  -- 'percent', 'fixed'
    discount_value INT,
    min_order_amount INT,  -- 최소 주문 금액
    max_discount INT,  -- 최대 할인 금액
    usage_limit INT,  -- 전체 사용 횟수
    user_usage_limit INT,  -- 사용자당 횟수
    valid_from TIMESTAMP,
    valid_until TIMESTAMP,
    is_active BOOLEAN DEFAULT true
  );
  
  CREATE TABLE coupon_usage (
    id UUID PRIMARY KEY,
    coupon_id UUID REFERENCES coupons(id),
    user_id UUID,
    order_id UUID REFERENCES orders(id),
    discount_amount INT,
    used_at TIMESTAMP DEFAULT NOW()
  );
  ```

- [ ] **포인트 시스템**
  - 구매 금액의 1% 적립
  - 리뷰 작성 시 500원 적립
  - 결제 시 사용 가능

---

### 16. 모바일 최적화

- [ ] **PWA (Progressive Web App)**
  ```typescript
  // next.config.js
  const withPWA = require('next-pwa')({
    dest: 'public',
    disable: process.env.NODE_ENV === 'development',
  })
  
  module.exports = withPWA({
    // ...
  })
  ```

- [ ] **manifest.json**
  - 앱 이름, 아이콘
  - 홈 화면 추가 가능

- [ ] **오프라인 지원**
  - Service Worker
  - 캐시 전략

---

### 17. 알림 시스템

- [ ] **푸시 알림**
  - 주문 상태 변경
  - 배송 시작/완료
  - 프로모션 알림

- [ ] **이메일 알림**
  - 주문 확인 메일
  - 배송 안내 메일
  - 리뷰 작성 요청

- [ ] **SMS 알림**
  - 배송 시작 문자
  - 픽업 준비 완료 문자

---

## 🔵 선택 (Nice to Have) - 추가 기능

### 18. 고급 기능

#### 18.1 추천 시스템
- [ ] **개인화 추천**
  - 구매 이력 기반
  - 찜 목록 기반
  - 협업 필터링

- [ ] **연관 상품**
  - "이 상품을 본 고객이 함께 본 상품"
  - "자주 함께 구매하는 상품"

#### 18.2 리뷰 시스템 강화
**현재**: 기본 리뷰 기능 있음 ✅

- [ ] **리뷰 신고 기능**
- [ ] **리뷰 좋아요/싫어요**
- [ ] **베스트 리뷰 선정**
- [ ] **포토 리뷰 추가 적립금**

#### 18.3 회원 등급 시스템
- [ ] **등급별 혜택**
  - 일반, 실버, 골드, VIP
  - 등급별 할인율, 무료배송 기준 차등

- [ ] **멤버십 프로그램**
  - 월 정기결제
  - 추가 할인 혜택

---

## 🛠 인프라 및 배포

### 19. 배포 환경 설정

#### 19.1 프로덕션 환경
- [ ] **도메인 연결**
  - SSL 인증서 (Let's Encrypt 또는 클라우드 제공)
  - HTTPS 강제

- [ ] **환경 분리**
  - 개발(dev): 테스트용 DB
  - 스테이징(staging): 운영과 동일한 환경
  - 프로덕션(prod): 실제 운영

#### 19.2 모니터링
- [ ] **서버 모니터링**
  - CPU, 메모리, 디스크 사용량
  - API 응답 시간
  - 에러율

- [ ] **알림 설정**
  - 서버 다운 시 즉시 알림
  - 에러율 급증 시 알림
  - DB 용량 임계치 도달 시 알림

#### 19.3 백업 및 복구 계획
- [ ] **데이터 백업**
  - 일일 자동 백업
  - 주요 변경 전 수동 백업

- [ ] **재해 복구 계획 (DRP)**
  - 복구 시간 목표 (RTO): 4시간 이내
  - 복구 지점 목표 (RPO): 1일 이내

---

## 📋 테스트

### 20. 테스트 코드 작성

**현재**: 테스트 코드 없음

- [ ] **E2E 테스트 (Playwright)**
  ```typescript
  // tests/e2e/checkout.spec.ts
  test('사용자가 상품을 장바구니에 담고 주문할 수 있다', async ({ page }) => {
    await page.goto('/products')
    await page.click('[data-testid="product-card-1"]')
    await page.click('[data-testid="add-to-cart"]')
    await page.goto('/cart')
    await page.click('[data-testid="checkout-button"]')
    // ...
  })
  ```

- [ ] **단위 테스트 (Jest)**
  - 유틸리티 함수 테스트
  - 주문 금액 계산 테스트
  - 배송비 계산 테스트

- [ ] **통합 테스트**
  - API 엔드포인트 테스트
  - DB 트랜잭션 테스트

---

## 🔐 보안 체크리스트

### 21. 최종 보안 점검

- [ ] **HTTPS 적용** (필수)
- [ ] **환경 변수 보안** (필수)
- [ ] **SQL Injection 방지** (Supabase가 자동 처리 ✅)
- [ ] **XSS 방지** (React가 기본 처리 ✅)
- [ ] **CSRF 방지** (Next.js가 기본 처리 ✅)
- [ ] **Rate Limiting** (구현 필요)
- [ ] **DDoS 방어** (Cloudflare 등 CDN 사용)
- [ ] **개인정보 암호화**
  - 전화번호, 주소 등 암호화 저장 권장
  - AES-256 암호화

---

## 📊 운영 체크리스트

### 22. 일일 운영 작업

- [ ] **주문 확인 및 처리**
  - 신규 주문 확인 (아침 9시)
  - 송장 등록
  - 배송 준비

- [ ] **재고 확인**
  - 품절 임박 상품 확인
  - 발주 필요 상품 리스트

- [ ] **고객 문의 응대**
  - 1:1 문의 답변
  - 리뷰 모니터링 및 답변

- [ ] **매출 현황 확인**
  - 일일 매출
  - 주간/월간 리포트

---

## 🚨 긴급 대응 매뉴얼

### 23. 장애 대응

#### 서버 다운
1. 상태 확인 (Vercel/AWS 대시보드)
2. 에러 로그 확인
3. 긴급 공지 (SNS, 홈페이지 팝업)
4. 복구 작업
5. 사후 분석

#### 결제 오류
1. PG사 연동 상태 확인
2. 결제 로그 확인
3. 고객 안내 (환불 또는 재결제)
4. PG사 고객센터 연락

#### 개인정보 유출 의심
1. 즉시 서버 차단
2. 로그 확인
3. 영향 범위 파악
4. 고객 안내
5. 관련 기관 신고 (개인정보보호위원회)

---

## 📈 우선순위 로드맵

### Phase 1: MVP 배포 (필수) - 2주
1. ✅ 관리자 계정 시스템
2. ✅ 결제 시스템 연동
3. ✅ RLS 정책 적용
4. ✅ 환경 변수 보안
5. ✅ 에러 추적 (Sentry)

### Phase 2: 안정화 - 1주
1. ✅ 재고 관리 시스템
2. ✅ 주문 상태 관리
3. ✅ 알림 시스템 (문자/이메일)
4. ✅ 성능 모니터링

### Phase 3: 개선 - 2주
1. ✅ 검색 최적화
2. ✅ 이미지 최적화
3. ✅ 쿠폰 시스템
4. ✅ 배송 추적

### Phase 4: 고도화 - 지속
1. ✅ 추천 시스템
2. ✅ 회원 등급
3. ✅ PWA
4. ✅ 포인트 시스템

---

## 💰 예상 비용 (월간)

| 항목 | 예상 비용 | 비고 |
|------|----------|------|
| Hosting (Vercel Pro) | $20 | 무료 Hobby로 시작 가능 |
| Supabase Pro | $25 | 8GB DB, 100GB 전송 |
| 이미지 CDN | $10~50 | Cloudflare (무료 가능) |
| 문자 발송 | $30~100 | 건당 15원, 월 2000~7000건 |
| PG 수수료 | 매출의 3% | 월 매출에 비례 |
| Sentry | $0~29 | 5000 이벤트까지 무료 |
| **총 예상 비용** | **$85~$224** | + 매출의 3% |

**최소 시작 비용**: 약 **$0~50/월** (무료 플랜 활용)

---

## ✅ 최종 체크리스트

### 배포 전 필수 확인사항

#### 코드
- [ ] 모든 console.log 제거 또는 debugLog로 변경 ✅
- [ ] 프로덕션 환경변수 설정
- [ ] 에러 핸들링 완료
- [ ] 타입 에러 없음
- [ ] 빌드 성공

#### 보안
- [ ] 관리자 인증 시스템 ✅
- [ ] RLS 정책 적용
- [ ] 환경 변수 보안
- [ ] HTTPS 적용
- [ ] Rate Limiting

#### 기능
- [ ] 결제 연동 및 테스트
- [ ] 주문 프로세스 완료
- [ ] 이메일/문자 알림
- [ ] 관리자 페이지 동작 확인

#### 법률
- [ ] 통신판매업 신고
- [ ] 이용약관 최신화
- [ ] 개인정보처리방침 최신화
- [ ] 사업자 정보 표시

#### 인프라
- [ ] 도메인 연결
- [ ] SSL 인증서
- [ ] 데이터 백업 설정
- [ ] 모니터링 설정

---

## 📞 긴급 연락망

### 개발팀
- 개발자: [연락처]
- 백업 개발자: [연락처]

### 외부 서비스
- PG사 고객센터: [전화번호]
- Hosting 지원: [이메일]
- 택배사: [전화번호]

### 법률/행정
- 변호사: [연락처]
- 세무사: [연락처]

---

## 🎯 핵심 요약

### 즉시 구현 필요 (배포 불가능)
1. **결제 시스템** - PG 연동
2. **관리자 보안** - 계정 시스템, 해싱
3. **RLS 정책** - 데이터 보안
4. **환경 변수** - 시크릿 관리

### 빠르게 구현 필요 (운영 위험)
1. **재고 관리** - 실시간 차감
2. **주문 상태** - 상세 관리
3. **알림 시스템** - 문자/이메일
4. **에러 추적** - Sentry

### 점진적 개선 (경쟁력 향상)
1. **검색 최적화**
2. **쿠폰 시스템**
3. **추천 시스템**
4. **PWA**

---

## 📝 참고 자료

### 개발 가이드
- [Next.js Production Checklist](https://nextjs.org/docs/going-to-production)
- [Supabase Production Checklist](https://supabase.com/docs/guides/platform/going-into-prod)
- [토스페이먼츠 개발 가이드](https://docs.tosspayments.com/)

### 법률 가이드
- [전자상거래법](https://www.law.go.kr/)
- [개인정보보호법](https://www.privacy.go.kr/)
- [통신판매업 신고](https://www.ftc.go.kr/)

### 보안 가이드
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security)

---

**마지막 업데이트**: 2025-11-13  
**작성자**: AI Assistant  
**버전**: 1.0

