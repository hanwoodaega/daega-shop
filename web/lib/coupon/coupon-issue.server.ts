import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { normalizePhone } from '@/lib/auth/otp-utils'

const PHONE_COUPON_CAMPAIGN_ID = 'phone_verification'

export async function issuePhoneVerificationCoupon(params: {
  userId: string
  phone: string
  campaignId?: string
}) {
  const { userId, phone, campaignId = PHONE_COUPON_CAMPAIGN_ID } = params
  const normalizedPhone = normalizePhone(phone)
  if (!normalizedPhone) {
    return { issued: false, reason: 'invalid_phone' as const }
  }

  const supabaseAdmin = createSupabaseAdminClient()

  const { data: coupon } = await supabaseAdmin
    .from('coupons')
    .select('id, validity_days')
    .eq('issue_trigger', 'PHONE_VERIFIED')
    .eq('is_active', true)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!coupon?.id || !coupon.validity_days || coupon.validity_days <= 0) {
    return { issued: false, reason: 'no_coupon' as const }
  }

  const { error: claimError } = await supabaseAdmin
    .from('coupon_claims')
    .insert({
      campaign_id: campaignId,
      user_id: userId,
      phone: normalizedPhone,
    })

  if (claimError) {
    if (claimError.code === '23505') {
      return { issued: false, reason: 'already_claimed' as const }
    }
    throw claimError
  }

  const now = new Date()
  const expiresAt = new Date(now)
  expiresAt.setDate(expiresAt.getDate() + coupon.validity_days)

  const { error: issueError } = await supabaseAdmin
    .from('user_coupons')
    .insert({
      user_id: userId,
      coupon_id: coupon.id,
      is_used: false,
      expires_at: expiresAt.toISOString(),
    })

  if (issueError) {
    if (issueError.code === '23505') {
      return { issued: false, reason: 'already_issued' as const }
    }
    throw issueError
  }

  return { issued: true, reason: 'issued' as const }
}
