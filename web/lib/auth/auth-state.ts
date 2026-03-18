export type AuthState =
  | 'LOGGED_OUT'
  | 'SESSION_DETECTED'
  | 'ONBOARDING_REQUIRED'
  | 'PHONE_VERIFICATION_REQUIRED'
  | 'DELETED_RESTORE_REQUIRED'
  | 'ACTIVE'

export type AuthStatus = 'active' | 'pending' | 'deleted' | string

export function deriveAuthState(input: {
  authenticated: boolean
  status: AuthStatus | null | undefined
  requiresPhoneVerification: boolean
  nameMissing?: boolean
}): AuthState {
  if (!input.authenticated) return 'LOGGED_OUT'

  const status = (input.status ?? 'pending') as AuthStatus
  if (status === 'deleted') return 'DELETED_RESTORE_REQUIRED'
  if (input.requiresPhoneVerification) return 'PHONE_VERIFICATION_REQUIRED'
  if (status !== 'active') return 'ONBOARDING_REQUIRED'
  return 'ACTIVE'
}

export function sanitizeNextPath(nextPath: string | null | undefined): string {
  const raw = typeof nextPath === 'string' ? nextPath.trim() : ''
  if (!raw) return '/'
  // allow only same-origin relative paths
  if (!raw.startsWith('/')) return '/'
  // avoid redirect loops back into auth pages (except restore/verify/onboarding which are driven by state)
  if (raw.startsWith('/auth/login') || raw.startsWith('/auth/signup')) return '/'
  if (raw.startsWith('/api/')) return '/'
  return raw
}

export function getPostAuthRedirect(input: { state: AuthState; nextPath?: string | null }): string {
  const safeNext = sanitizeNextPath(input.nextPath)
  switch (input.state) {
    case 'LOGGED_OUT':
      return `/auth/login?next=${encodeURIComponent(safeNext)}`
    case 'DELETED_RESTORE_REQUIRED':
      return `/auth/restore?next=${encodeURIComponent(safeNext)}`
    case 'PHONE_VERIFICATION_REQUIRED':
      return `/auth/verify-phone?next=${encodeURIComponent(safeNext)}`
    case 'ONBOARDING_REQUIRED':
      return `/auth/onboarding?next=${encodeURIComponent(safeNext)}`
    case 'SESSION_DETECTED':
      // not used as final state yet; keep behavior sane
      return safeNext
    case 'ACTIVE':
      return safeNext
    default:
      return safeNext
  }
}

