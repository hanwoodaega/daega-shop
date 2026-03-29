import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/supabase-server'
import { ensureAdminApi } from '@/lib/auth/admin-auth'
import { getCouponExpiresAtEndOfDayKST } from '@/lib/coupon/expires'
import { unknownErrorResponse } from '@/lib/api/api-errors'
import { parseJsonBody } from '@/lib/api/parse-json'
import { adminCouponBulkIssueSchema } from '@/lib/validation/schemas/admin-coupon'

/**
 * 쿠폰 일괄 지급 API
 * POST /api/admin/coupons/issue
 * 
 * 조건:
 * - conditions.phone: 특정 개인 지급용 전화번호 (하이픈 없이 숫자만)
 * - conditions.birthday_month: 이번 달 생일인 사용자 (1-12)
 * - conditions.min_purchase_amount: 최소 구매 금액
 * - conditions.purchase_period_start: 구매 기간 시작 (ISO string)
 * - conditions.purchase_period_end: 구매 기간 종료 (ISO string)
 * - conditions.min_purchase_count: 최소 구매 횟수
 */
export async function POST(request: NextRequest) {
  const unauthorized = await ensureAdminApi()
  if (unauthorized) return unauthorized

  try {
    const supabase = createSupabaseAdminClient()
    const parsed = await parseJsonBody(request, adminCouponBulkIssueSchema)
    if (!parsed.ok) return parsed.response

    const { coupon_id, conditions } = parsed.data

    // 쿠폰 정보 확인
    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .select('*')
      .eq('id', coupon_id)
      .single()

    if (couponError || !coupon) {
      return NextResponse.json({ error: '쿠폰을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (!coupon.is_active) {
      return NextResponse.json({ error: '비활성 쿠폰은 지급할 수 없습니다.' }, { status: 400 })
    }

    // 모든 사용자 조회 (페이지네이션 처리)
    let allUsers: any[] = []
    let page = 1
    const perPage = 1000
    let hasMore = true

    while (hasMore) {
      const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({
        page,
        perPage,
      })
      
      if (usersError) {
        return NextResponse.json({ error: '사용자 목록을 불러올 수 없습니다.' }, { status: 500 })
      }

      if (usersData && usersData.users) {
        allUsers = [...allUsers, ...usersData.users]
        hasMore = usersData.users.length === perPage
        page++
      } else {
        hasMore = false
      }
    }

    if (allUsers.length === 0) {
      return NextResponse.json({ error: '지급할 사용자가 없습니다.' }, { status: 400 })
    }

    // 조건에 맞는 사용자 필터링
    let targetUsers = allUsers

    if (conditions) {
      targetUsers = await filterUsersByConditions(supabase, allUsers, conditions)
    }

    if (targetUsers.length === 0) {
      return NextResponse.json({ 
        error: '조건에 맞는 사용자가 없습니다.',
        stats: { total: allUsers.length, filtered: 0 }
      }, { status: 400 })
    }

    // 배치 단위로 쿠폰 지급 (성능 최적화)
    // 사용자 수에 따라 동적으로 배치 크기 조정
    const totalUsers = targetUsers.length
    const BATCH_SIZE = totalUsers <= 1000 
      ? totalUsers  // 1000명 이하면 한 번에 처리
      : totalUsers <= 5000 
        ? 2000      // 5000명 이하면 2000명씩
        : 5000      // 그 이상은 5000명씩
    
    let successCount = 0
    const issuedUserIds: string[] = []

    const expiresAtISO = getCouponExpiresAtEndOfDayKST(coupon.validity_days)

    for (let i = 0; i < targetUsers.length; i += BATCH_SIZE) {
      const batch = targetUsers.slice(i, i + BATCH_SIZE)
      const userCouponsToInsert = batch.map(user => ({
        user_id: user.id,
        coupon_id: coupon_id,
        is_used: false,
        expires_at: expiresAtISO,
      }))

      const { data: insertedData, error: insertError } = await supabase
        .from('user_coupons')
        .insert(userCouponsToInsert)
        .select('user_id')

      if (insertError) {
        console.error(`배치 ${Math.floor(i / BATCH_SIZE) + 1} 처리 실패:`, insertError)
        continue
      }
      if (insertedData) {
        const insertedIds = insertedData.map((uc: any) => uc.user_id)
        issuedUserIds.push(...insertedIds)
        successCount += insertedIds.length
      }
    }

    // 실제로 쿠폰이 발급된 사용자에게 알림 생성
    if (issuedUserIds.length > 0) {
      // 제목: 쿠폰명
      const notificationTitle = coupon.name
      
      // 내용: 쿠폰 설명 + 쿠폰함 가기 링크
      const couponDescription = coupon.description || ''
      const validityInfo = `${coupon.validity_days}일 이내 사용 가능합니다.`
      const notificationContent = `${couponDescription ? couponDescription + ' ' : ''}${validityInfo} 쿠폰함 가기`
      
      // 배치 단위로 알림 생성 (성능 최적화)
      const NOTIFICATION_BATCH_SIZE = 1000
      for (let i = 0; i < issuedUserIds.length; i += NOTIFICATION_BATCH_SIZE) {
        const notificationBatch = issuedUserIds.slice(i, i + NOTIFICATION_BATCH_SIZE)
        const notifications = notificationBatch.map((userId: string) => ({
          user_id: userId,
          title: notificationTitle,
          content: notificationContent,
          type: 'general',
          is_read: false,
        }))

        const { error: notificationError } = await supabase
          .from('notifications')
          .insert(notifications)

        if (notificationError) {
          console.error(`알림 생성 실패 (배치 ${Math.floor(i / NOTIFICATION_BATCH_SIZE) + 1}):`, notificationError)
          // 알림 생성 실패해도 쿠폰 발급은 성공으로 처리
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: conditions
        ? `조건에 맞는 ${targetUsers.length}명 중 ${successCount}명에게 쿠폰이 지급되었습니다.`
        : `총 ${allUsers.length}명 중 ${successCount}명에게 쿠폰이 지급되었습니다.`,
      stats: {
        total: allUsers.length,
        filtered: targetUsers.length,
        issued: successCount,
      },
    })
  } catch (error: unknown) {
    return unknownErrorResponse('admin/coupons/issue', error)
  }
}

/** 전화번호로 특정 개인만 필터링 */
async function filterUsersByConditions(
  supabase: any,
  users: any[],
  conditions: { phone?: string }
): Promise<any[]> {
  if (!conditions.phone) return users

  const phoneNumber = conditions.phone.replace(/[^0-9]/g, '')
  const { data: usersWithPhone } = await supabase
    .from('users')
    .select('id, phone')
    .not('phone', 'is', null)

  if (!usersWithPhone?.length) {
    return []
  }

  const phoneUserIds = usersWithPhone
    .filter((u: any) => u.phone && u.phone.replace(/[^0-9]/g, '') === phoneNumber)
    .map((u: any) => u.id)

  return users.filter(u => phoneUserIds.includes(u.id))
}

