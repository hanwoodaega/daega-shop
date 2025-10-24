# Supabase 인증 설정 가이드

## 1. 기본 설정

### Supabase Dashboard에서 설정

1. **Supabase Dashboard** 접속 (https://supabase.com)
2. 프로젝트 선택
3. 왼쪽 사이드바에서 **Authentication** 클릭

## 2. 이메일 인증 설정

1. **Settings** → **Auth** 이동
2. **Email Auth** 섹션에서 설정:
   - ✅ Enable Email Signup
   - ✅ Confirm Email (이메일 확인 필요 시)
   - Email Templates 커스터마이징 가능

## 3. 카카오 로그인 설정

### 3-1. 카카오 개발자 콘솔 설정

1. **카카오 개발자 콘솔** 접속 (https://developers.kakao.com)
2. **내 애플리케이션** → **애플리케이션 추가하기**
3. 앱 이름 입력 후 생성
4. **앱 설정** → **요약 정보**에서:
   - `REST API 키` 복사 (Client ID로 사용)
5. **제품 설정** → **카카오 로그인** 활성화
6. **Redirect URI** 설정:
   ```
   https://[YOUR_SUPABASE_PROJECT_REF].supabase.co/auth/v1/callback
   ```
7. **동의 항목** 설정:
   - 프로필 정보 (필수)
   - 카카오계정(이메일) (필수)

### 3-2. Supabase에 카카오 연동

1. Supabase Dashboard → **Authentication** → **Providers**
2. **Kakao** 찾아서 클릭
3. 설정:
   - ✅ Enable Sign in with Kakao
   - **Client ID**: 카카오의 `REST API 키` 입력
   - **Client Secret**: (카카오는 필요 없음, 비워두기)
   - **Redirect URL**: 자동 생성됨
4. **Save** 클릭

## 4. Google 로그인 설정

### 4-1. Google Cloud Console 설정

1. **Google Cloud Console** 접속 (https://console.cloud.google.com)
2. 프로젝트 생성 또는 선택
3. **API 및 서비스** → **OAuth 동의 화면** 설정
4. **사용자 인증 정보** → **사용자 인증 정보 만들기** → **OAuth 클라이언트 ID**
5. 애플리케이션 유형: **웹 애플리케이션**
6. **승인된 리디렉션 URI** 추가:
   ```
   https://[YOUR_SUPABASE_PROJECT_REF].supabase.co/auth/v1/callback
   ```
7. **Client ID**와 **Client Secret** 복사

### 4-2. Supabase에 Google 연동

1. Supabase Dashboard → **Authentication** → **Providers**
2. **Google** 클릭
3. 설정:
   - ✅ Enable Sign in with Google
   - **Client ID**: Google의 Client ID 입력
   - **Client Secret**: Google의 Client Secret 입력
4. **Save** 클릭

## 5. 네이버 로그인 설정 (선택사항)

### 5-1. 네이버 개발자 센터 설정

1. **네이버 개발자 센터** 접속 (https://developers.naver.com)
2. **Application** → **애플리케이션 등록**
3. 사용 API: **네이버 로그인** 선택
4. **로그인 오픈 API 서비스 환경** → **PC 웹** 추가
5. **서비스 URL**: 웹사이트 URL 입력
6. **Callback URL** 설정:
   ```
   https://[YOUR_SUPABASE_PROJECT_REF].supabase.co/auth/v1/callback
   ```
7. **Client ID**와 **Client Secret** 복사

### 5-2. Custom OAuth Provider로 추가

네이버는 Supabase에서 기본 제공하지 않으므로, 추가 설정이 필요합니다.
현재 코드에서는 Google과 Kakao만 지원합니다.

## 6. 환경 변수 확인

`.env.local` 파일이 올바른지 확인:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

## 7. 테스트

### 로컬 개발 환경

1. 개발 서버 실행:
   ```bash
   npm run dev
   ```

2. 테스트 순서:
   - `/auth/signup` → 이메일 회원가입
   - `/auth/login` → 이메일 로그인
   - 카카오 로그인 버튼 클릭
   - Google 로그인 버튼 클릭

### 프로덕션 배포 시

Redirect URI를 프로덕션 도메인으로 업데이트:
```
https://your-domain.com/auth/callback
```

## 8. 보안 권장사항

1. **Row Level Security (RLS)** 활성화
2. **Email Rate Limiting** 설정
3. **강력한 비밀번호 정책** 설정
4. **JWT 만료 시간** 설정

## 9. 문제 해결

### 카카오 로그인이 안 될 때
- Redirect URI가 정확한지 확인
- 카카오 앱이 활성화되었는지 확인
- 동의 항목이 설정되었는지 확인

### Google 로그인이 안 될 때
- OAuth 동의 화면이 완료되었는지 확인
- 승인된 리디렉션 URI가 정확한지 확인

### 이메일이 전송되지 않을 때
- Supabase 무료 플랜: 시간당 제한 있음
- Settings → Auth → SMTP 설정 (선택사항)

## 10. 참고 자료

- [Supabase Auth 문서](https://supabase.com/docs/guides/auth)
- [카카오 로그인 가이드](https://developers.kakao.com/docs/latest/ko/kakaologin/common)
- [Google OAuth 가이드](https://developers.google.com/identity/protocols/oauth2)

