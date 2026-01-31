# API 호출 위치 정리 (서버/클라이언트)

이 문서는 프로젝트의 모든 API 호출이 서버에서 이루어지는지 클라이언트에서 이루어지는지 정리한 문서입니다.

## 목차
- [API 라우트](#api-라우트)
- [서비스 함수](#서비스-함수)
- [호출 패턴](#호출-패턴)
- [⚠️ 위험 포인트 및 주의사항](#-위험-포인트-및-주의사항)
- [🔒 보안 고려사항](#-보안-고려사항)

---

## API 라우트

### 공개 API (클라이언트/서버 모두 호출 가능)

#### 상품 관련
| API 경로 | 서버 호출 | 클라이언트 호출 | 호출 위치 |
|---------|---------|---------------|----------|
| `GET /api/products` | ⚠️ | ✅ | **서버**: 서버 컴포넌트에서 직접 호출하지 않지만, 서버 API route 내부에서 `enrichProductsServer` 사용<br>**클라이언트**: `lib/product/product.service.ts` (fetchProducts)<br>**참고**: 공용 데이터 API로 서버/클라이언트 모두에서 사용 가능 |
| `GET /api/products/[id]` | ❌ | ✅ | **클라이언트**: `app/product/[id]/_hooks/useProductDetail.ts` |
| `GET /api/products/[slug]` | ✅ | ❌ | **서버**: `app/products/[slug]/page.tsx` |

#### 타임딜 관련
| API 경로 | 서버 호출 | 클라이언트 호출 | 호출 위치 |
|---------|---------|---------------|----------|
| `GET /api/timedeals` | ✅ | ✅ | **서버**: `components/timedeal/TimeDealSection.tsx` (초기 렌더링/SEO용)<br>**클라이언트**: `lib/timedeal/timedeal.service.ts` (fetchTimeDeal), `lib/timedeal/useTimeDealPolling.ts` (실시간 업데이트/폴링용)<br>**⚠️ 주의**: 초기 진입 시 서버+클라이언트에서 중복 호출 발생 (의도된 중복 - 아래 위험 포인트 참고) |

#### 컬렉션 관련
| API 경로 | 서버 호출 | 클라이언트 호출 | 호출 위치 |
|---------|---------|---------------|----------|
| `GET /api/collections` | ✅ | ❌ | **서버**: `app/page.tsx` |
| `GET /api/collections/[slug]` | ✅ | ❌ | **서버**: `app/(home)/_components/CollectionSectionContainer.tsx` |

#### 배너 관련
| API 경로 | 서버 호출 | 클라이언트 호출 | 호출 위치 |
|---------|---------|---------------|----------|
| `GET /api/banners` | ✅ | ❌ | **서버**: `components/banner/BannerSection.tsx` |
| `GET /api/banners/[slug]` | ✅ | ❌ | **서버**: `app/(home)/_components/CollectionSectionContainer.tsx` |

#### 카테고리 관련
| API 경로 | 서버 호출 | 클라이언트 호출 | 호출 위치 |
|---------|---------|---------------|----------|
| `GET /api/categories` | ✅ | ❌ | **서버**: `app/best/page.tsx`, `app/sale/page.tsx`, `app/no9/page.tsx` |
| `GET /api/categories/[type]` | ✅ | ❌ | **서버**: `app/best/page.tsx`, `app/sale/page.tsx`, `app/no9/page.tsx` |

#### 추천 관련
| API 경로 | 서버 호출 | 클라이언트 호출 | 호출 위치 |
|---------|---------|---------------|----------|
| `GET /api/recommendations` | ✅ | ❌ | **서버**: `components/RecommendationSection.tsx` |
| `GET /api/recommendations/[categoryId]/products` | ✅ | ❌ | **서버**: `components/RecommendationSection.tsx` |

#### 히어로 슬라이더
| API 경로 | 서버 호출 | 클라이언트 호출 | 호출 위치 |
|---------|---------|---------------|----------|
| `GET /api/hero` | ✅ | ❌ | **서버**: `components/HeroSlider.tsx` |

### 사용자 인증 관련
| API 경로 | 서버 호출 | 클라이언트 호출 | 호출 위치 |
|---------|---------|---------------|----------|
| `GET /api/auth/session` | ❌ | ✅ | **클라이언트**: `lib/auth/auth-context.tsx` |
| `POST /api/auth/send-verification-code` | ❌ | ✅ | **클라이언트**: `app/auth/find-id/page.tsx`, `app/auth/reset-password/page.tsx` |
| `POST /api/auth/verify-code` | ❌ | ✅ | **클라이언트**: `app/auth/find-id/page.tsx`, `app/auth/reset-password/page.tsx` |
| `GET /api/auth/naver` | ❌ | ✅ | **클라이언트**: `app/auth/naver/callback/page.tsx` |

### 사용자 프로필 관련
| API 경로 | 서버 호출 | 클라이언트 호출 | 호출 위치 |
|---------|---------|---------------|----------|
| `GET /api/profile` | ❌ | ✅ | **클라이언트**: `app/profile/page.tsx` |
| `GET /api/profile/info` | ❌ | ✅ | **클라이언트**: `app/profile/page.tsx` |
| `GET /api/user/profile` | ❌ | ✅ | **클라이언트**: `lib/address/useAddress.ts` (useUserProfile) |

### 주문 관련
| API 경로 | 서버 호출 | 클라이언트 호출 | 호출 위치 |
|---------|---------|---------------|----------|
| `GET /api/orders` | ❌ | ✅ | **클라이언트**: `lib/order/order.service.ts` |
| `POST /api/orders` | ❌ | ✅ | **클라이언트**: `lib/checkout/checkout.service.ts` |
| `POST /api/orders/confirm` | ❌ | ✅ | **클라이언트**: `app/orders/_components/OrderConfirmButton.tsx` |
| `POST /api/orders/cancel` | ❌ | ✅ | **클라이언트**: `app/orders/_components/OrderCancelButton.tsx` |

### 장바구니 관련
| API 경로 | 서버 호출 | 클라이언트 호출 | 호출 위치 |
|---------|---------|---------------|----------|
| `GET /api/cart` | ❌ | ✅ | **클라이언트**: `lib/cart/cart-db.ts` |
| `POST /api/cart` | ❌ | ✅ | **클라이언트**: `lib/cart/cart-db.ts` |
| `DELETE /api/cart` | ❌ | ✅ | **클라이언트**: `lib/cart/cart-db.ts` |

### 찜 목록 관련
| API 경로 | 서버 호출 | 클라이언트 호출 | 호출 위치 |
|---------|---------|---------------|----------|
| `GET /api/wishlist` | ❌ | ✅ | **클라이언트**: `lib/wishlist/wishlist-db.ts` |
| `GET /api/wishlist/products` | ❌ | ✅ | **클라이언트**: `app/wishlist/page.tsx` |
| `POST /api/wishlist` | ❌ | ✅ | **클라이언트**: `lib/wishlist/wishlist-db.ts` |
| `DELETE /api/wishlist` | ❌ | ✅ | **클라이언트**: `lib/wishlist/wishlist-db.ts` |

### 쿠폰 관련
| API 경로 | 서버 호출 | 클라이언트 호출 | 호출 위치 |
|---------|---------|---------------|----------|
| `GET /api/coupons` | ❌ | ✅ | **클라이언트**: `lib/coupon/coupons.ts` |
| `POST /api/coupons/use` | ❌ | ✅ | **클라이언트**: `lib/coupon/coupons.ts` |
| `POST /api/coupons/issue` | ❌ | ✅ | **클라이언트**: `lib/coupon/coupons.ts` |
| `POST /api/coupons/first-purchase` | ❌ | ✅ | **클라이언트**: `lib/coupon/coupons.ts` |
| `GET /api/users/signup-coupon` | ❌ | ✅ | **클라이언트**: `app/auth/signup/page.tsx` |

### 포인트 관련
| API 경로 | 서버 호출 | 클라이언트 호출 | 호출 위치 |
|---------|---------|---------------|----------|
| `GET /api/points` | ❌ | ✅ | **클라이언트**: `app/profile/points/page.tsx` |
| `GET /api/points/history` | ❌ | ✅ | **클라이언트**: `app/profile/points/page.tsx` |
| `GET /api/points/pending` | ❌ | ✅ | **클라이언트**: `app/profile/points/page.tsx` |

### 주소 관련
| API 경로 | 서버 호출 | 클라이언트 호출 | 호출 위치 |
|---------|---------|---------------|----------|
| `GET /api/addresses` | ❌ | ✅ | **클라이언트**: `lib/address/useAddress.ts` |
| `POST /api/addresses` | ❌ | ✅ | **클라이언트**: `lib/address/useAddress.ts` |
| `PUT /api/addresses/[id]` | ❌ | ✅ | **클라이언트**: `lib/address/useAddress.ts` |
| `DELETE /api/addresses/[id]` | ❌ | ✅ | **클라이언트**: `lib/address/useAddress.ts` |
| `POST /api/addresses/[id]/default` | ❌ | ✅ | **클라이언트**: `lib/address/useAddress.ts` |
| `POST /api/addresses/default` | ❌ | ✅ | **클라이언트**: `lib/address/useAddress.ts` |
| `POST /api/addresses/check` | ❌ | ✅ | **클라이언트**: `lib/address/useAddress.ts` |

### 리뷰 관련
| API 경로 | 서버 호출 | 클라이언트 호출 | 호출 위치 |
|---------|---------|---------------|----------|
| `GET /api/reviews` | ❌ | ✅ | **클라이언트**: `components/review/ReviewList.tsx` |
| `GET /api/reviews/reviewable` | ❌ | ✅ | **클라이언트**: `app/profile/reviews/page.tsx` |
| `GET /api/reviews/my-reviews` | ❌ | ✅ | **클라이언트**: `app/profile/reviews/page.tsx` |
| `POST /api/reviews` | ❌ | ✅ | **클라이언트**: `components/review/ReviewWriteModal.tsx` |
| `POST /api/reviews/upload-image` | ❌ | ✅ | **클라이언트**: `components/review/ReviewWriteModal.tsx` |
| `GET /api/reviews/images` | ❌ | ✅ | **클라이언트**: `components/review/ReviewList.tsx` |
| `PUT /api/reviews/[id]` | ❌ | ✅ | **클라이언트**: `components/review/ReviewWriteModal.tsx` |
| `DELETE /api/reviews/[id]` | ❌ | ✅ | **클라이언트**: `components/review/ReviewList.tsx` |

### 알림 관련
| API 경로 | 서버 호출 | 클라이언트 호출 | 호출 위치 |
|---------|---------|---------------|----------|
| `GET /api/notifications` | ❌ | ✅ | **클라이언트**: `lib/notification/notification.service.ts` |
| `GET /api/notifications/unread-count` | ❌ | ✅ | **클라이언트**: `components/NotificationBell.tsx` |
| `PUT /api/notifications` | ❌ | ✅ | **클라이언트**: `lib/notification/notification.service.ts` |

### 선물 관련
| API 경로 | 서버 호출 | 클라이언트 호출 | 호출 위치 |
|---------|---------|---------------|----------|
| `GET /api/gift/featured` | ✅ | ❌ | **서버**: `app/gift/page.tsx` |
| `GET /api/gift/target/[slug]` | ✅ | ❌ | **서버**: `app/gift/target/[slug]/page.tsx` |
| `GET /api/gift/budget/[slug]` | ✅ | ❌ | **서버**: `app/gift/budget/[slug]/page.tsx` |
| `GET /api/gift/[token]` | ❌ | ✅ | **클라이언트**: `lib/gift/gift.service.ts` |
| `POST /api/gift/create-pending` | ❌ | ✅ | **클라이언트**: `lib/checkout/checkout.service.ts` |
| `POST /api/gift/upload-card-image` | ❌ | ✅ | **클라이언트**: `lib/gift/gift.service.ts` |

### 결제 카드 관련
| API 경로 | 서버 호출 | 클라이언트 호출 | 호출 위치 |
|---------|---------|---------------|----------|
| `GET /api/payment-cards` | ❌ | ✅ | **클라이언트**: `app/profile/payment/page.tsx` |
| `POST /api/payment-cards` | ❌ | ✅ | **클라이언트**: `app/profile/payment/page.tsx` |
| `DELETE /api/payment-cards/[id]` | ❌ | ✅ | **클라이언트**: `app/profile/payment/page.tsx` |

### 약관 관련
| API 경로 | 서버 호출 | 클라이언트 호출 | 호출 위치 |
|---------|---------|---------------|----------|
| `POST /api/users/terms` | ❌ | ✅ | **클라이언트**: `app/auth/signup/page.tsx` |

### 워커/크론 관련
| API 경로 | 서버 호출 | 클라이언트 호출 | 호출 위치 |
|---------|---------|---------------|----------|
| `POST /api/worker/update-tracking-status` | ❌ | ✅ | **클라이언트**: 외부 워커 (Vercel Cron) |
| `GET /api/cron/update-tracking-status` | ❌ | ✅ | **클라이언트**: Vercel Cron Job |

### 관리자 API (모두 클라이언트 호출)

#### 관리자 인증
| API 경로 | 서버 호출 | 클라이언트 호출 | 호출 위치 |
|---------|---------|---------------|----------|
| `GET /api/admin/login` | ❌ | ✅ | **클라이언트**: `app/admin/login/page.tsx` |
| `POST /api/admin/login` | ❌ | ✅ | **클라이언트**: `app/admin/login/page.tsx` |
| `POST /api/admin/logout` | ❌ | ✅ | **클라이언트**: `app/admin/login/page.tsx` |

#### 관리자 상품 관리
| API 경로 | 서버 호출 | 클라이언트 호출 | 호출 위치 |
|---------|---------|---------------|----------|
| `GET /api/admin/products` | ❌ | ✅ | **클라이언트**: `app/admin/products/_hooks/useAdminProducts.ts` |
| `POST /api/admin/products` | ❌ | ✅ | **클라이언트**: `app/admin/products/_hooks/useAdminProducts.ts` |
| `GET /api/admin/products/[id]` | ❌ | ✅ | **클라이언트**: `app/admin/products/_hooks/useAdminProducts.ts` |
| `PUT /api/admin/products/[id]` | ❌ | ✅ | **클라이언트**: `app/admin/products/_hooks/useAdminProducts.ts` |
| `DELETE /api/admin/products/[id]` | ❌ | ✅ | **클라이언트**: `app/admin/products/_hooks/useAdminProducts.ts` |
| `POST /api/admin/products/[id]/images` | ❌ | ✅ | **클라이언트**: `app/admin/products/_hooks/useProductImages.ts` |
| `DELETE /api/admin/products/[id]/images/[imageId]` | ❌ | ✅ | **클라이언트**: `app/admin/products/_hooks/useProductImages.ts` |

#### 관리자 타임딜 관리
| API 경로 | 서버 호출 | 클라이언트 호출 | 호출 위치 |
|---------|---------|---------------|----------|
| `GET /api/admin/timedeals` | ❌ | ✅ | **클라이언트**: `app/admin/timedeals/_hooks/useAdminTimeDeals.ts` |
| `POST /api/admin/timedeals` | ❌ | ✅ | **클라이언트**: `app/admin/timedeals/_hooks/useAdminTimeDeals.ts` |
| `PUT /api/admin/timedeals/[id]` | ❌ | ✅ | **클라이언트**: `app/admin/timedeals/_hooks/useAdminTimeDeals.ts` |
| `DELETE /api/admin/timedeals/[id]` | ❌ | ✅ | **클라이언트**: `app/admin/timedeals/_hooks/useAdminTimeDeals.ts` |

#### 관리자 쿠폰 관리
| API 경로 | 서버 호출 | 클라이언트 호출 | 호출 위치 |
|---------|---------|---------------|----------|
| `GET /api/admin/coupons` | ❌ | ✅ | **클라이언트**: `app/admin/coupons/_hooks/useCoupons.ts` |
| `POST /api/admin/coupons` | ❌ | ✅ | **클라이언트**: `app/admin/coupons/_hooks/useCouponForm.ts` |
| `PUT /api/admin/coupons/[id]` | ❌ | ✅ | **클라이언트**: `app/admin/coupons/_hooks/useCouponForm.ts` |
| `DELETE /api/admin/coupons/[id]` | ❌ | ✅ | **클라이언트**: `app/admin/coupons/_hooks/useCoupons.ts` |
| `POST /api/admin/coupons/issue` | ❌ | ✅ | **클라이언트**: `app/admin/coupons/_hooks/useIssueCoupon.ts` |

#### 관리자 프로모션 관리
| API 경로 | 서버 호출 | 클라이언트 호출 | 호출 위치 |
|---------|---------|---------------|----------|
| `GET /api/admin/promotions` | ❌ | ✅ | **클라이언트**: `app/admin/promotions/_hooks/useAdminPromotions.ts` |
| `POST /api/admin/promotions` | ❌ | ✅ | **클라이언트**: `app/admin/promotions/_hooks/useAdminPromotions.ts` |
| `PUT /api/admin/promotions/[id]` | ❌ | ✅ | **클라이언트**: `app/admin/promotions/_hooks/useAdminPromotions.ts` |
| `DELETE /api/admin/promotions/[id]` | ❌ | ✅ | **클라이언트**: `app/admin/promotions/_hooks/useAdminPromotions.ts` |
| `GET /api/admin/promotions/products` | ❌ | ✅ | **클라이언트**: `app/admin/promotions/_hooks/useProductSelector.ts` |
| `POST /api/admin/promotions/[id]/products` | ❌ | ✅ | **클라이언트**: `app/admin/promotions/_hooks/usePromotionProducts.ts` |
| `DELETE /api/admin/promotions/[id]/products` | ❌ | ✅ | **클라이언트**: `app/admin/promotions/_hooks/usePromotionProducts.ts` |
| `POST /api/admin/promotions/cleanup-cart` | ❌ | ✅ | **클라이언트**: `lib/cart/cart-db.ts` |

#### 관리자 주문 관리
| API 경로 | 서버 호출 | 클라이언트 호출 | 호출 위치 |
|---------|---------|---------------|----------|
| `GET /api/admin/orders` | ❌ | ✅ | **클라이언트**: `app/admin/orders/_hooks/useAdminOrders.ts` |
| `PUT /api/admin/orders/[id]` | ❌ | ✅ | **클라이언트**: `app/admin/orders/_hooks/useAdminOrders.ts` |
| `POST /api/admin/orders/auto-confirm` | ❌ | ✅ | **클라이언트**: `app/admin/orders/_hooks/useAdminOrders.ts` |

#### 관리자 리뷰 관리
| API 경로 | 서버 호출 | 클라이언트 호출 | 호출 위치 |
|---------|---------|---------------|----------|
| `GET /api/admin/reviews` | ❌ | ✅ | **클라이언트**: `app/admin/reviews/page.tsx` |
| `PATCH /api/admin/reviews/[id]` | ❌ | ✅ | **클라이언트**: `app/admin/reviews/page.tsx` |

#### 관리자 컬렉션 관리
| API 경로 | 서버 호출 | 클라이언트 호출 | 호출 위치 |
|---------|---------|---------------|----------|
| `GET /api/admin/collections` | ❌ | ✅ | **클라이언트**: `app/admin/collections/_hooks/useCollections.ts` |
| `POST /api/admin/collections` | ❌ | ✅ | **클라이언트**: `app/admin/collections/_hooks/useCollections.ts` |
| `PUT /api/admin/collections/[id]` | ❌ | ✅ | **클라이언트**: `app/admin/collections/_hooks/useCollections.ts` |
| `DELETE /api/admin/collections/[id]` | ❌ | ✅ | **클라이언트**: `app/admin/collections/_hooks/useCollections.ts` |
| `POST /api/admin/collections/[id]/products` | ❌ | ✅ | **클라이언트**: `app/admin/collections/_hooks/useCollections.ts` |
| `DELETE /api/admin/collections/[id]/products` | ❌ | ✅ | **클라이언트**: `app/admin/collections/_hooks/useCollections.ts` |

#### 관리자 배너 관리
| API 경로 | 서버 호출 | 클라이언트 호출 | 호출 위치 |
|---------|---------|---------------|----------|
| `GET /api/admin/banners` | ❌ | ✅ | **클라이언트**: `app/admin/banners/_hooks/useBanners.ts` |
| `POST /api/admin/banners` | ❌ | ✅ | **클라이언트**: `app/admin/banners/_components/BannerFormModal.tsx` |
| `PUT /api/admin/banners/[id]` | ❌ | ✅ | **클라이언트**: `app/admin/banners/_components/BannerFormModal.tsx` |
| `DELETE /api/admin/banners/[id]` | ❌ | ✅ | **클라이언트**: `app/admin/banners/_hooks/useBanners.ts` |
| `POST /api/admin/banners/[id]/products` | ❌ | ✅ | **클라이언트**: `app/admin/banners/_components/ProductSelectorModal.tsx` |
| `DELETE /api/admin/banners/[id]/products` | ❌ | ✅ | **클라이언트**: `app/admin/banners/_hooks/useBanners.ts` |

#### 관리자 히어로 관리
| API 경로 | 서버 호출 | 클라이언트 호출 | 호출 위치 |
|---------|---------|---------------|----------|
| `GET /api/admin/hero` | ❌ | ✅ | **클라이언트**: `app/admin/hero/_hooks/useHeroSlides.ts` |
| `POST /api/admin/hero` | ❌ | ✅ | **클라이언트**: `app/admin/hero/_hooks/useHeroSlides.ts` |
| `PUT /api/admin/hero/[id]` | ❌ | ✅ | **클라이언트**: `app/admin/hero/_hooks/useHeroSlides.ts` |
| `DELETE /api/admin/hero/[id]` | ❌ | ✅ | **클라이언트**: `app/admin/hero/_hooks/useHeroSlides.ts` |

#### 관리자 카테고리 관리
| API 경로 | 서버 호출 | 클라이언트 호출 | 호출 위치 |
|---------|---------|---------------|----------|
| `GET /api/admin/categories` | ❌ | ✅ | **클라이언트**: `app/admin/category-products/_components/CategoryProductsClient.tsx` |
| `PUT /api/admin/categories/[id]` | ❌ | ✅ | **클라이언트**: `app/admin/category-products/_components/CategoryProductsClient.tsx` |
| `POST /api/admin/categories/[id]/products` | ❌ | ✅ | **클라이언트**: `app/admin/category-products/_components/CategoryProductSelectorModal.tsx` |
| `DELETE /api/admin/categories/[id]/products` | ❌ | ✅ | **클라이언트**: `app/admin/category-products/_components/CategoryProductsClient.tsx` |

#### 관리자 추천 관리
| API 경로 | 서버 호출 | 클라이언트 호출 | 호출 위치 |
|---------|---------|---------------|----------|
| `GET /api/admin/recommendations` | ❌ | ✅ | **클라이언트**: `app/admin/recommendations/_hooks/useAdminRecommendations.ts` |
| `POST /api/admin/recommendations` | ❌ | ✅ | **클라이언트**: `app/admin/recommendations/_hooks/useAdminRecommendations.ts` |
| `PUT /api/admin/recommendations/[id]` | ❌ | ✅ | **클라이언트**: `app/admin/recommendations/_hooks/useAdminRecommendations.ts` |
| `DELETE /api/admin/recommendations/[id]` | ❌ | ✅ | **클라이언트**: `app/admin/recommendations/_hooks/useAdminRecommendations.ts` |
| `POST /api/admin/recommendations/[id]/products` | ❌ | ✅ | **클라이언트**: `app/admin/recommendations/_hooks/useAdminRecommendations.ts` |
| `DELETE /api/admin/recommendations/[id]/products/[productId]` | ❌ | ✅ | **클라이언트**: `app/admin/recommendations/_hooks/useAdminRecommendations.ts` |

#### 관리자 선물 카테고리 관리
| API 경로 | 서버 호출 | 클라이언트 호출 | 호출 위치 |
|---------|---------|---------------|----------|
| `GET /api/admin/gift-categories` | ❌ | ✅ | **클라이언트**: `app/admin/gift-management/_utils/fetchers.ts` |
| `POST /api/admin/gift-categories` | ❌ | ✅ | **클라이언트**: `app/admin/gift-management/_utils/fetchers.ts` |
| `PUT /api/admin/gift-categories/[id]` | ❌ | ✅ | **클라이언트**: `app/admin/gift-management/_utils/fetchers.ts` |
| `DELETE /api/admin/gift-categories/[id]` | ❌ | ✅ | **클라이언트**: `app/admin/gift-management/_utils/fetchers.ts` |
| `POST /api/admin/gift-categories/[id]/products` | ❌ | ✅ | **클라이언트**: `app/admin/gift-management/_utils/fetchers.ts` |
| `DELETE /api/admin/gift-categories/[id]/products` | ❌ | ✅ | **클라이언트**: `app/admin/gift-management/_utils/fetchers.ts` |

#### 관리자 포인트 관리
| API 경로 | 서버 호출 | 클라이언트 호출 | 호출 위치 |
|---------|---------|---------------|----------|
| `GET /api/admin/points/list` | ❌ | ✅ | **클라이언트**: `app/admin/points/_hooks/useAdminPoints.ts` |
| `POST /api/admin/points/add` | ❌ | ✅ | **클라이언트**: `app/admin/points/_hooks/useAdminPoints.ts` |

#### 관리자 알림 관리
| API 경로 | 서버 호출 | 클라이언트 호출 | 호출 위치 |
|---------|---------|---------------|----------|
| `POST /api/admin/notifications/create` | ❌ | ✅ | **클라이언트**: `app/admin/notifications/_hooks/useNotifications.ts` |

#### 관리자 사용자 관리
| API 경로 | 서버 호출 | 클라이언트 호출 | 호출 위치 |
|---------|---------|---------------|----------|
| `GET /api/admin/users` | ❌ | ✅ | **클라이언트**: `app/admin/users/page.tsx` (예상) |

#### 관리자 이미지 업로드
| API 경로 | 서버 호출 | 클라이언트 호출 | 호출 위치 |
|---------|---------|---------------|----------|
| `POST /api/admin/upload-image` | ❌ | ✅ | **클라이언트**: `app/admin/products/_hooks/useProductImages.ts` |
| `POST /api/admin/upload-banner-image` | ❌ | ✅ | **클라이언트**: `app/admin/banners/_components/BannerFormModal.tsx` |

---

## 서비스 함수

### 클라이언트 전용 서비스 함수

| 서비스 함수 | 파일 경로 | 호출 위치 | API 호출 |
|-----------|----------|----------|---------|
| `fetchTimeDeal` | `lib/timedeal/timedeal.service.ts` | `lib/timedeal/useTimeDealPolling.ts` | `GET /api/timedeals` |
| `fetchProducts` | `lib/product/product.service.ts` | `lib/product/product.hooks.ts` | `GET /api/products` |
| `fetchBanners` | `lib/banner/banner.service.ts` | 사용되지 않음 (서버 컴포넌트에서 직접 호출) | `GET /api/banners` |
| `fetchGift` | `lib/gift/gift.service.ts` | `app/gift/[token]/page.tsx` | `GET /api/gift/[token]` |
| `uploadGiftCardImage` | `lib/gift/gift.service.ts` | `lib/gift/gift.service.ts` | `POST /api/gift/upload-card-image` |
| `fetchNotifications` | `lib/notification/notification.service.ts` | `components/NotificationBell.tsx` | `GET /api/notifications` |
| `markNotificationAsRead` | `lib/notification/notification.service.ts` | `components/NotificationBell.tsx` | `PUT /api/notifications` |
| `fetchOrders` | `lib/order/order.service.ts` | `app/orders/page.tsx` | `GET /api/orders` |
| `createOrder` | `lib/checkout/checkout.service.ts` | `app/checkout/page.tsx` | `POST /api/orders` |
| `createGiftPending` | `lib/checkout/checkout.service.ts` | `lib/checkout/checkout.service.ts` | `POST /api/gift/create-pending` |

### 서버 전용 서비스 함수

| 서비스 함수 | 파일 경로 | 호출 위치 | 설명 |
|-----------|----------|----------|------|
| `enrichProductsServer` | `lib/product/product.service.ts` | `app/api/timedeals/route.ts`, `app/api/products/route.ts` | 서버에서 상품 데이터 보강 (프로모션 정보 포함) |

---

## 호출 패턴

### 서버 컴포넌트에서의 API 호출

**특징:**
- `async function` 컴포넌트
- `'use client'` 지시어 없음
- 절대 URL 사용 (`process.env.NEXT_PUBLIC_SITE_URL`)
- Next.js 캐싱 옵션 사용 (`next: { tags, revalidate }`)

**예시:**
```typescript
// components/timedeal/TimeDealSection.tsx
export default async function TimeDealSection() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const res = await fetch(`${siteUrl}/api/timedeals?limit=${limit}`, {
    next: { tags: ['timedeal'] },
  })
  // ...
}
```

**서버 컴포넌트에서 호출하는 API:**
- `GET /api/timedeals` (TimeDealSection)
- `GET /api/collections` (Home page)
- `GET /api/banners` (BannerSection)
- `GET /api/categories` (Best/Sale/No9 pages)
- `GET /api/recommendations` (RecommendationSection)
- `GET /api/hero` (HeroSlider)
- `GET /api/gift/featured` (Gift pages)
- `GET /api/gift/target/[slug]` (Gift pages)
- `GET /api/gift/budget/[slug]` (Gift pages)

### 클라이언트 컴포넌트에서의 API 호출

**특징:**
- `'use client'` 지시어 있음
- 상대 URL 사용 (`/api/...`)
- `useEffect`, `useCallback` 등 React 훅 사용
- `cache: 'no-store'` 옵션 사용

**예시:**
```typescript
// lib/timedeal/timedeal.service.ts
export async function fetchTimeDeal() {
  const res = await fetch(`/api/timedeals?limit=${limit}`, {
    cache: 'no-store',
    signal,
  })
  // ...
}
```

**클라이언트 컴포넌트에서 호출하는 API:**
- 대부분의 사용자 관련 API (인증, 프로필, 주문, 장바구니, 찜목록 등)
- 모든 관리자 API
- 실시간 업데이트가 필요한 API (타임딜 폴링, 알림 등)

### 서비스 함수 패턴

**클라이언트 서비스 함수:**
- `lib/*/**.service.ts` 파일에 정의
- `fetch()` 사용하여 API 호출
- 클라이언트 컴포넌트나 훅에서 호출

**서버 서비스 함수:**
- `enrichProductsServer` 같은 데이터 보강 함수
- 직접 Supabase 호출 (API 라우트 거치지 않음)
- 서버 컴포넌트나 API 라우트에서만 사용

---

## 요약

### 서버에서만 호출되는 API
- 컬렉션, 배너, 카테고리, 추천, 히어로 슬라이더
- 선물 관련 일부 API (featured, target, budget)

### 클라이언트에서만 호출되는 API
- 모든 사용자 인증/프로필 API
- 모든 주문/장바구니/찜목록 API
- 모든 리뷰/쿠폰/포인트 API
- 모든 관리자 API
- 실시간 업데이트가 필요한 API

### 서버/클라이언트 모두 호출되는 API
- `GET /api/products` (서버: API route 내부 사용, 클라이언트: product.service.ts)
- `GET /api/timedeals` (서버: TimeDealSection, 클라이언트: useTimeDealPolling)

---

## ⚠️ 위험 포인트 및 주의사항

### 1. 같은 API를 서버 + 클라이언트에서 동시에 호출하는 케이스

#### 문제 상황
일부 API는 초기 진입 시 서버 컴포넌트와 클라이언트 컴포넌트에서 모두 호출되어 중복 요청이 발생합니다.

**대표적인 예:**
- `GET /api/timedeals`
  - **서버**: `TimeDealSection` (RSC) - 초기 렌더링 시 호출
  - **클라이언트**: `useTimeDealPolling` - hydration 후 폴링 시작
  - **결과**: 초기 진입 시 서버 1번 + 클라이언트 1번 = 총 2번 호출

#### 의도된 중복인가?
**네, 의도된 중복입니다.** 하지만 트래픽이 늘면 비용/부하로 체감될 수 있습니다.

**서버 호출의 목적:**
- ✅ SEO 최적화 (초기 HTML에 데이터 포함)
- ✅ 초기 로딩 성능 향상
- ✅ 서버 캐시 활용 (`next: { tags }`)

**클라이언트 호출의 목적:**
- ✅ 실시간 업데이트 (폴링)
- ✅ 타임딜 종료 감지
- ✅ 동적 상태 변경

#### 트레이드오프
- **장점**: SEO 최적화 + 실시간 업데이트
- **단점**: 초기 진입 시 중복 호출로 인한 비용/부하
- **현재 완화 조치**: 
  - `limit` 파라미터로 데이터 양 제한
  - 캐시 태그 사용으로 서버 캐시 활용

#### 개선 방안 (향후 고려)
1. **서버 데이터 전달 방식**: 서버에서 가져온 데이터를 클라이언트에 props로 전달하고, 클라이언트는 폴링만 수행
2. **클라이언트 전용 방식**: 클라이언트에서만 호출하고, SEO는 메타데이터로 처리
3. **스마트 캐싱**: 클라이언트에서 서버 응답 캐시 확인 후 필요시에만 재호출

### 2. `/api/products` 라우트의 역할 혼재

#### 문제 상황
문서상으로는 "서버 호출: 없음"으로 표시되어 있지만, 실제로는 서버 API route 내부에서 사용됩니다.

**실제 사용 현황:**
- ✅ 서버 API route (`app/api/timedeals/route.ts`, `app/api/products/route.ts`)에서 `enrichProductsServer` 사용
- ✅ SSR 페이지에서 간접적으로 의존
- ✅ 클라이언트에서도 직접 호출

#### 의미적 혼동
이 API는 사실상 **"공용 데이터 API"**인데, 문서에서는 클라이언트 전용처럼 보일 수 있습니다.

#### 명확화
- **서버 컴포넌트에서 직접 호출**: ❌ 없음
- **서버 API route 내부 사용**: ✅ 있음 (`enrichProductsServer`)
- **클라이언트에서 직접 호출**: ✅ 있음 (`fetchProducts`)

**결론**: 서버와 클라이언트 모두에서 사용되는 공용 API입니다.

### 3. 성능 최적화 고려사항

#### 중복 호출 최소화
- 초기 진입 시 중복 호출이 발생하는 API는 의도된 것인지 확인 필요
- 트래픽 증가 시 비용/부하 모니터링 필요

#### 캐싱 전략
- 서버: Next.js 캐시 태그 활용 (`next: { tags }`)
- 클라이언트: `cache: 'no-store'` 사용 (실시간 데이터 필요 시)

---

## 🔒 보안 고려사항

### 인증이 필요한 API의 클라이언트 호출

#### 현황
대부분의 인증이 필요한 API가 클라이언트에서 호출됩니다:
- `/api/orders` - 주문 조회/생성
- `/api/cart` - 장바구니 관리
- `/api/profile` - 사용자 프로필
- `/api/addresses` - 주소 관리
- `/api/coupons` - 쿠폰 조회/사용
- `/api/points` - 포인트 조회
- 모든 관리자 API

#### 보안 근거

**1. 인증 방식**
- ✅ **Supabase Auth** 사용
- ✅ **HttpOnly Cookie** 기반 세션 관리
- ✅ 클라이언트에 토큰 노출 없음

**2. CSRF 보호**
- ✅ SameSite Cookie 설정 (예상)
- ✅ 서버 사이드에서 세션 검증 수행

**3. API 보안**
- ✅ 모든 API route에서 서버 사이드 인증 검증 수행
- ✅ `assertAdmin()` 함수로 관리자 권한 확인
- ✅ RLS (Row Level Security) 정책으로 데이터 접근 제어

**4. 토큰 관리**
- ✅ 클라이언트에 민감한 토큰 저장하지 않음
- ✅ HttpOnly Cookie로 XSS 공격 방지
- ✅ 서버에서만 세션 검증

#### 현재 안전한 이유
1. **Supabase Auth**: 검증된 인증 시스템 사용
2. **HttpOnly Cookie**: JavaScript로 접근 불가능한 쿠키 사용
3. **서버 사이드 검증**: 모든 API route에서 인증 확인
4. **RLS 정책**: 데이터베이스 레벨에서 접근 제어

#### 추가 고려사항

**향후 개선 가능한 부분:**
1. **민감한 데이터**: 주문 내역, 프로필 정보 등은 서버 컴포넌트에서 가져오는 것도 고려
2. **보안 헤더**: CORS, CSP 등 추가 보안 헤더 설정 확인
3. **Rate Limiting**: API 남용 방지를 위한 요청 제한 고려

**현재 상태:**
- ✅ 보안적으로 안전한 구조
- ✅ Supabase + HttpOnly Cookie 조합으로 충분한 보안 수준
- ⚠️ 다만 문서화가 부족했음 (이 문서로 보완)

---

**마지막 업데이트:** 2024년
**작성자:** AI Assistant

