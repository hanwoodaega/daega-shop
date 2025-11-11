// 환경 변수 검증 및 타입 안전성

export const env = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  admin: {
    password: process.env.ADMIN_PASSWORD || '',
  },
} as const

export function validateEnv() {
  const errors: string[] = []
  
  if (!env.supabase.url) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL is required')
  }
  if (!env.supabase.anonKey) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is required')
  }
  
  if (errors.length > 0) {
    console.error('❌ Environment validation failed:')
    errors.forEach(err => console.error(`  - ${err}`))
    return false
  }
  
  return true
}

export const isEnvConfigured = Boolean(env.supabase.url && env.supabase.anonKey)



