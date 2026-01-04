# Components 폴더 구조 정리

이 문서는 `components` 폴더의 구조와 각 컴포넌트의 역할, 서버/클라이언트 구분을 정리한 문서입니다.

## 목차
- [폴더 구조](#폴더-구조)
- [컴포넌트 분류](#컴포넌트-분류)
- [서버 컴포넌트](#서버-컴포넌트)
- [클라이언트 컴포넌트](#클라이언트-컴포넌트)
- [컴포넌트 상세](#컴포넌트-상세)

---

## 폴더 구조

```
components/
├── banner/                    # 배너 관련 컴포넌트
│   ├── BannerSection.tsx      # Server Component: 배너 데이터 fetch
│   └── BannerSectionUI.tsx    # Client Component: 배너 UI 렌더링
├── collection/                # 컬렉션 관련 컴포넌트
│   └── CollectionSectionUI.tsx # Client Component: 컬렉션 섹션 UI
├── common/                    # 공통 컴포넌트
│   ├── ConfirmModal.tsx       # Client Component: 확인 모달
│   ├── LoginPrompt.tsx        # Client Component: 로그인 프롬프트
│   └── ScrollToTop.tsx        # Client Component: 스크롤 탑 버튼
├── product-descriptions/      # 상품 설명 컴포넌트
│   ├── index.ts               # Export 파일
│   ├── ProductDescriptionExample.tsx
│   └── ProductDescription-*.tsx
├── product-info/              # 상품 정보 컴포넌트
│   ├── index.ts               # Export 파일
│   ├── ProductInfoExample.tsx
│   └── ProductInfo-*.tsx
├── review/                    # 리뷰 관련 컴포넌트
│   ├── ReviewItem.tsx         # Client Component: 리뷰 아이템
│   ├── ReviewList.tsx         # Client Component: 리뷰 목록
│   ├── ReviewStars.tsx        # Client Component: 별점 표시
│   ├── ReviewWriteModal.tsx   # Client Component: 리뷰 작성 모달
│   └── StarIcons.tsx          # Client Component: 별 아이콘
├── skeletons/                 # 로딩 스켈레톤 컴포넌트
│   ├── CartItemSkeleton.tsx
│   ├── OrderItemSkeleton.tsx
│   ├── ProductCardSkeleton.tsx
│   └── ReviewItemSkeleton.tsx
├── timedeal/                  # 타임딜 관련 컴포넌트
│   ├── TimeDealCountdown.tsx  # Client Component: 카운트다운
│   ├── TimeDealSection.tsx    # Server Component: 타임딜 데이터 fetch
│   ├── TimeDealSectionClient.tsx # Client Component: 타임딜 섹션 UI
│   └── TimeDealUI.tsx         # Client Component: 타임딜 UI
├── BannerSection.tsx          # (루트) Server Component: 배너 섹션
├── BottomNavbar.tsx           # Client Component: 하단 네비게이션
├── CategoryGrid.tsx           # Client Component: 카테고리 그리드
├── ClientLayout.tsx           # Client Component: 클라이언트 레이아웃
├── Footer.tsx                 # Client Component: 푸터
├── FreeShippingProgress.tsx   # Client Component: 무료배송 진행률
├── Header.tsx                 # Client Component: 헤더
├── HeroSlider.tsx             # Client Component: 히어로 슬라이더
├── MainMenu.tsx               # Client Component: 메인 메뉴
├── NotificationBell.tsx       # Client Component: 알림 벨
├── ProductCard.tsx            # Client Component: 상품 카드
├── PromotionModal.tsx         # Client Component: 프로모션 모달
├── PromotionModalWrapper.tsx  # Client Component: 프로모션 모달 래퍼
├── RecentlyViewedSection.tsx  # Client Component: 최근 본 상품
└── RecommendationSection.tsx  # Client Component: 추천 섹션
```

---

## 컴포넌트 분류

### 서버 컴포넌트 (Server Components)
- `banner/BannerSection.tsx`
- `timedeal/TimeDealSection.tsx`

### 클라이언트 컴포넌트 (Client Components)
- 나머지 모든 컴포넌트 (`'use client'` 지시어 사용)

---

## 서버 컴포넌트

### 1. `banner/BannerSection.tsx`
**역할**: 배너 데이터를 서버에서 fetch하여 초기 HTML에 포함
- **타입**: Server Component (async function)
- **기능**: 
  - 서버에서 `/api/banners` 호출
  - 캐시 태그 사용 (`next: { tags: ['banner'] }`)
  - SEO 최적화 (초기 HTML에 데이터 포함)
- **사용 위치**: `app/page.tsx` (홈 페이지)
- **하위 컴포넌트**: `BannerSectionUI` (Client Component)

### 2. `timedeal/TimeDealSection.tsx`
**역할**: 타임딜 데이터를 서버에서 fetch하여 초기 HTML에 포함
- **타입**: Server Component (async function)
- **기능**:
  - 서버에서 `/api/timedeals` 호출
  - 캐시 태그 사용 (`next: { tags: ['timedeal'] }`)
  - SEO 최적화 (초기 HTML에 데이터 포함)
- **사용 위치**: `app/page.tsx` (홈 페이지), `app/sale/page.tsx` (특가 페이지)
- **하위 컴포넌트**: `TimeDealSectionClient` (Client Component)
- **Props**: `variant?: 'scroll' | 'grid'`

---

## 클라이언트 컴포넌트

### 레이아웃 컴포넌트

#### `ClientLayout.tsx`
**역할**: 클라이언트 사이드 레이아웃 및 전역 설정
- **기능**:
  - AuthProvider 래핑
  - 타임딜 폴링 시작
  - 모바일 최대 너비 제한 (480px)
- **사용 위치**: `app/layout.tsx`

#### `Header.tsx`
**역할**: 상단 헤더 (로고, 검색, 장바구니, 알림)
- **기능**:
  - 검색 기능
  - 장바구니 아이콘 및 개수 표시
  - 알림 벨
  - MainMenu 포함
- **Props**: `hideMainMenu`, `showCartButton`, `sticky`
- **사용 위치**: 대부분의 페이지

#### `Footer.tsx`
**역할**: 하단 푸터
- **기능**: 회사 정보, 링크 등
- **사용 위치**: 대부분의 페이지

#### `BottomNavbar.tsx`
**역할**: 하단 고정 네비게이션 바
- **기능**:
  - 홈, 검색, 장바구니, 마이페이지 네비게이션
  - 모바일 최대 너비 제한 (480px)
- **사용 위치**: 대부분의 페이지

#### `MainMenu.tsx`
**역할**: 메인 메뉴 (홈, 베스트, 특가, 한우대가 NO.9, 리뷰이벤트)
- **기능**:
  - 가로 스크롤 가능한 메뉴
  - 활성 페이지 하이라이트
  - 스크롤바 숨김 처리
- **사용 위치**: `Header.tsx` 내부

### 섹션 컴포넌트

#### `HeroSlider.tsx`
**역할**: 히어로 슬라이더 (메인 배너)
- **기능**:
  - 이미지 슬라이더
  - 자동 재생
  - `/api/hero` API 호출
- **사용 위치**: `app/page.tsx` (홈 페이지)

#### `CategoryGrid.tsx`
**역할**: 카테고리 그리드 표시
- **기능**: 카테고리 아이콘 및 이름 표시
- **Props**: `selectedCategory`
- **사용 위치**: `app/page.tsx`, `app/products/page.tsx`

#### `RecommendationSection.tsx`
**역할**: 맞춤별 추천 섹션
- **기능**:
  - `/api/recommendations` API 호출
  - 카테고리별 추천 상품 표시
- **사용 위치**: `app/page.tsx` (홈 페이지)

#### `RecentlyViewedSection.tsx`
**역할**: 최근 본 상품 섹션
- **기능**: 로컬 스토리지 기반 최근 본 상품 표시
- **사용 위치**: `app/page.tsx` (홈 페이지)

#### `banner/BannerSectionUI.tsx`
**역할**: 배너 섹션 UI 렌더링
- **기능**: 배너 데이터를 받아서 UI 표시
- **Props**: `banners` (배너 배열)
- **사용 위치**: `BannerSection.tsx` (Server Component)

#### `collection/CollectionSectionUI.tsx`
**역할**: 컬렉션 섹션 UI 렌더링
- **기능**: 컬렉션 데이터를 받아서 UI 표시
- **사용 위치**: `app/(home)/_components/CollectionSectionContainer.tsx`

#### `timedeal/TimeDealSectionClient.tsx`
**역할**: 타임딜 섹션 클라이언트 로직
- **기능**:
  - 서버에서 받은 초기 데이터 표시
  - 폴링을 통한 실시간 업데이트
  - 타임딜 종료 감지
- **Props**: `initialData`, `variant`
- **사용 위치**: `TimeDealSection.tsx` (Server Component)

#### `timedeal/TimeDealUI.tsx`
**역할**: 타임딜 UI 렌더링
- **기능**:
  - 타임딜 상품 목록 표시
  - 스크롤/그리드 모드 지원
  - 카운트다운 표시
- **Props**: `data`, `variant`
- **사용 위치**: `TimeDealSectionClient.tsx`, `app/sale/page.tsx`

#### `timedeal/TimeDealCountdown.tsx`
**역할**: 타임딜 카운트다운
- **기능**: 종료 시간까지 남은 시간 표시
- **Props**: `endTime`, `className`
- **사용 위치**: `TimeDealUI.tsx`

### 상품 관련 컴포넌트

#### `ProductCard.tsx`
**역할**: 상품 카드 컴포넌트
- **기능**:
  - 상품 이미지, 이름, 가격 표시
  - 찜하기 기능
  - 장바구니 추가 기능
  - 프로모션 정보 표시
  - 할인율 표시
- **Props**: `product`
- **사용 위치**: 상품 목록 페이지, 타임딜, 컬렉션 등

#### `product-info/`
**역할**: 상품별 상세 정보 컴포넌트
- **파일 구조**:
  - `ProductInfoExample.tsx`: 예시 컴포넌트
  - `ProductInfo-*.tsx`: 상품별 커스텀 정보 컴포넌트
- **사용 위치**: 상품 상세 페이지

#### `product-descriptions/`
**역할**: 상품별 설명 컴포넌트
- **파일 구조**:
  - `ProductDescriptionExample.tsx`: 예시 컴포넌트
  - `ProductDescription-*.tsx`: 상품별 커스텀 설명 컴포넌트
- **사용 위치**: 상품 상세 페이지

### 리뷰 관련 컴포넌트

#### `review/ReviewList.tsx`
**역할**: 리뷰 목록 표시
- **기능**:
  - `/api/reviews` API 호출
  - 리뷰 목록 렌더링
  - 페이지네이션
  - 리뷰 작성 모달 열기
- **Props**: `productId`, `onWriteReview`, `limit`, `showViewAllButton`
- **사용 위치**: 상품 상세 페이지

#### `review/ReviewItem.tsx`
**역할**: 개별 리뷰 아이템
- **기능**: 리뷰 내용, 별점, 이미지 표시
- **Props**: `review`
- **사용 위치**: `ReviewList.tsx`

#### `review/ReviewWriteModal.tsx`
**역할**: 리뷰 작성/수정 모달
- **기능**:
  - 리뷰 작성/수정
  - 이미지 업로드
  - `/api/reviews` API 호출
- **Props**: `isOpen`, `onClose`, `productId`, `review`
- **사용 위치**: `ReviewList.tsx`

#### `review/ReviewStars.tsx`
**역할**: 별점 표시 컴포넌트
- **기능**: 평균 별점을 별 아이콘으로 표시
- **Props**: `rating`, `size`
- **사용 위치**: `ProductCard.tsx`, `ReviewItem.tsx`

#### `review/StarIcons.tsx`
**역할**: 별 아이콘 컴포넌트
- **기능**: 별 아이콘 SVG 렌더링
- **사용 위치**: `ReviewStars.tsx`

### 공통 컴포넌트

#### `common/ConfirmModal.tsx`
**역할**: 확인 모달
- **기능**: 확인/취소 버튼이 있는 모달
- **Props**: `isOpen`, `onClose`, `onConfirm`, `title`, `message`
- **사용 위치**: 여러 페이지에서 재사용

#### `common/LoginPrompt.tsx`
**역할**: 로그인 프롬프트
- **기능**: 로그인이 필요한 경우 로그인 페이지로 이동 유도
- **사용 위치**: 로그인이 필요한 기능에서 사용

#### `common/ScrollToTop.tsx`
**역할**: 스크롤 탑 버튼
- **기능**: 페이지 상단으로 스크롤하는 버튼
- **사용 위치**: 여러 페이지

### 기능 컴포넌트

#### `NotificationBell.tsx`
**역할**: 알림 벨 아이콘
- **기능**:
  - 알림 개수 표시
  - `/api/notifications/unread-count` API 호출
  - 알림 목록 모달
- **사용 위치**: `Header.tsx`

#### `PromotionModal.tsx`
**역할**: 프로모션 모달
- **기능**: 프로모션 정보 표시 모달
- **Props**: `promotion`, `onClose`
- **사용 위치**: `PromotionModalWrapper.tsx`

#### `PromotionModalWrapper.tsx`
**역할**: 프로모션 모달 래퍼
- **기능**: 프로모션 모달을 전역에서 관리
- **사용 위치**: `app/page.tsx` (홈 페이지)

#### `FreeShippingProgress.tsx`
**역할**: 무료배송 진행률 표시
- **기능**: 장바구니 금액에 따른 무료배송 진행률 표시
- **사용 위치**: 장바구니 페이지, 체크아웃 페이지

### 스켈레톤 컴포넌트

#### `skeletons/ProductCardSkeleton.tsx`
**역할**: 상품 카드 로딩 스켈레톤
- **사용 위치**: 상품 목록 로딩 중

#### `skeletons/CartItemSkeleton.tsx`
**역할**: 장바구니 아이템 로딩 스켈레톤
- **사용 위치**: 장바구니 페이지 로딩 중

#### `skeletons/OrderItemSkeleton.tsx`
**역할**: 주문 아이템 로딩 스켈레톤
- **사용 위치**: 주문 목록 로딩 중

#### `skeletons/ReviewItemSkeleton.tsx`
**역할**: 리뷰 아이템 로딩 스켈레톤
- **사용 위치**: 리뷰 목록 로딩 중

---

## 컴포넌트 상세

### 서버/클라이언트 분리 패턴

#### 패턴 1: Server Component → Client Component
**예시**: `TimeDealSection.tsx` → `TimeDealSectionClient.tsx`
- **서버 컴포넌트**: 데이터 fetch 담당
- **클라이언트 컴포넌트**: UI 및 인터랙션 담당
- **장점**: SEO 최적화 + 실시간 업데이트

#### 패턴 2: Server Component → UI Component
**예시**: `BannerSection.tsx` → `BannerSectionUI.tsx`
- **서버 컴포넌트**: 데이터 fetch 담당
- **UI 컴포넌트**: 순수 UI 렌더링
- **장점**: 데이터와 UI 분리

### 컴포넌트 재사용성

#### 높은 재사용성
- `ProductCard.tsx`: 상품 목록, 타임딜, 컬렉션 등에서 사용
- `ReviewStars.tsx`: 상품 카드, 리뷰 아이템에서 사용
- `common/ConfirmModal.tsx`: 여러 페이지에서 사용

#### 특정 용도 컴포넌트
- `product-info/ProductInfo-*.tsx`: 특정 상품 전용
- `product-descriptions/ProductDescription-*.tsx`: 특정 상품 전용

### API 호출 패턴

#### 서버 컴포넌트에서 API 호출
- `BannerSection.tsx`: `/api/banners`
- `TimeDealSection.tsx`: `/api/timedeals`

#### 클라이언트 컴포넌트에서 API 호출
- `HeroSlider.tsx`: `/api/hero`
- `RecommendationSection.tsx`: `/api/recommendations`
- `ReviewList.tsx`: `/api/reviews`
- `NotificationBell.tsx`: `/api/notifications/unread-count`

### 상태 관리

#### 전역 상태 (Zustand)
- `useWishlistStore`: 찜 목록
- `useCartStore`: 장바구니
- `useSearchUIStore`: 검색 UI 상태
- `usePromotionModalStore`: 프로모션 모달 상태

#### 로컬 상태 (useState)
- 대부분의 컴포넌트에서 로컬 상태 사용
- 폼 입력, 모달 열림/닫힘 등

---

## 컴포넌트 사용 가이드

### 새로운 컴포넌트 추가 시

1. **서버 컴포넌트인가?**
   - 데이터 fetch가 필요한가?
   - SEO가 중요한가?
   - → `async function`으로 작성, `'use client'` 없음

2. **클라이언트 컴포넌트인가?**
   - 인터랙션이 필요한가?
   - 상태 관리가 필요한가?
   - → `'use client'` 지시어 추가

3. **폴더 구조**
   - 관련 컴포넌트는 하위 폴더로 그룹화
   - 공통 컴포넌트는 `common/` 폴더
   - 특정 기능 컴포넌트는 기능별 폴더

### 컴포넌트 네이밍 규칙

- **Server Component**: `*Section.tsx` (예: `BannerSection.tsx`)
- **Client Component**: `*UI.tsx` 또는 `*Client.tsx` (예: `BannerSectionUI.tsx`)
- **공통 컴포넌트**: 명확한 기능명 (예: `ConfirmModal.tsx`)

---

**마지막 업데이트:** 2024년
**작성자:** AI Assistant

