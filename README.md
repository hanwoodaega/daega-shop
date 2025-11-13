# 대가 정육백화점 (Daega Premium Meat)

한우와 고급 정육을 판매하는 프리미엄 온라인 쇼핑몰입니다.

![Next.js](https://img.shields.io/badge/Next.js-14.0-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-18.2-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-2.38-3ECF8E?style=flat-square&logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.3-06B6D4?style=flat-square&logo=tailwindcss)

---

## 📋 목차

- [주요 기능](#-주요-기능)
- [기술 스택](#-기술-스택)
- [프로젝트 구조](#-프로젝트-구조)
- [시작하기](#-시작하기)
- [환경 변수 설정](#-환경-변수-설정)
- [개발 가이드](#-개발-가이드)
- [배포](#-배포)
- [라이선스](#-라이선스)

---

## 🎯 주요 기능

### 고객 기능
- **상품 조회**
  - 카테고리별 상품 검색 (한우, 돼지고기, 수입육, 가공육 등)
  - 가격순/최신순 정렬
  - 무한 스크롤 페이지네이션
  - 상품 상세 정보 (원산지, 중량, 가격 등)

- **장바구니 & 위시리스트**
  - 실시간 장바구니 동기화 (로그인/비로그인)
  - 찜 목록 관리
  - 프로모션 상품 자동 계산 (1+1, 2+1, 3+1)
  - 품절 상품 자동 제거

- **주문 & 결제**
  - 일반 주문 / 선물하기
  - 배송지 관리 (기본 배송지 설정)
  - 배송 유형 선택 (퀵배송, 일반배송, 픽업)
  - 주문 내역 조회 및 환불 요청

- **리뷰 시스템**
  - 별점 및 텍스트 리뷰 작성
  - 리뷰 이미지 업로드
  - 구매 확정 후 리뷰 작성 가능
  - 리뷰 갤러리 보기

- **회원 관리**
  - 이메일 회원가입/로그인
  - 네이버 소셜 로그인
  - 프로필 수정
  - 배송지 관리

### 관리자 기능
- **상품 관리**
  - 상품 등록/수정/삭제
  - 이미지 업로드
  - 프로모션 설정
  - 재고 관리

- **주문 관리**
  - 주문 조회 및 상태 변경
  - 환불 처리

- **프로모션 관리**
  - 1+1, 2+1, 3+1 프로모션 설정
  - 할인율 설정

---

## 🛠 기술 스택

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.0
- **UI Library**: React 18.2
- **Styling**: Tailwind CSS 3.3
- **State Management**: Zustand 4.4
- **Form Validation**: React Hook Form (추천)
- **Notifications**: React Hot Toast 2.6

### Backend
- **BaaS**: Supabase
  - PostgreSQL Database
  - Authentication (Email, OAuth)
  - Row Level Security (RLS)
  - Storage (이미지 업로드)
  - Realtime Subscriptions

### DevOps
- **Hosting**: Vercel (권장)
- **Version Control**: Git
- **Package Manager**: npm

---

## 📁 프로젝트 구조

```
daega-shop/
├── web/
│   ├── app/                      # Next.js App Router
│   │   ├── (routes)/             # 라우트 그룹
│   │   │   ├── page.tsx          # 홈페이지
│   │   │   ├── products/         # 상품 관련
│   │   │   ├── cart/             # 장바구니
│   │   │   ├── checkout/         # 주문
│   │   │   ├── orders/           # 주문 내역
│   │   │   ├── profile/          # 프로필
│   │   │   └── auth/             # 인증
│   │   ├── admin/                # 관리자 페이지
│   │   ├── api/                  # API 라우트
│   │   │   ├── products/
│   │   │   ├── cart/
│   │   │   ├── orders/
│   │   │   └── reviews/
│   │   ├── layout.tsx            # 루트 레이아웃
│   │   └── globals.css           # 글로벌 스타일
│   │
│   ├── components/               # React 컴포넌트
│   │   ├── common/               # 공통 컴포넌트
│   │   ├── review/               # 리뷰 관련
│   │   ├── admin/                # 관리자 전용
│   │   └── skeletons/            # 로딩 스켈레톤
│   │
│   ├── lib/                      # 유틸리티 및 설정
│   │   ├── supabase.ts           # Supabase 클라이언트
│   │   ├── supabase-server.ts    # 서버용 클라이언트
│   │   ├── auth-context.tsx      # 인증 Context
│   │   ├── store.ts              # Zustand 스토어
│   │   ├── utils.ts              # 유틸리티 함수
│   │   ├── error-handler.ts      # 에러 핸들러
│   │   ├── hooks/                # 커스텀 훅
│   │   └── types/                # 타입 정의
│   │
│   ├── public/                   # 정적 파일
│   │   └── images/               # 이미지 리소스
│   │
│   ├── types/                    # 전역 타입 정의
│   │   ├── api.ts
│   │   └── common.ts
│   │
│   ├── middleware.ts             # Next.js 미들웨어
│   ├── next.config.js            # Next.js 설정
│   ├── tailwind.config.ts        # Tailwind 설정
│   ├── tsconfig.json             # TypeScript 설정
│   └── package.json              # 의존성 관리
│
└── README.md
```

---

## 🚀 시작하기

### 필수 요구사항
- Node.js 18.x 이상
- npm 또는 yarn
- Supabase 계정

### 설치 방법

1. **저장소 클론**
   ```bash
   git clone https://github.com/your-username/daega-shop.git
   cd daega-shop/web
   ```

2. **의존성 설치**
   ```bash
   npm install
   ```

3. **환경 변수 설정** (아래 섹션 참조)
   ```bash
   cp .env.example .env.local
   # .env.local 파일 편집
   ```

4. **개발 서버 실행**
   ```bash
   npm run dev
   ```

5. **브라우저에서 확인**
   ```
   http://localhost:3000
   ```

---

## 🔐 환경 변수 설정

`.env.local` 파일을 생성하고 다음 변수들을 설정하세요:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Naver OAuth (선택사항)
NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_client_secret
NAVER_CALLBACK_URL=http://localhost:3000/auth/naver/callback

# Admin (개발 환경)
ADMIN_PASSWORD=your_admin_password

# Base URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Supabase 설정

1. [Supabase](https://supabase.com)에서 프로젝트 생성
2. Database 스키마 설정:

```sql
-- Users 테이블 (Supabase Auth 사용)

-- Products 테이블
create table products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  price integer not null,
  image_url text,
  category text,
  stock integer default 0,
  unit text,
  weight numeric,
  origin text,
  brand text,
  discount_percent integer,
  promotion_type text,
  promotion_products text[],
  product_info text,
  average_rating numeric,
  review_count integer default 0,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Carts 테이블
create table carts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  quantity integer default 1,
  promotion_type text,
  promotion_group_id text,
  discount_percent integer,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Orders 테이블
create table orders (
  id uuid primary key default uuid_generate_v4(),
  order_number text,
  user_id uuid references auth.users(id) on delete cascade,
  total_amount integer not null,
  status text default 'pending',
  delivery_type text,
  delivery_time text,
  shipping_address text,
  shipping_name text,
  shipping_phone text,
  delivery_note text,
  refund_status text,
  refund_amount integer,
  refund_requested_at timestamp,
  refund_completed_at timestamp,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Order Items 테이블
create table order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references orders(id) on delete cascade,
  product_id uuid references products(id),
  quantity integer default 1,
  price integer not null,
  created_at timestamp default now()
);

-- Reviews 테이블
create table reviews (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  order_id uuid references orders(id),
  rating integer check (rating >= 1 and rating <= 5),
  title text,
  content text,
  images text[],
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Wishlists 테이블
create table wishlists (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  created_at timestamp default now()
);

-- Addresses 테이블
create table addresses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  recipient_name text not null,
  recipient_phone text not null,
  zipcode text,
  address text not null,
  address_detail text,
  delivery_note text,
  is_default boolean default false,
  created_at timestamp default now(),
  updated_at timestamp default now()
);
```

3. RLS (Row Level Security) 정책 설정
4. Storage 버킷 생성 (상품 이미지, 리뷰 이미지)

---

## 💻 개발 가이드

### 스크립트

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm run start

# 린트 검사
npm run lint

# 타입 체크
npm run type-check
```

### 코딩 컨벤션

- **TypeScript**: 모든 컴포넌트와 함수에 타입 정의
- **컴포넌트**: PascalCase (예: `ProductCard.tsx`)
- **함수/변수**: camelCase (예: `formatPrice`)
- **상수**: UPPER_SNAKE_CASE (예: `PAGE_SIZE`)
- **CSS**: Tailwind 유틸리티 클래스 우선 사용

### Git 커밋 메시지

```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 포맷팅
refactor: 코드 리팩토링
test: 테스트 추가
chore: 빌드 설정 등
```

### 브랜치 전략

```
main        # 프로덕션 브랜치
develop     # 개발 브랜치
feature/*   # 기능 개발
bugfix/*    # 버그 수정
hotfix/*    # 긴급 수정
```

---

## 📦 배포

### Vercel 배포 (권장)

1. Vercel 계정 생성 및 프로젝트 연결
2. 환경 변수 설정
3. 자동 배포 (Git push 시)

```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel

# 프로덕션 배포
vercel --prod
```

### 수동 배포

```bash
# 빌드
npm run build

# 서버 실행
npm run start
```

---

## 🔧 트러블슈팅

### 일반적인 문제

**Q: Supabase 연결 오류**
```
A: 환경 변수가 올바르게 설정되었는지 확인하세요.
   .env.local 파일의 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 확인하세요.
```

**Q: 이미지가 표시되지 않음**
```
A: Supabase Storage 버킷이 public으로 설정되어 있는지 확인하세요.
   next.config.js의 images.domains에 Supabase 도메인이 추가되어 있는지 확인하세요.
```

**Q: 관리자 페이지 접근 불가**
```
A: /admin/login 페이지에서 로그인 후 쿠키가 설정되는지 확인하세요.
   middleware.ts의 인증 로직을 확인하세요.
```

---

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

---

## 📞 문의

- **이메일**: support@daega-shop.com
- **이슈 트래커**: [GitHub Issues](https://github.com/your-username/daega-shop/issues)

---

## 🙏 감사의 말

- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Zustand](https://github.com/pmndrs/zustand)
- [React Hot Toast](https://react-hot-toast.com/)

---

**Made with ❤️ by Daega Team**

