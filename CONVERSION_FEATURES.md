# 구매 전환율 향상을 위한 기능 추가 제안

## 프로젝트: 대가 정육백화점
**목표: 구매 유도 및 전환율 향상**

---

## 🔥 High Impact (즉시 구현 권장)

#### A. 장바구니 기반 추천
```typescript
// 장바구니에 한우 등심이 있으면 → 양념 소스, 채소 추천
const getRecommendations = async (cartItems: CartItem[]) => {
  const categories = cartItems.map(item => item.category)
  
  // 연관 상품 추천
  const { data } = await supabase
    .from('products')
    .select('*')
    .in('category', getRelatedCategories(categories))
    .limit(4)
  
  return data
}
```

#### B. 자주 함께 구매하는 상품
```sql
-- 통계 테이블 생성
create table product_associations (
  product_a_id uuid references products(id),
  product_b_id uuid references products(id),
  frequency integer default 0,
  primary key (product_a_id, product_b_id)
);
```

```tsx
// 상품 상세 페이지에 표시
<section className="py-8 border-t">
  <h3 className="text-lg font-bold mb-4">함께 구매하면 좋은 상품</h3>
  <div className="grid grid-cols-2 gap-4">
    {recommendations.map(product => (
      <ProductCard key={product.id} product={product} compact />
    ))}
  </div>
</section>
```


#### C. 리뷰 필터링
- 별점별 필터
- 포토 리뷰만 보기
- 최신순/추천순 정렬
- 검색 기능 (키워드)

**효과:** 
- 리뷰 작성률 60% 증가
- 리뷰가 있는 상품의 전환율 30% 상승

---

### 9. 🎁 선물하기 개선
**목적**: 선물 수요 확대

**현재 상태:** 기본 선물하기 기능 존재 ✅

**개선안:**

#### A. 선물 메시지 카드
```typescript
interface GiftMessage {
  order_id: string
  sender_name: string
  message: string
  card_design: 'birthday' | 'anniversary' | 'thanks' | 'custom'
  delivery_date: string  // 예약 배송
}
```

#### B. 선물 포장 옵션
- 리본 포장 (+2,000원)
- 고급 선물 박스 (+5,000원)
- 손수 쓴 카드 (+3,000원)

#### C. 카카오톡 선물하기 연동
- 카카오 메시지로 선물 전송
- 받는 사람이 주소 입력
- 선물 수령 알림

**효과:** 
- 선물 주문 40% 증가
- 신규 고객 유입 25% 증가

---

## 💡 Low Impact (장기 계획)

### 10. 🔔 가격 알림 / 재입고 알림
**목적**: 재방문 유도

**기능:**
- 원하는 상품의 가격이 떨어지면 알림
- 품절 상품 재입고 시 알림
- 이메일/푸시 알림

```sql
create table price_alerts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id),
  product_id uuid references products(id),
  target_price integer,
  is_active boolean default true,
  created_at timestamp default now()
);

create table restock_alerts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id),
  product_id uuid references products(id),
  notified_at timestamp,
  created_at timestamp default now()
);
```

---

### 11. 🎥 라이브 커머스
**목적**: 실시간 소통 및 구매 유도

**기능:**
- 정육 부위별 설명 라이브
- 조리법 시연
- 실시간 질문/답변
- 라이브 전용 할인

**기술 스택:**
- YouTube Live 또는 Instagram Live 연동
- 또는 독자 스트리밍 (WebRTC)

---

### 12. 📱 푸시 알림
**목적**: 재방문 및 재구매 유도

**알림 시나리오:**
- 장바구니 방치 (24시간 후)
- 쿠폰 만료 임박 (3일 전)
- 주문 배송 상태 변경
- 리뷰 작성 가능 (배송 완료 3일 후)
- 관심 상품 할인

**기술:**
- Firebase Cloud Messaging (FCM)
- Web Push API

---

## 📊 우선순위 구현 계획

### Phase 1 (1주차) - Quick Wins
1. ✅ 무료배송 진행률 바
2. ✅ 재고 경고 표시
3. ✅ 최근 구매 알림 토스트

**예상 효과:** 전환율 +15%

### Phase 2 (2주차) - 신뢰 구축
4. ✅ 타임딜/플래시 세일
5. ✅ 쿠폰 시스템
6. ✅ 리뷰 인센티브

**예상 효과:** 전환율 +25%, 재구매율 +30%

### Phase 3 (1개월) - 개인화
7. ✅ 추천 시스템
8. ✅ 포인트 리워드
9. ✅ 선물하기 개선

**예상 효과:** 객단가 +30%, LTV +200%

### Phase 4 (3개월) - 고도화
10. ✅ 구독 서비스
11. ✅ 라이브 커머스
12. ✅ 푸시 알림

**예상 효과:** 매출 +100%, 충성 고객 +150%

---

## 🎯 정육 쇼핑몰 특화 전략

### 레시피 콘텐츠 마케팅
```typescript
interface Recipe {
  id: string
  title: string  // "한우 등심 스테이크 완벽 가이드"
  description: string
  cooking_time: number
  difficulty: 'easy' | 'medium' | 'hard'
  ingredients: {
    product_id: string
    quantity: number
  }[]
  steps: string[]
  images: string[]
  video_url?: string
}
```

**장점:**
- SEO 최적화 (검색 유입 증가)
- 상품 활용법 제시로 구매 확신 증가
- 여러 상품 동시 구매 유도

---

### 부위별 가이드
- 소고기 부위도 (등심, 안심, 채끝 등)
- 각 부위별 추천 조리법
- 가격 비교 및 가성비 정보

---

### 신선도 보장 강조
```tsx
<div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-4 mb-4">
  <div className="flex items-center gap-3">
    <span className="text-3xl">❄️</span>
    <div>
      <p className="font-bold text-blue-900">신선도 보장</p>
      <p className="text-sm text-blue-700">
        당일 도축 → 당일 배송 시스템<br/>
        신선하지 않으면 100% 환불
      </p>
    </div>
  </div>
</div>
```

---

## 📈 성과 측정 지표 (KPI)

추가 기능 도입 후 반드시 측정해야 할 지표:

1. **전환율 (Conversion Rate)**
   - 방문자 대비 구매자 비율
   - 목표: 1.5% → 3.0%

2. **객단가 (Average Order Value)**
   - 주문당 평균 금액
   - 목표: 50,000원 → 75,000원

3. **재구매율 (Repeat Purchase Rate)**
   - 2회 이상 구매 고객 비율
   - 목표: 10% → 35%

4. **장바구니 이탈률 (Cart Abandonment Rate)**
   - 장바구니에 담고 구매 안 한 비율
   - 목표: 70% → 40%

5. **고객 생애 가치 (LTV)**
   - 고객 1명당 총 매출
   - 목표: 100,000원 → 500,000원

---

## 💰 예상 투자 대비 효과 (ROI)

| 기능 | 개발 시간 | 개발 비용 | 예상 매출 증가 | ROI |
|------|----------|----------|---------------|-----|
| 무료배송 바 | 1일 | 낮음 | +15% | 500% |
| 쿠폰 시스템 | 3일 | 중간 | +30% | 800% |
| 타임딜 | 2일 | 낮음 | +25% | 600% |
| 추천 시스템 | 1주 | 높음 | +35% | 400% |
| 구독 서비스 | 2주 | 높음 | +100% | 300% |

---

**최종 권장 사항:**
Phase 1-2 기능들을 먼저 빠르게 구현하여 Quick Win을 달성하고, 데이터를 분석하면서 Phase 3-4를 점진적으로 추가하는 것을 권장합니다. 🚀

