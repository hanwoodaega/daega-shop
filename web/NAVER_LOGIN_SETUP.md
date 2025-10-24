# 네이버 로그인 설정 가이드

## 1. 네이버 개발자 센터 설정

### 1-1. 애플리케이션 등록

1. **네이버 개발자 센터** 접속
   - https://developers.naver.com

2. **로그인** (네이버 계정)

3. **Application → 애플리케이션 등록** 클릭

4. **애플리케이션 정보 입력**
   - **애플리케이션 이름**: 대가 정육백화점
   - **사용 API**: ✅ 네이버 로그인 선택
   - **비로그인 오픈API**: 체크 안 함

### 1-2. 서비스 환경 설정

1. **로그인 오픈 API 서비스 환경**
   - ✅ **PC 웹** 체크

2. **서비스 URL** 입력
   - 개발: `http://localhost:3000`
   - 프로덕션: `https://your-domain.com`

3. **Callback URL** 입력
   - 개발: `http://localhost:3000/auth/naver/callback`
   - 프로덕션: `https://your-domain.com/auth/naver/callback`

### 1-3. 제공 정보 선택

**회원 이름, 이메일 주소, 프로필 사진** 모두 선택
- ✅ 회원이름
- ✅ 이메일 주소  
- ✅ 프로필 사진

### 1-4. 등록하기

**등록하기** 버튼 클릭하면 완료!

## 2. Client ID & Secret 복사

1. **등록한 애플리케이션 클릭**

2. **API 설정** 탭에서:
   - **Client ID** 복사 📋
   - **Client Secret** 복사 📋

예시:
```
Client ID: abc123def456
Client Secret: XyZ789
```

## 3. 환경 변수 설정

`web/.env.local` 파일 열기 (없으면 생성)

```env
# 기존 Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# 네이버 로그인 추가
NEXT_PUBLIC_NAVER_CLIENT_ID=abc123def456
NAVER_CLIENT_SECRET=XyZ789
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**주의:**
- `NEXT_PUBLIC_NAVER_CLIENT_ID`: 클라이언트에서 사용
- `NAVER_CLIENT_SECRET`: 서버에서만 사용 (공개하면 안 됨!)

## 4. 개발 서버 재시작

환경 변수를 추가했으므로 서버 재시작:

```bash
# 서버 중지 (Ctrl + C)
npm run dev
```

## 5. 테스트

1. **로그인 페이지 접속**
   ```
   http://localhost:3000/auth/login
   ```

2. **"네이버로 시작하기"** 버튼 클릭

3. 네이버 로그인 페이지로 이동

4. 네이버 계정으로 로그인

5. 동의 화면에서 **동의하기** 클릭

6. 사이트로 돌아오면 로그인 완료! ✨

## 6. 프로덕션 배포 시

### Vercel 배포 시

1. **Vercel Dashboard** → 프로젝트 → Settings → Environment Variables

2. **환경 변수 추가:**
   ```
   NEXT_PUBLIC_NAVER_CLIENT_ID=your_client_id
   NAVER_CLIENT_SECRET=your_client_secret
   NEXT_PUBLIC_SITE_URL=https://your-domain.com
   ```

3. **네이버 개발자 센터에서 Callback URL 추가:**
   ```
   https://your-domain.com/auth/naver/callback
   ```

4. **재배포**

## 7. 작동 방식

1. 사용자가 "네이버로 시작하기" 클릭
2. 네이버 로그인 페이지로 리다이렉트
3. 사용자가 네이버 계정으로 로그인
4. 네이버가 Authorization Code 발급
5. `/auth/naver/callback`으로 리다이렉트
6. 서버에서 Code를 Access Token으로 교환
7. Access Token으로 사용자 정보 조회
8. Supabase에 사용자 생성 (첫 로그인) 또는 로그인
9. 홈페이지로 리다이렉트

## 8. 문제 해결

### "Client ID가 유효하지 않습니다"
- `.env.local` 파일의 Client ID 확인
- 네이버 개발자 센터에서 다시 복사

### "Callback URL이 일치하지 않습니다"
- 네이버에 등록한 Callback URL 확인
- 정확히 `http://localhost:3000/auth/naver/callback` 인지 확인

### 환경 변수가 적용되지 않음
- 개발 서버 재시작 (Ctrl+C 후 `npm run dev`)
- 브라우저 캐시 삭제

### 이메일 정보를 받아오지 못함
- 네이버 개발자 센터 → 애플리케이션 → API 설정
- "제공 정보" 섹션에서 "이메일 주소" 체크 확인

## 9. 보안 주의사항

⚠️ **절대로 GitHub에 업로드하면 안 되는 것:**
- `NAVER_CLIENT_SECRET`
- `.env.local` 파일

✅ **`.gitignore`에 추가:**
```
.env.local
.env*.local
```

## 10. 참고 자료

- [네이버 로그인 API 문서](https://developers.naver.com/docs/login/api/)
- [네이버 로그인 개발 가이드](https://developers.naver.com/docs/login/devguide/)

