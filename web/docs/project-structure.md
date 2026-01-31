# 프로젝트 전체 구조

이 문서는 대가정육마트 웹 프로젝트의 전체 폴더 및 파일 구조를 정리한 문서입니다.

## 📁 루트 디렉토리 구조

```
daega-shop/web/
├── app/                    # Next.js App Router 페이지 및 API 라우트
├── components/             # 재사용 가능한 React 컴포넌트
├── lib/                    # 비즈니스 로직 및 유틸리티 함수
├── types/                  # TypeScript 타입 정의
├── docs/                   # 프로젝트 문서
├── public/                 # 정적 파일 (이미지, 아이콘 등)
├── migrations/             # 데이터베이스 마이그레이션 파일
├── middleware.ts           # Next.js 미들웨어
├── next.config.js         # Next.js 설정
├── tailwind.config.ts      # Tailwind CSS 설정
├── tsconfig.json           # TypeScript 설정
└── package.json            # 프로젝트 의존성
```

---

## 📂 app/ - Next.js App Router

### 페이지 (Pages)

```
app/
├── page.tsx                           # 메인 페이지
├── layout.tsx                         # 루트 레이아웃
├── globals.css                        # 전역 CSS
│
├── (home)/                            # 홈 관련 컴포넌트
│   └── _components/
│       ├── BannerSectionContainer.tsx
│       └── CollectionSectionContainer.tsx
│
├── auth/                              # 인증 관련 페이지
│   ├── callback/route.ts             # OAuth 콜백
│   ├── find-id/page.tsx              # 아이디 찾기
│   ├── find-password/page.tsx        # 비밀번호 찾기
│   ├── login/page.tsx                # 로그인
│   ├── naver/callback/page.tsx       # 네이버 로그인 콜백
│   ├── reset-password/page.tsx       # 비밀번호 재설정
│   └── signup/                        # 회원가입
│       ├── page.tsx
│       └── _components/
│
├── best/page.tsx                      # 베스트 상품 페이지
├── sale/page.tsx                      # 특가 상품 페이지
├── no9/page.tsx                       # 한우대가 NO.9 페이지
├── review-event/page.tsx              # 리뷰 이벤트 페이지
│
├── products/                          # 상품 목록
│   ├── page.tsx                       # 상품 목록 페이지
│   ├── ProductsPageClient.tsx         # 상품 목록 클라이언트 컴포넌트
│   ├── [slug]/page.tsx                # 카테고리별 상품 페이지
│   └── _components/                   # 상품 목록 관련 컴포넌트
│       ├── ProductsHeader.tsx
│       ├── ProductsCategoryNav.tsx
│       ├── ProductsGrid.tsx
│       ├── ProductsEmpty.tsx
│       ├── ProductsHero.tsx
│       ├── ProductsTimeDealHero.tsx
│       └── index.ts
│
├── product/[id]/                      # 상품 상세 페이지
│   ├── page.tsx
│   ├── ProductDetailPageClient.tsx
│   ├── reviews/                       # 리뷰 페이지
│   │   ├── page.tsx
│   │   └── gallery/page.tsx          # 리뷰 갤러리
│   └── _components/                   # 상품 상세 관련 컴포넌트
│
├── categories/page.tsx                # 카테고리 페이지
│
├── collections/[slug]/                # 컬렉션 페이지
│   ├── page.tsx
│   ├── CollectionPageClient.tsx
│   └── _components/
│
├── banners/[slug]/                    # 배너 페이지
│   ├── page.tsx
│   ├── BannerPageClient.tsx
│   └── _components/
│
├── timedeal/                          # 타임딜 페이지
│   ├── page.tsx
│   ├── TimeDealPageClient.tsx
│   └── _components/
│
├── cart/                              # 장바구니
│   ├── page.tsx
│   ├── CartPageClient.tsx
│   └── _components/
│
├── checkout/                          # 결제 페이지
│   ├── page.tsx
│   ├── CheckoutPageClient.tsx
│   └── _components/
│
├── orders/                            # 주문 내역
│   ├── page.tsx
│   ├── OrdersPageClient.tsx
│   └── _components/
│
├── wishlist/page.tsx                  # 찜 목록
│
├── gift/                              # 선물하기
│   ├── page.tsx
│   ├── GiftPageClient.tsx
│   ├── guide/page.tsx                 # 선물 가이드
│   ├── receive/                        # 선물 받기
│   └── _components/
│
├── notifications/                     # 알림
│   ├── page.tsx
│   ├── NotificationsPageClient.tsx
│   └── _components/
│
├── profile/                           # 마이페이지
│   ├── page.tsx
│   ├── addresses/page.tsx             # 배송지 관리
│   ├── coupons/page.tsx               # 쿠폰
│   ├── points/page.tsx                 # 포인트
│   ├── reviews/page.tsx                # 내 리뷰
│   ├── payment/page.tsx                # 결제 수단
│   └── edit/page.tsx                  # 프로필 수정
│
├── terms/page.tsx                     # 이용약관
├── privacy/page.tsx                   # 개인정보처리방침
├── finance-terms/page.tsx             # 전자금융거래약관
├── refund/page.tsx                    # 반품/교환/환불
├── support/page.tsx                   # 고객지원
├── notices/page.tsx                   # 공지사항
└── faq/page.tsx                       # FAQ
```

### API 라우트 (API Routes)

```
app/api/
├── auth/                              # 인증 API
│   ├── find-id/route.ts
│   ├── naver/route.ts
│   ├── send-verification-code/route.ts
│   ├── session/route.ts
│   └── verify-code/route.ts
│
├── products/                           # 상품 API
│   ├── route.ts
│   └── [id]/route.ts
│
├── categories/                         # 카테고리 API
│   ├── route.ts
│   └── [type]/route.ts
│
├── collections/                        # 컬렉션 API
│   ├── route.ts
│   └── [slug]/route.ts
│
├── banners/                            # 배너 API
│   ├── route.ts
│   └── [slug]/route.ts
│
├── timedeals/route.ts                  # 타임딜 API
│
├── cart/route.ts                       # 장바구니 API
│
├── orders/                             # 주문 API
│   ├── route.ts
│   ├── cancel/route.ts
│   └── confirm/route.ts
│
├── checkout/                           # 결제 관련 (클라이언트에서 처리)
│
├── reviews/                            # 리뷰 API
│   ├── route.ts
│   ├── [id]/route.ts
│   ├── images/route.ts
│   ├── my-reviews/route.ts
│   ├── reviewable/route.ts
│   └── upload-image/route.ts
│
├── wishlist/                           # 찜 목록 API
│   ├── route.ts
│   └── products/route.ts
│
├── coupons/                            # 쿠폰 API
│   ├── route.ts
│   ├── first-purchase/route.ts
│   ├── issue/route.ts
│   └── use/route.ts
│
├── points/                             # 포인트 API
│   ├── route.ts
│   ├── history/route.ts
│   └── pending/route.ts
│
├── notifications/                       # 알림 API
│   ├── route.ts
│   └── unread-count/route.ts
│
├── profile/                            # 프로필 API
│   ├── route.ts
│   └── info/route.ts
│
├── addresses/                          # 배송지 API
│   ├── route.ts
│   ├── [id]/route.ts
│   ├── check/route.ts
│   └── default/route.ts
│
├── payment-cards/                       # 결제 수단 API
│   ├── route.ts
│   └── [id]/route.ts
│
├── gift/                               # 선물하기 API
│   ├── [token]/route.ts
│   ├── budget/route.ts
│   ├── create-pending/route.ts
│   ├── featured/route.ts
│   ├── target/route.ts
│   └── upload-card-image/route.ts
│
├── recommendations/                    # 추천 상품 API
│   ├── route.ts
│   └── [categoryId]/products/route.ts
│
├── hero/route.ts                       # 히어로 슬라이더 API
│
├── users/                              # 사용자 API
│   ├── signup-coupon/route.ts
│   └── terms/route.ts
│
├── user/profile/route.ts               # 사용자 프로필 API
│
├── cron/                               # 크론 작업
│   └── update-tracking-status/route.ts
│
└── worker/                             # 워커 작업
    └── update-tracking-status/route.ts
```

### 관리자 페이지 (Admin Pages)

```
app/admin/
├── page.tsx                            # 관리자 대시보드
├── login/page.tsx                      # 관리자 로그인
│
├── _components/                        # 공통 관리자 컴포넌트
│   ├── AdminDashboardClient.tsx
│   └── AdminPageLayout.tsx
│
├── products/                            # 상품 관리
│   ├── page.tsx
│   ├── _components/
│   ├── _hooks/
│   ├── _types.ts
│   ├── _utils/
│   └── constants.ts
│
├── timedeals/                          # 타임딜 관리
│   ├── page.tsx
│   ├── _components/
│   ├── _hooks/
│   └── _types.ts
│
├── promotions/                         # 프로모션 관리
│   ├── page.tsx
│   ├── _components/
│   ├── _hooks/
│   ├── _types.ts
│   └── constants.ts
│
├── collections/                        # 컬렉션 관리
│   ├── page.tsx
│   ├── _components/
│   ├── _hooks/
│   └── _types.ts
│
├── banners/                            # 배너 관리
│   ├── page.tsx
│   ├── _components/
│   ├── _hooks/
│   └── _types.ts
│
├── hero/                               # 히어로 슬라이더 관리
│   ├── page.tsx
│   ├── _components/
│   ├── _hooks/
│   └── _types.ts
│
├── category-products/                  # 카테고리별 상품 관리
│   ├── page.tsx
│   ├── _components/
│   └── _types.ts
│
├── recommendations/                    # 추천 상품 관리
│   ├── page.tsx
│   ├── _components/
│   ├── _hooks/
│   └── _types.ts
│
├── orders/                             # 주문 관리
│   ├── page.tsx
│   ├── _components/
│   ├── _hooks/
│   └── _types.ts
│
├── reviews/                            # 리뷰 관리
│   ├── page.tsx
│   ├── _components/
│   ├── _hooks/
│   ├── _types.ts
│   └── constants.ts
│
├── coupons/                             # 쿠폰 관리
│   ├── page.tsx
│   ├── _components/
│   ├── _hooks/
│   ├── _types.ts
│   └── _utils/
│
├── points/                              # 포인트 관리
│   ├── page.tsx
│   ├── _components/
│   ├── _hooks/
│   └── _types.ts
│
├── gift-management/                     # 선물 관리
│   ├── page.tsx
│   ├── _components/
│   ├── _hooks/
│   ├── _types.ts
│   └── _utils/
│
├── notifications/                        # 알림 관리
│   ├── page.tsx
│   ├── _components/
│   ├── _hooks/
│   └── _types.ts
│
```

### 관리자 API 라우트 (Admin API Routes)

```
app/api/admin/
├── login/route.ts                       # 관리자 로그인
├── logout/route.ts                      # 관리자 로그아웃
│
├── products/                            # 상품 관리 API
│   ├── route.ts
│   ├── [id]/route.ts
│   ├── bulk-update/route.ts
│   └── upload-image/route.ts
│
├── timedeals/route.ts                   # 타임딜 관리 API
│
├── promotions/                          # 프로모션 관리 API
│   ├── route.ts
│   ├── [id]/route.ts
│   ├── products/route.ts
│   └── [id]/products/route.ts
│
├── collections/route.ts                 # 컬렉션 관리 API
│
├── banners/route.ts                     # 배너 관리 API
│
├── hero/route.ts                        # 히어로 슬라이더 관리 API
│
├── recommendations/                     # 추천 상품 관리 API
│   ├── route.ts
│   ├── categories/route.ts
│   └── [categoryId]/products/route.ts
│
├── orders/                              # 주문 관리 API
│   ├── route.ts
│   └── [id]/route.ts
│
├── reviews/route.ts                     # 리뷰 관리 API
│
├── coupons/route.ts                     # 쿠폰 관리 API
│
├── points/route.ts                      # 포인트 관리 API
│
├── notifications/route.ts                # 알림 관리 API
│
├── categories/route.ts                  # 카테고리 관리 API
│
├── users/route.ts                       # 사용자 관리 API
│
├── upload-image/route.ts                # 이미지 업로드
└── upload-banner-image/route.ts        # 배너 이미지 업로드
```

---

## 📂 components/ - React 컴포넌트

```
components/
├── layout/                              # 레이아웃 컴포넌트
│   ├── Header.tsx                       # 헤더 (로고, 검색, 장바구니)
│   ├── Footer.tsx                       # 푸터
│   ├── BottomNavbar.tsx                 # 하단 네비게이션 바
│   ├── MainMenu.tsx                     # 메인 메뉴
│   └── ClientLayout.tsx                 # 클라이언트 레이아웃 래퍼
│
├── sections/                             # 섹션 컴포넌트
│   ├── HeroSlider.tsx                   # 히어로 슬라이더
│   ├── CategoryGrid.tsx                 # 카테고리 그리드
│   ├── RecommendationSection.tsx        # 맞춤별 추천 섹션
│   └── RecentlyViewedSection.tsx        # 최근 본 상품 섹션
│
├── common/                               # 공통 컴포넌트
│   ├── ConfirmModal.tsx                 # 확인 모달
│   ├── LoginPrompt.tsx                  # 로그인 유도 프롬프트
│   ├── ScrollToTop.tsx                  # 스크롤 상단 이동 버튼
│   ├── FreeShippingProgress.tsx         # 무료 배송 진행 바
│   ├── NotificationBell.tsx             # 알림 벨
│   ├── PromotionModal.tsx               # 프로모션 모달
│   └── PromotionModalWrapper.tsx        # 프로모션 모달 래퍼
│
├── product/                              # 상품 관련 컴포넌트
│   └── ProductCard.tsx                  # 상품 카드
│
├── product-info/                         # 상품 정보 (동적 로딩)
│   ├── index.ts
│   ├── ProductInfo-dodram-porkbelly.tsx
│   ├── ProductInfo-harim-breast-blackpepper.tsx
│   └── ProductInfoExample.tsx
│
├── product-descriptions/                 # 상품 상세 설명 (동적 로딩)
│   ├── index.ts
│   ├── ProductDescription-harim-breast-blackpepper.tsx
│   └── ProductDescriptionExample.tsx
│
├── review/                               # 리뷰 관련 컴포넌트
│   ├── ReviewItem.tsx                   # 개별 리뷰 아이템
│   ├── ReviewList.tsx                   # 리뷰 목록
│   ├── ReviewStars.tsx                  # 별점 표시
│   ├── ReviewWriteModal.tsx             # 리뷰 작성 모달
│   └── StarIcons.tsx                    # 별 아이콘
│
├── timedeal/                             # 타임딜 관련 컴포넌트
│   ├── TimeDealSection.tsx              # 타임딜 섹션 (서버 컴포넌트)
│   ├── TimeDealSectionClient.tsx        # 타임딜 섹션 클라이언트
│   ├── TimeDealUI.tsx                   # 타임딜 UI
│   └── TimeDealCountdown.tsx            # 타임딜 카운트다운
│
├── banner/                               # 배너 관련 컴포넌트
│   ├── BannerSection.tsx                # 배너 섹션 (서버 컴포넌트)
│   └── BannerSectionUI.tsx              # 배너 섹션 UI
│
├── collection/                           # 컬렉션 관련 컴포넌트
│   └── CollectionSectionUI.tsx          # 컬렉션 섹션 UI
│
└── skeletons/                            # 로딩 스켈레톤 UI
    ├── CartItemSkeleton.tsx
    ├── OrderItemSkeleton.tsx
    ├── ProductCardSkeleton.tsx
    └── ReviewItemSkeleton.tsx
```

---

## 📂 lib/ - 비즈니스 로직 및 유틸리티

```
lib/
├── store.ts                              # Zustand 전역 상태 관리
│
├── supabase/                             # Supabase 클라이언트
│   ├── supabase.ts                       # 클라이언트 Supabase
│   ├── supabase-server.ts                # 서버 Supabase
│   └── supabase-admin.ts                 # 관리자 Supabase
│
├── auth/                                 # 인증 관련
│   ├── auth-context.tsx                  # 인증 컨텍스트
│   ├── auth-server.ts                    # 서버 인증 유틸리티
│   ├── admin-auth.ts                     # 관리자 인증
│   └── naver-auth.ts                     # 네이버 인증
│
├── product/                              # 상품 관련 로직
│   ├── product.service.ts                # 상품 서비스
│   ├── product.hooks.ts                 # 상품 훅
│   ├── product-client.ts                # 클라이언트 상품 유틸리티
│   ├── product-utils.ts                  # 상품 유틸리티
│   ├── product-image-utils.ts           # 상품 이미지 유틸리티
│   ├── product.pricing.ts               # 상품 가격 계산
│   ├── product.types.ts                 # 상품 타입
│   └── index.ts
│
├── timedeal/                             # 타임딜 관련 로직
│   ├── timedeal.service.ts              # 타임딜 서비스
│   ├── timedeal.hooks.ts                # 타임딜 훅
│   ├── timedeal.store.ts                # 타임딜 스토어
│   ├── timedeal-utils.ts                # 타임딜 유틸리티
│   ├── timedeal.pricing.ts             # 타임딜 가격 계산
│   ├── timedeal.types.ts               # 타임딜 타입
│   ├── useTimeDealPolling.ts           # 타임딜 폴링 훅
│   └── index.ts
│
├── cart/                                 # 장바구니 관련 로직
│   ├── cart-db.ts                        # 장바구니 DB 연동
│   ├── cart.service.ts                  # 장바구니 서비스
│   ├── cart.hooks.ts                    # 장바구니 훅
│   ├── cart.types.ts                    # 장바구니 타입
│   ├── checkout-validator.ts            # 결제 검증
│   ├── useCartRealtimeSync.ts          # 장바구니 실시간 동기화
│   └── index.ts
│
├── order/                                # 주문 관련 로직
│   ├── order.service.ts                 # 주문 서비스
│   ├── order.hooks.ts                   # 주문 훅
│   ├── order-types.ts                  # 주문 타입
│   ├── order-utils.ts                  # 주문 유틸리티
│   ├── order-calc.ts                   # 주문 계산
│   ├── gift/                            # 선물하기 관련
│   │   ├── gift-types.ts
│   │   ├── gift-utils.ts
│   │   ├── initKakao.ts
│   │   └── kakaoShare.ts
│   └── index.ts
│
├── checkout/                             # 결제 관련 로직
│   ├── checkout.service.ts              # 결제 서비스
│   ├── checkout.hooks.ts               # 결제 훅
│   ├── checkout.types.ts               # 결제 타입
│   └── index.ts
│
├── wishlist/                             # 찜 목록 관련 로직
│   ├── wishlist-db.ts                  # 찜 목록 DB 연동
│   └── wishlist-sync.ts                # 찜 목록 동기화
│
├── review/                               # 리뷰 관련 로직
│   └── (types/review.ts에 정의)
│
├── collection/                           # 컬렉션 관련 로직
│   ├── collection.service.ts           # 컬렉션 서비스
│   ├── collection.hooks.ts            # 컬렉션 훅
│   ├── collection.types.ts            # 컬렉션 타입
│   └── index.ts
│
├── banner/                               # 배너 관련 로직
│   ├── banner.service.ts               # 배너 서비스
│   ├── banner.hooks.ts                 # 배너 훅
│   ├── banner.types.ts                 # 배너 타입
│   └── index.ts
│
├── gift/                                 # 선물하기 관련 로직
│   ├── gift.service.ts                 # 선물 서비스
│   ├── gift.hooks.ts                   # 선물 훅
│   ├── gift.types.ts                   # 선물 타입
│   └── index.ts
│
├── notification/                         # 알림 관련 로직
│   ├── notification.service.ts         # 알림 서비스
│   ├── notification.hooks.ts          # 알림 훅
│   ├── notification.types.ts          # 알림 타입
│   └── index.ts
│
│   └── index.ts
│
├── promotion/                            # 프로모션 관련 로직
│   ├── promotion-utils.ts              # 프로모션 유틸리티
│   ├── promotion.pricing.ts          # 프로모션 가격 계산
│   └── index.ts
│
├── coupon/                               # 쿠폰 관련 로직
│   └── coupons.ts
│
├── point/                                # 포인트 관련 로직
│   └── points.ts
│
├── category/                             # 카테고리 관련 로직
│   └── category-utils.ts
│
├── address/                              # 배송지 관련 로직
│   └── useAddress.ts
│
├── postcode/                             # 우편번호 관련 로직
│   └── useDaumPostcode.ts
│
├── recently-viewed/                       # 최근 본 상품 관련 로직
│   └── recently-viewed.ts
│
├── tracking/                             # 배송 추적 관련 로직
│   └── tracking-api.ts
│
├── device/                               # 디바이스 감지
│   └── useDevice.ts
│
├── utils/                                # 공통 유틸리티
│   ├── constants.ts                     # 상수 정의
│   ├── utils.ts                         # 유틸리티 함수
│   ├── time-utils.ts                    # 시간 관련 유틸리티
│   ├── format-phone.ts                  # 전화번호 포맷팅
│   ├── error-handler.ts                 # 에러 핸들러
│   ├── errors.ts                        # 에러 타입
│   ├── env.ts                           # 환경 변수
│   └── debug.ts                         # 디버그 유틸리티
│
└── types/                                # 타입 정의
    └── review.ts
```

---

## 📂 types/ - TypeScript 타입 정의

```
types/
├── common.ts                             # 공통 타입 정의
└── api.ts                                # API 타입 정의
```

---

## 📂 docs/ - 프로젝트 문서

```
docs/
├── project-structure.md                  # 프로젝트 전체 구조 (이 문서)
├── components-structure.md               # 컴포넌트 폴더 구조 및 사용 가이드
├── api-call-locations.md                # API 호출 위치 정리
├── admin-api-security-checklist.md      # 관리자 API 보안 체크리스트
└── tasks.md                              # 작업 목록
```

---

## 📂 public/ - 정적 파일

```
public/
└── images/                               # 이미지 파일
    ├── logo.png                          # 로고
    ├── hero.jpg                          # 히어로 이미지
    ├── categories/                       # 카테고리 이미지
    └── ...                               # 기타 이미지 파일
```

---

## 📂 migrations/ - 데이터베이스 마이그레이션

```
migrations/
└── (SQL 마이그레이션 파일들)
```

---

## 🔧 설정 파일

```
루트 디렉토리/
├── package.json                          # 프로젝트 의존성 및 스크립트
├── package-lock.json                     # 의존성 잠금 파일
├── tsconfig.json                         # TypeScript 설정
├── next.config.js                        # Next.js 설정
├── tailwind.config.ts                    # Tailwind CSS 설정
├── postcss.config.js                     # PostCSS 설정
├── middleware.ts                         # Next.js 미들웨어
├── .gitignore                            # Git 무시 파일
├── .npmrc                                # npm 설정
└── next-env.d.ts                         # Next.js 타입 정의
```

---

## 📝 주요 디렉토리 설명

### app/
- **Next.js App Router**를 사용한 페이지 및 API 라우트
- `page.tsx`: 페이지 컴포넌트
- `route.ts`: API 라우트 핸들러
- `layout.tsx`: 레이아웃 컴포넌트
- `_components/`: 페이지별 컴포넌트 (라우팅되지 않음)

### components/
- **재사용 가능한 React 컴포넌트**
- `layout/`: 레이아웃 관련 컴포넌트
- `sections/`: 페이지 섹션 컴포넌트
- `common/`: 공통 UI 컴포넌트
- `product/`: 상품 관련 컴포넌트
- 기능별로 폴더 분리

### lib/
- **비즈니스 로직 및 유틸리티 함수**
- 기능별로 폴더 분리
- 각 기능 폴더에는 `service.ts`, `hooks.ts`, `types.ts` 등이 포함
- `utils/`: 공통 유틸리티 함수

### types/
- **전역 TypeScript 타입 정의**
- 프로젝트 전반에서 사용되는 타입

### docs/
- **프로젝트 문서**
- 구조, 사용 가이드, API 문서 등

---

## 🎯 네이밍 규칙

### 파일명
- **컴포넌트**: PascalCase (예: `ProductCard.tsx`)
- **유틸리티/서비스**: kebab-case (예: `product-utils.ts`)
- **타입 정의**: kebab-case (예: `product.types.ts`)
- **훅**: camelCase with `.hooks.ts` (예: `product.hooks.ts`)

### 폴더명
- **소문자 kebab-case** (예: `product-info/`)
- **컴포넌트 폴더**: 기능별로 분리

### 컴포넌트 분류
- **서버 컴포넌트**: 데이터 페칭 담당 (예: `TimeDealSection.tsx`)
- **클라이언트 컴포넌트**: 상호작용 및 UI 렌더링 (예: `TimeDealSectionClient.tsx`)
- **UI 전용**: `UI` 접미사 (예: `BannerSectionUI.tsx`)

---

## 📊 프로젝트 통계

- **총 페이지**: 약 50개 이상
- **API 라우트**: 약 100개 이상
- **컴포넌트**: 약 100개 이상
- **라이브러리 모듈**: 약 30개 이상

---

## 🔄 업데이트 이력

- **2024-01-XX**: 컴포넌트 폴더 구조 재구성 (layout/, sections/, common/, product/)
- **2024-01-XX**: 라이브 추첨 기능 추가
- **2024-01-XX**: 프로젝트 구조 문서화

