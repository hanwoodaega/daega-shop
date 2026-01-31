import crypto from 'crypto'

const OTP_SECRET = process.env.OTP_SECRET || 'dev-otp-secret'
const USERNAME_DOMAIN = process.env.AUTH_USERNAME_DOMAIN || 'thedaega.local'

export function normalizePhone(phone: string) {
  return phone.replace(/[^0-9]/g, '')
}

export function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export function hashOtp(phone: string, code: string) {
  return crypto
    .createHmac('sha256', OTP_SECRET)
    .update(`${phone}:${code}`)
    .digest('hex')
}

export function generateToken() {
  return crypto.randomBytes(32).toString('hex')
}

export function hashToken(token: string) {
  return crypto
    .createHmac('sha256', OTP_SECRET)
    .update(token)
    .digest('hex')
}

export function maskUsername(username: string) {
  if (!username) return ''
  if (username.length <= 3) {
    return `${username[0]}**`
  }
  return `${username.slice(0, 3)}***`
}

export function usernameToEmail(username: string) {
  return `${username}@${USERNAME_DOMAIN}`
}

