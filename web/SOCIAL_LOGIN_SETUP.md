# 소셜 로그인 설정 가이드

## 📋 개요

현재 구현된 소셜 로그인:
- ✅ **네이버 로그인** - 커스텀 OAuth (이미 구현됨)
- ⚙️ **카카오 로그인** - Supabase OAuth (설정 필요, 선택사항)

## 🎯 추천 옵션

### 권장사항:
1. **네이버만 사용** - 이미 구현되어 있고 한국 사용자에게 친숙 ✅
2. **네이버 + 카카오** - 한국에서 가장 많이 사용되는 조합

## 🔧 설정 방법

---

## 1️⃣ 네이버 로그인 (이미 구현됨 ✅)

### 환경 변수 설정
`.env.local` 파일에 추가:
```env
NEXT_PUBLIC_NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_client_secret
```

### 상세 가이드
`NAVER_LOGIN_SETUP.md` 파일 참고

---

## 2️⃣ 카카오 로그인 설정

### A. 카카오 개발자 콘솔 설정

1. **Kakao Developers 접속**
   - https://developers.kakao.com 접속
   - 로그인 후 "내 애플리케이션" 클릭

2. **애플리케이션 추가**
   - "애플리케이션 추가하기" 클릭
   - 앱 이름: "대가 정육백화점"
   - 회사명: 회사명 입력

3. **플랫폼 설정**
   - 앱 설정 > 플랫폼 > Web 플랫폼 등록
   - 사이트 도메인: `http://localhost:3000` (개발), `https://yourdomain.com` (프로덕션)

4. **Redirect URI 설정**
   - 제품 설정 > 카카오 로그인 활성화
   - Redirect URI 등록:
     ```
     개발: https://your-project.supabase.co/auth/v1/callback
     ```
   - ⚠️ Supabase Project URL 확인 방법:
     - Supabase Dashboard > Settings > API
     - Project URL 복사

5. **동의항목 설정**
   - 제품 설정 > 카카오 로그인 > 동의항목
   - 필수 동의:
     - ✅ 닉네임 (필수)
     - ✅ 프로필 사진 (선택)
     - ✅ 카카오계정(이메일) (필수)
     - ✅ 전화번호 (선택) ← **추가! 자동으로 전화번호 저장**
   
   **중요:** 전화번호를 동의항목에 추가하면 사용자가 카카오로 로그인할 때 자동으로 전화번호가 저장됩니다!

6. **REST API 키 복사**
   - 앱 설정 > 요약 정보
   - REST API 키 복사

### B. Supabase 설정

1. **Supabase Dashboard 접속**
   - https://supabase.com
   - 프로젝트 선택

2. **OAuth 설정**
   - Authentication > Providers > Kakao
   - Enable Kakao 체크
   - Client ID: 카카오 REST API 키 입력
   - Client Secret: (카카오는 불필요)
   - Redirect URL 확인: `https://your-project.supabase.co/auth/v1/callback`

3. **저장**

### C. 환경 변수 (필요 없음)
카카오는 Supabase OAuth를 사용하므로 별도 환경 변수 불필요

---

## 3️⃣ 사용하지 않는 로그인 숨기기

특정 소셜 로그인을 사용하지 않으려면 코드에서 제거하세요.

### 버튼 숨기기

`web/app/auth/login/page.tsx` 파일 수정:

#### 네이버만 사용하려면:
```tsx
{/* 소셜 로그인 */}
<div className="space-y-3 mb-6">
  <button
    onClick={() => handleSocialLogin('naver')}
    className="w-full bg-[#03C75A] text-white py-3 rounded-lg font-semibold hover:bg-[#02B350] transition flex items-center justify-center space-x-2"
  >
    <span>네이버로 시작하기</span>
  </button>
</div>
```

#### 카카오 + 네이버 사용하려면:
```tsx
{/* 소셜 로그인 */}
<div className="space-y-3 mb-6">
  <button
    onClick={() => handleSocialLogin('kakao')}
    className="w-full bg-[#FEE500] text-[#000000] py-3 rounded-lg font-semibold hover:bg-[#FDD835] transition flex items-center justify-center space-x-2"
  >
    <span>카카오로 시작하기</span>
  </button>
  
  <button
    onClick={() => handleSocialLogin('naver')}
    className="w-full bg-[#03C75A] text-white py-3 rounded-lg font-semibold hover:bg-[#02B350] transition flex items-center justify-center space-x-2"
  >
    <span>네이버로 시작하기</span>
  </button>
</div>
```

**참고**: 카카오 로그인을 활성화하려면 위 "2️⃣ 카카오 로그인 설정" 섹션을 먼저 완료하세요.

---

## 🧪 테스트 방법

### 1. 네이버 로그인
1. 로그인 페이지에서 "네이버로 시작하기" 클릭
2. 네이버 로그인 페이지로 이동
3. 로그인 후 자동으로 홈페이지로 리다이렉트
4. Supabase Dashboard > Authentication > Users에서 확인

### 2. 카카오 로그인 (설정한 경우)
1. 로그인 페이지에서 "카카오로 시작하기" 클릭
2. 카카오 로그인 페이지로 이동
3. 동의하고 계속하기
4. 자동으로 홈페이지로 리다이렉트

---

## 🔍 문제 해결

### 네이버 로그인이 안 됨
- ✅ 환경 변수 확인 (`.env.local`)
- ✅ 콜백 URL이 정확한지 확인: `http://localhost:3000/auth/naver/callback`
- ✅ `NAVER_LOGIN_SETUP.md` 참고

### 카카오 로그인이 안 됨 (설정한 경우)
- ✅ Redirect URI가 정확한지 확인 (Supabase Project URL)
- ✅ 카카오 앱이 "활성화" 상태인지 확인
- ✅ 이메일 동의항목이 "필수"로 설정되어 있는지 확인

---

## 📊 현재 설정 상태

### 현재 활성화된 로그인 (권장 설정)
```
✅ 카카오 로그인 (Supabase 설정 필요)
✅ 네이버 로그인 (환경 변수 설정 필요)
✅ 이메일/비밀번호 로그인 (즉시 사용 가능)
```

**한국에서 가장 많이 사용되는 조합입니다!** 👍

---

## 🎯 빠른 시작 가이드

### ✅ 현재 상태
로그인 페이지에 **카카오**와 **네이버** 버튼이 모두 활성화되어 있습니다.

### 🚀 설정 단계

#### 1단계: 네이버 로그인 설정 (필수)
1. **환경 변수 설정** (`.env.local`)
   ```env
   NEXT_PUBLIC_NAVER_CLIENT_ID=your_naver_client_id
   NAVER_CLIENT_SECRET=your_naver_client_secret
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```
2. 자세한 내용: `NAVER_LOGIN_SETUP.md` 참고
3. ✅ 네이버 로그인 즉시 사용 가능!

#### 2단계: 카카오 로그인 설정 (선택)
1. 위 "2️⃣ 카카오 로그인 설정" 섹션 참고
2. Supabase Dashboard에서 설정
3. ✅ 카카오 로그인 사용 가능!

#### 3단계: 테스트
- 이메일/비밀번호 로그인은 별도 설정 없이 바로 사용 가능합니다 ✅

---

## 💡 참고

- **이메일/비밀번호 로그인**: 별도 설정 없이 바로 사용 가능
- **Supabase Project URL**: `https://xxxxx.supabase.co` 형태
- **개발/프로덕션 환경**: Redirect URI를 각각 등록해야 함

더 도움이 필요하면 알려주세요! 🚀

