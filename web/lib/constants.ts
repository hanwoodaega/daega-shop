// 공통 상수 정의

export const CATEGORIES = ['전체', '한우', '돼지고기', '수입육', '닭', '가공육', '조리육', '야채']

// 메인 메뉴 (첫 번째 줄)
export const MAIN_MENU_LINKS = [
  { name: '홈', href: '/' },
  { name: '신상품', href: '/products?filter=new' },
  { name: '베스트', href: '/products?filter=best' },
  { name: '전단행사', href: '/products?filter=sale' },
  { name: '알뜰상품', href: '/products?filter=budget' },
]

// 카테고리 메뉴 (두 번째 줄)
export const CATEGORY_LINKS = [
  { name: '전체', href: '/products' },
  { name: '한우', href: '/products?category=한우' },
  { name: '돼지고기', href: '/products?category=돼지고기' },
  { name: '수입육', href: '/products?category=수입육' },
  { name: '닭', href: '/products?category=닭' },
  { name: '가공육', href: '/products?category=가공육' },
  { name: '조리육', href: '/products?category=조리육' },
  { name: '야채', href: '/products?category=야채' },
]

