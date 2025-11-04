# 서버 완전히 재시작하기

## 문제
코드를 수정했는데도 여전히 이전 에러가 발생할 때

## 해결 방법

### 1. 서버 중단
터미널에서 **Ctrl+C** 를 **두 번** 눌러서 완전히 중단

### 2. .next 캐시 삭제
```bash
cd web
rm -rf .next
```

Windows PowerShell에서는:
```powershell
cd web
Remove-Item -Recurse -Force .next
```

### 3. 서버 재시작
```bash
npm run dev
```

### 4. 브라우저 캐시 삭제
- **Ctrl+Shift+Delete** 눌러서 캐시 삭제
- 또는 **Ctrl+F5** (강력 새로고침)

### 5. 다시 시도
1. `http://localhost:3000/admin/login` 접속
2. 비밀번호: `admin123`
3. 주문 관리 클릭

