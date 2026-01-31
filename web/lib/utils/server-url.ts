import { headers } from 'next/headers'
import { PHASE_PRODUCTION_BUILD } from 'next/constants'

export function getServerBaseUrl() {
  if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) {
    return null
  }

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  const hdrs = headers()
  const host = hdrs.get('x-forwarded-host') || hdrs.get('host')
  if (!host) {
    return null
  }

  const proto = hdrs.get('x-forwarded-proto') || 'http'
  return `${proto}://${host}`
}
