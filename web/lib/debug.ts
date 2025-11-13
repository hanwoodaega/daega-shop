// 디버깅 유틸리티
// 개발 환경에서만 로그 출력

const isDev = process.env.NODE_ENV === 'development'

export const debugLog = {
  log: (...args: any[]) => {
    if (isDev) console.log(...args)
  },
  error: (...args: any[]) => {
    if (isDev) console.error(...args)
  },
  warn: (...args: any[]) => {
    if (isDev) console.warn(...args)
  }
}

