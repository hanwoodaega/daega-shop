# 대가정육마트 사이트 구성 문서

## 프로젝트 개요

**대가정육마트**는 Next.js 14 기반의 전자상거래 플랫폼으로, 한우 및 정육 상품을 판매하는 온라인 쇼핑몰입니다.

### 기술 스택
- **프레임워크**: Next.js 14 (App Router)
- **언어**: TypeScript
- **스타일링**: Tailwind CSS
- **상태 관리**: Zustand
- **데이터베이스**: Supabase
- **인증**: Supabase Auth (네이버 소셜 로그인 포함)
- **UI 라이브러리**: React Hot Toast

---

## 디렉토리 구조

```
web/
├── app/                    # Next.js App Router 페이지 및 API 라우트
│   ├── admin/             # 관리자 페이지
│   ├── api/               # API 라우트
│   ├── auth/              # 인증 관련 페이지
│   └── [기타 페이지들]     # 사용자 페이지
├── components/            # React 컴포넌트
├── lib/                   # 유틸리티 및 헬퍼 함수
├── types/                 # TypeScript 타입 정의
├── public/                # 정적 파일
└── migrations/            # 데이터베이스 마이그레이션
```

---

## 주요 페이지 구조

### 1. 사용자 페이지 (Customer Pages)

#### 홈페이지 (`/`)
- 히어로 섹션
- 카테고리 그리드
- 타임딜 섹션
- 컬렉션 섹션 (동적)
- 취향별 추천 섹션

#### 상품 관련
- **상품 목록** (`/products`)
  - 검색 기능
  - 필터링 (카테고리, 가격, 정렬)
  - 페이지네이션
  
- **상품 상세** (`/products/[id]`)
  - 상품 이미지 갤러리
  - 상품 정보
  - 리뷰 섹션
  - 관련 상품 추천

- **상품 리뷰** (`/products/[id]/reviews`)
  - 리뷰 목록
  - 리뷰 작성 모달
  - 리뷰 이미지 갤러리

#### 쇼핑 관련
- **장바구니** (`/cart`)
  - 상품 수량 조절
  - 프로모션 적용
  - 무료배송 진행률 표시

- **결제** (`/checkout`)
  - 주소 입력 (다음 주소 API 연동)
  - 결제 수단 선택
  - 주문 요약
  - 쿠폰/포인트 적용

- **주문 내역** (`/orders`)
  - 주문 목록
  - 주문 상세
  - 주문 취소/확정

#### 컬렉션 페이지
- **베스트** (`/best`)
- **특가** (`/sale`)
- **한우대가 NO.9** (`/no9`)
- **리뷰이벤트** (`/review-event`)
- **컬렉션 상세** (`/collections/[slug]`)

#### 카테고리 (`/categories`)
- 카테고리별 상품 목록
- 검색 기능

#### 선물관 (`/gift`)
- 선물 카테고리별 상품
- 선물하기 기능
- 선물 받기 (`/gift/receive/[token]`)
- 선물 가이드 (`/gift/guide`)

#### 마이페이지 (`/profile`)
- 프로필 편집 (`/profile/edit`)
- 배송지 관리 (`/profile/addresses`)
- 쿠폰 (`/profile/coupons`)
- 포인트 (`/profile/points`)
- 리뷰 관리 (`/profile/reviews`)
- 결제 수단 (`/profile/payment`)

#### 기타
- **찜 목록** (`/wishlist`)
- **알림** (`/notifications`)
- **FAQ** (`/faq`)
- **고객지원** (`/support`)
- **환불 정책** (`/refund`)
- **개인정보처리방침** (`/privacy`)
- **이용약관** (`/terms`)
- **금융거래약관** (`/finance-terms`)

### 2. 관리자 페이지 (`/admin`)

#### 관리자 대시보드 (`/admin`)
- 관리 기능 카드 메뉴

#### 상품 관리 (`/admin/products`)
- 상품 등록/수정/삭제
- 품절 전환
- 태그 관리

#### 프로모션 관리 (`/admin/promotions`)
- 할인율 할인
- 1+1, 2+1, 3+1 프로모션 생성/관리

#### 타임딜 관리 (`/admin/timedeals`)
- 한정 재고 타임딜 설정
- 초특가 프로모션 관리

#### 주문 관리 (`/admin/orders`)
- 주문 상태 변경
- 리뷰 모니터링
- 고객 응대

#### 알림 관리 (`/admin/notifications`)
- 적립 정책 설정
- 알림 발송 관리

#### 선물관 관리 (`/admin/gift-management`)
- 선물 카테고리별 상품 설정

#### 컬렉션 관리 (`/admin/collections`)
- 베스트, 특가, 한우대가 NO.9 등 컬렉션 관리

#### 쿠폰 관리 (`/admin/coupons`)
- 쿠폰 생성/발급/관리

#### 할인 관리 (`/admin/discounts`)
- 할인 정책 관리

#### 포인트 관리 (`/admin/points`)
- 포인트 적립/차감 관리

#### 리뷰 관리 (`/admin/reviews`)
- 리뷰 승인/삭제

### 3. 인증 페이지 (`/auth`)

- **로그인** (`/auth/login`)
- **회원가입** (`/auth/signup`)
  - 약관 동의 (`/auth/signup/terms`)
- **프로필 완성** (`/auth/complete-profile`)
- **네이버 로그인** (`/auth/naver`)
  - 콜백 (`/auth/naver/callback`)

---

## API 라우트 구조

### 사용자 API (`/api`)

#### 인증 (`/api/auth`)
- `POST /api/auth/send-verification-code` - 인증번호 발송
- `POST /api/auth/verify-code` - 인증번호 검증
- `GET /api/auth/naver` - 네이버 로그인

#### 상품 (`/api/products`)
- `GET /api/products` - 상품 목록 조회
- `GET /api/products/[id]` - 상품 상세 조회

#### 장바구니 (`/api/cart`)
- `GET /api/cart` - 장바구니 조회
- `POST /api/cart` - 장바구니 추가
- `PUT /api/cart` - 장바구니 수정
- `DELETE /api/cart` - 장바구니 삭제

#### 주문 (`/api/orders`)
- `GET /api/orders` - 주문 목록
- `POST /api/orders` - 주문 생성
- `POST /api/orders/confirm` - 주문 확정
- `POST /api/orders/cancel` - 주문 취소

#### 리뷰 (`/api/reviews`)
- `GET /api/reviews` - 리뷰 목록
- `POST /api/reviews` - 리뷰 작성
- `GET /api/reviews/[id]` - 리뷰 상세
- `PUT /api/reviews/[id]` - 리뷰 수정
- `DELETE /api/reviews/[id]` - 리뷰 삭제
- `GET /api/reviews/my-reviews` - 내 리뷰 목록
- `GET /api/reviews/reviewable` - 리뷰 작성 가능한 주문
- `POST /api/reviews/upload-image` - 리뷰 이미지 업로드

#### 컬렉션 (`/api/collections`)
- `GET /api/collections/main` - 메인 컬렉션 조회
- `GET /api/collections/[slug]` - 컬렉션 상세
- `GET /api/timedeals` - 타임딜 상품 목록 조회 (공개)

#### 선물 (`/api/gift`)
- `POST /api/gift/create-pending` - 선물 생성
- `GET /api/gift/[token]` - 선물 조회
- `POST /api/gift/upload-card-image` - 선물 카드 이미지 업로드

#### 포인트 (`/api/points`)
- `GET /api/points` - 포인트 내역
- `GET /api/points/pending` - 대기 중인 포인트

#### 찜 (`/api/wishlist`)
- `GET /api/wishlist` - 찜 목록
- `POST /api/wishlist` - 찜 추가/삭제

#### 알림 (`/api/notifications`)
- `GET /api/notifications` - 알림 목록
- `GET /api/notifications/unread-count` - 읽지 않은 알림 수

#### 사용자 (`/api/users`)
- `POST /api/users/register-referral` - 추천인 등록
- `POST /api/users/signup-coupon` - 회원가입 쿠폰 발급
- `GET /api/users/terms` - 약관 조회

### 관리자 API (`/api/admin`)

#### 상품 관리 (`/api/admin/products`)
- `GET /api/admin/products` - 상품 목록
- `POST /api/admin/products` - 상품 생성
- `GET /api/admin/products/[id]` - 상품 상세
- `PUT /api/admin/products/[id]` - 상품 수정
- `DELETE /api/admin/products/[id]` - 상품 삭제

#### 프로모션 관리 (`/api/admin/promotions`)
- `GET /api/admin/promotions` - 프로모션 목록
- `POST /api/admin/promotions` - 프로모션 생성
- `GET /api/admin/promotions/[id]` - 프로모션 상세
- `PUT /api/admin/promotions/[id]` - 프로모션 수정
- `DELETE /api/admin/promotions/[id]` - 프로모션 삭제
- `POST /api/admin/promotions/[id]/products` - 프로모션 상품 추가
- `POST /api/admin/promotions/cleanup-cart` - 장바구니 정리

#### 타임딜 관리 (`/api/admin/timedeals`)
- 타임딜 생성/수정/삭제

#### 주문 관리 (`/api/admin/orders`)
- `GET /api/admin/orders` - 주문 목록
- `PUT /api/admin/orders` - 주문 상태 변경
- `POST /api/admin/orders/auto-confirm` - 자동 확정 설정

#### 컬렉션 관리 (`/api/admin/collections`)
- `GET /api/admin/collections` - 컬렉션 목록
- `POST /api/admin/collections` - 컬렉션 생성
- `GET /api/admin/collections/[id]` - 컬렉션 상세
- `PUT /api/admin/collections/[id]` - 컬렉션 수정
- `DELETE /api/admin/collections/[id]` - 컬렉션 삭제
- `POST /api/admin/collections/[id]/products` - 컬렉션 상품 추가
- `GET /api/admin/timedeals` - 타임딜 목록 조회 (관리자)
- `POST /api/admin/timedeals` - 타임딜 생성 (관리자)
- `PUT /api/admin/timedeals` - 타임딜 수정 (관리자)
- `DELETE /api/admin/timedeals` - 타임딜 삭제 (관리자)

#### 선물관 관리 (`/api/admin/gift-categories`)
- 선물 카테고리 및 상품 관리

#### 쿠폰 관리 (`/api/admin/coupons`)
- `POST /api/admin/coupons/issue` - 쿠폰 발급

#### 알림 관리 (`/api/admin/notifications`)
- `POST /api/admin/notifications/create` - 알림 생성
- `POST /api/admin/notifications/send` - 알림 발송

#### 리뷰 관리 (`/api/admin/reviews`)
- 리뷰 승인/삭제

#### 포인트 관리 (`/api/admin/points`)
- `POST /api/admin/points/add` - 포인트 추가
- `GET /api/admin/points/list` - 포인트 내역

#### 사용자 관리 (`/api/admin/users`)
- 사용자 목록 조회

#### 기타 관리자 API
- `POST /api/admin/upload-image` - 이미지 업로드
- `POST /api/admin/login` - 관리자 로그인
- `POST /api/admin/logout` - 관리자 로그아웃

### 크론 작업 (`/api/cron`)
- `POST /api/cron/auto-confirm-orders` - 주문 자동 확정
- `POST /api/cron/update-tracking-status` - 배송 추적 상태 업데이트

---

## 컴포넌트 구조

### 레이아웃 컴포넌트
- **Header** - 상단 헤더 (로고, 검색, 장바구니, 알림)
- **Footer** - 하단 푸터
- **BottomNavbar** - 하단 네비게이션 (홈, 카테고리, 선물, 찜, 마이)
- **MainMenu** - 메인 메뉴 (홈, 베스트, 특가, 한우대가 NO.9, 리뷰이벤트)
- **ClientLayout** - 클라이언트 레이아웃 래퍼

### 상품 관련 컴포넌트
- **ProductCard** - 상품 카드
- **ProductCardSkeleton** - 상품 카드 스켈레톤
- **CategoryGrid** - 카테고리 그리드
- **CollectionSection** - 컬렉션 섹션
- **TimeDealSection** - 타임딜 섹션
- **TimeDealCountdown** - 타임딜 카운트다운
- **RecommendationSection** - 추천 섹션
- **RecentlyViewedSection** - 최근 본 상품
- **HanwooNo9Section** - 한우대가 NO.9 섹션

### 장바구니/결제 컴포넌트
- **FreeShippingProgress** - 무료배송 진행률

### 리뷰 컴포넌트 (`components/review/`)
- **ReviewList** - 리뷰 목록
- **ReviewItem** - 리뷰 아이템
- **ReviewWriteModal** - 리뷰 작성 모달
- **ReviewStars** - 별점 표시
- **StarIcons** - 별 아이콘
- **ReviewItemSkeleton** - 리뷰 아이템 스켈레톤

### 공통 컴포넌트 (`components/common/`)
- **ConfirmModal** - 확인 모달
- **LoginPrompt** - 로그인 프롬프트
- **ScrollToTop** - 스크롤 투 탑

### 프로모션 컴포넌트
- **PromotionModal** - 프로모션 모달
- **PromotionModalWrapper** - 프로모션 모달 래퍼

### 알림 컴포넌트
- **NotificationBell** - 알림 벨

### 관리자 컴포넌트 (`components/admin/`)
- **ProductEditModal** - 상품 편집 모달

### 스켈레톤 컴포넌트 (`components/skeletons/`)
- **CartItemSkeleton** - 장바구니 아이템 스켈레톤
- **OrderItemSkeleton** - 주문 아이템 스켈레톤
- **ProductCardSkeleton** - 상품 카드 스켈레톤
- **ReviewItemSkeleton** - 리뷰 아이템 스켈레톤

### 상품 정보 컴포넌트 (`components/product-info/`)
- 상품별 커스텀 상품 정보 컴포넌트

### 상품 설명 컴포넌트 (`components/product-descriptions/`)
- 상품별 커스텀 상품 설명 컴포넌트

---

## 라이브러리 및 유틸리티 (`lib/`)

### 인증 관련
- **auth-context.tsx** - 인증 컨텍스트
- **admin-auth.ts** - 관리자 인증
- **naver-auth.ts** - 네이버 인증

### 데이터베이스
- **supabase.ts** - Supabase 클라이언트
- **supabase-server.ts** - 서버 사이드 Supabase
- **supabase-admin.ts** - 관리자 Supabase

### 상태 관리
- **store.ts** - Zustand 스토어 (장바구니, 찜, 검색 UI 등)

### 상품 관련
- **product-queries.ts** - 상품 쿼리 (클라이언트)
- **product-queries-server.ts** - 상품 쿼리 (서버)
- **product-utils.ts** - 상품 유틸리티

### 주문 관련
- **order-calc.ts** - 주문 계산
- **order-utils.ts** - 주문 유틸리티

### 프로모션
- **promotion-utils.ts** - 프로모션 유틸리티

### 타임딜
- **timedeal-utils.ts** - 타임딜 유틸리티
- **time-utils.ts** - 시간 유틸리티

### 장바구니/찜
- **cart-db.ts** - 장바구니 데이터베이스
- **wishlist-db.ts** - 찜 데이터베이스
- **wishlist-sync.ts** - 찜 동기화

### 쿠폰/포인트
- **coupons.ts** - 쿠폰 유틸리티
- **points.ts** - 포인트 유틸리티

### 기타
- **constants.ts** - 상수 정의
- **utils.ts** - 공통 유틸리티
- **error-handler.ts** - 에러 핸들러
- **errors.ts** - 에러 정의
- **format-phone.ts** - 전화번호 포맷팅
- **recently-viewed.ts** - 최근 본 상품
- **tracking-api.ts** - 배송 추적 API
- **env.ts** - 환경 변수
- **debug.ts** - 디버그 유틸리티

### 훅 (`lib/hooks/`)
- **useAddress.ts** - 주소 관리 훅
- **useDaumPostcode.ts** - 다음 주소 API 훅

### 타입 (`lib/types/`)
- **review.ts** - 리뷰 타입

---

## 주요 기능

### 1. 사용자 기능
- 회원가입/로그인 (네이버 소셜 로그인)
- 상품 검색 및 필터링
- 장바구니 관리
- 주문 및 결제
- 리뷰 작성 및 관리
- 찜 목록
- 포인트 적립/사용
- 쿠폰 사용
- 선물하기
- 알림 수신
- 최근 본 상품

### 2. 관리자 기능
- 상품 관리 (CRUD)
- 프로모션 관리 (할인, 1+1, 2+1, 3+1)
- 타임딜 관리
- 주문 관리
- 컬렉션 관리
- 선물관 관리
- 쿠폰 발급/관리
- 포인트 관리
- 리뷰 관리
- 알림 발송
- 사용자 관리

### 3. 프로모션 시스템
- 할인율 할인
- 1+1, 2+1, 3+1 프로모션
- 타임딜 (한정 재고, 초특가)
- 쿠폰 할인
- 포인트 적립

### 4. 선물 시스템
- 선물 카테고리별 상품 설정
- 선물하기 기능
- 선물 받기 (토큰 기반)
- 선물 카드 이미지 업로드

### 5. 리뷰 시스템
- 리뷰 작성 (이미지 포함)
- 리뷰 수정/삭제
- 리뷰 갤러리
- 리뷰 이벤트

### 6. 알림 시스템
- 주문 알림
- 배송 알림
- 프로모션 알림
- 읽지 않은 알림 수 표시

---

## 레이아웃 및 스타일링

### 레이아웃
- 모바일 우선 디자인 (최대 너비 480px)
- 반응형 디자인
- 고정 하단 네비게이션 바
- Sticky 헤더 및 메뉴

### 스타일링
- Tailwind CSS 사용
- 커스텀 컬러 테마
- 다크 모드 미지원 (현재)

### 폰트
- Inter (기본)
- Playfair Display (제목용)
- Pretendard (한글)

---

## 데이터베이스

### 주요 테이블 (추정)
- `products` - 상품
- `orders` - 주문
- `order_items` - 주문 상품
- `cart` - 장바구니
- `wishlist` - 찜 목록
- `reviews` - 리뷰
- `collections` - 컬렉션
- `promotions` - 프로모션
- `timedeals` - 타임딜
- `coupons` - 쿠폰
- `users` - 사용자
- `notifications` - 알림
- `gift_categories` - 선물 카테고리
- `points` - 포인트

### 마이그레이션
- `migrations/create_collections_tables.sql`
- `migrations/alter_collections_table.sql`
- `migrations/create_timedeals_tables.sql`
- `migrations/setup_user_points_rls.sql`

---

## 환경 변수

필요한 환경 변수 (추정):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- 네이버 API 키
- 카카오 비즈니스 메시지 API 키 (인증번호 발송용)

---

## 빌드 및 실행

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm start

# 린트
npm run lint
```

---

## 참고 사항

- Next.js 14 App Router 사용
- 서버 컴포넌트와 클라이언트 컴포넌트 혼용
- Supabase를 백엔드로 사용
- RLS (Row Level Security) 적용
- 이미지 최적화 (Next.js Image 컴포넌트 사용)
- SEO 최적화 (메타데이터 설정)

---

## 향후 개선 사항

자세한 내용은 `docs/tasks.md` 참고

