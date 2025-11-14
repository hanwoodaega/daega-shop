import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { assertAdmin } from '@/lib/admin-auth'

/**
 * 쿠폰 일괄 지급 API
 * POST /api/admin/coupons/issue
 * 
 * 조건:
 * - conditions.birthday_month: 이번 달 생일인 사용자 (1-12)
 * - conditions.min_purchase_amount: 최소 구매 금액
 * - conditions.purchase_period_start: 구매 기간 시작 (ISO string)
 * - conditions.purchase_period_end: 구매 기간 종료 (ISO string)
 * - conditions.min_purchase_count: 최소 구매 횟수
 */
export async function POST(request: NextRequest) {
  try {
    assertAdmin()
    
    const supabase = createSupabaseAdminClient()
    const body = await request.json()
    const { coupon_id, conditions } = body

    if (!coupon_id) {
      return NextResponse.json({ error: '쿠폰 ID가 필요합니다.' }, { status: 400 })
    }

    // 쿠폰 정보 확인
    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .select('*')
      .eq('id', coupon_id)
      .single()

    if (couponError || !coupon) {
      return NextResponse.json({ error: '쿠폰을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 유효기간 체크
    const now = new Date().toISOString()
    if (!coupon.is_active || coupon.valid_from > now || coupon.valid_until < now) {
      return NextResponse.json({ error: '유효하지 않은 쿠폰입니다.' }, { status: 400 })
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
    let skipCount = 0

    // 배치 단위로 나누어 처리
    for (let i = 0; i < targetUsers.length; i += BATCH_SIZE) {
      const batch = targetUsers.slice(i, i + BATCH_SIZE)
      const userIds = batch.map(user => user.id)

      try {
        // PostgreSQL RPC 함수 사용 (ON CONFLICT DO NOTHING)
        const { data, error } = await supabase.rpc('batch_issue_coupons', {
          p_coupon_id: coupon_id,
          p_user_ids: userIds,
        })

        if (error) {
          // RPC 함수가 없으면 일반 배치 INSERT로 폴백
          if (error.code === '42883') { // function does not exist
            console.warn('RPC 함수가 없습니다. 일반 배치 INSERT로 처리합니다. (성능 저하 가능)')
            
            // 일반 배치 INSERT (중복은 에러 발생, 일부만 성공 가능)
            const userCouponsToInsert = batch.map(user => ({
              user_id: user.id,
              coupon_id: coupon_id,
              is_used: false,
            }))

            const { data: insertedData, error: insertError } = await supabase
              .from('user_coupons')
              .insert(userCouponsToInsert)
              .select('id')

            if (insertError) {
              // 중복 에러 발생 시, 실제 보유자 수 확인
              if (insertError.code === '23505') {
                const { count } = await supabase
                  .from('user_coupons')
                  .select('id', { count: 'exact', head: true })
                  .in('user_id', userIds)
                  .eq('coupon_id', coupon_id)
                  .eq('is_used', false)
                
                const totalExisting = count || 0
                const newlyInserted = Math.max(0, totalExisting - skipCount)
                successCount += newlyInserted
                skipCount = totalExisting
              } else {
                console.error(`배치 ${Math.floor(i / BATCH_SIZE) + 1} 처리 실패:`, insertError)
              }
            } else {
              // 성공 시 모두 삽입됨
              successCount += insertedData?.length || 0
            }
          } else {
            console.error(`배치 ${Math.floor(i / BATCH_SIZE) + 1} 처리 실패:`, error)
          }
        } else if (data && data.length > 0) {
          // RPC 함수 결과 사용
          successCount += data[0].inserted_count || 0
          skipCount += data[0].skipped_count || 0
        }
      } catch (err: any) {
        console.error(`배치 ${Math.floor(i / BATCH_SIZE) + 1} 처리 중 에러:`, err)
      }
    }

    return NextResponse.json({
      success: true,
      message: conditions 
        ? `조건에 맞는 ${targetUsers.length}명 중 ${successCount}명에게 쿠폰이 지급되었습니다. (${skipCount}명은 이미 보유)`
        : `총 ${allUsers.length}명 중 ${successCount}명에게 쿠폰이 지급되었습니다. (${skipCount}명은 이미 보유)`,
      stats: {
        total: allUsers.length,
        filtered: targetUsers.length,
        issued: successCount,
        skipped: skipCount,
      },
    })
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }
    console.error('쿠폰 일괄 지급 실패:', error)
    return NextResponse.json({ error: error.message || '서버 오류' }, { status: 500 })
  }
}

/**
 * 조건에 맞는 사용자 필터링
 */
async function filterUsersByConditions(
  supabase: any,
  users: any[],
  conditions: {
    birthday_month?: number
    min_purchase_amount?: number
    purchase_period_start?: string
    purchase_period_end?: string
    min_purchase_count?: number
  }
): Promise<any[]> {
  let filteredUsers = users

  // 생일 조건: 지정한 월에 생일인 사용자
  if (conditions.birthday_month) {
    const targetMonth = conditions.birthday_month
    
    // users 테이블에서 생일 정보 확인
    const { data: usersWithBirthday } = await supabase
      .from('users')
      .select('id, birthday')
      .not('birthday', 'is', null)

    if (usersWithBirthday && usersWithBirthday.length > 0) {
      const birthdayUserIds = usersWithBirthday
        .filter((u: any) => {
          if (!u.birthday) return false
          
          try {
            // birthday는 YYYY-MM-DD 형식 (생년이 없으면 1900-MM-DD로 저장됨)
            const birthday = new Date(u.birthday)
            
            // 유효한 날짜인지 확인
            if (isNaN(birthday.getTime())) return false
            
            // 월 추출 (0-based이므로 +1)
            const month = birthday.getMonth() + 1
            
            return month === targetMonth
          } catch (error) {
            console.error('생일 파싱 실패:', u.birthday, error)
            return false
          }
        })
        .map((u: any) => u.id)

      filteredUsers = filteredUsers.filter(u => birthdayUserIds.includes(u.id))
    } else {
      // 생일 정보가 없으면 조건에 맞는 사용자 없음
      filteredUsers = []
    }
  }

  // 구매 금액/횟수 조건
  if (conditions.min_purchase_amount || conditions.min_purchase_count) {
    const periodStart = conditions.purchase_period_start 
      ? new Date(conditions.purchase_period_start).toISOString()
      : null
    const periodEnd = conditions.purchase_period_end
      ? new Date(conditions.purchase_period_end).toISOString()
      : null

    // 각 사용자의 구매 이력 조회
    const userIds = filteredUsers.map(u => u.id)
    
    let ordersQuery = supabase
      .from('orders')
      .select('user_id, total_amount, created_at')
      .in('user_id', userIds)
      .eq('status', 'paid')  // 결제 완료된 주문만

    if (periodStart) {
      ordersQuery = ordersQuery.gte('created_at', periodStart)
    }
    if (periodEnd) {
      ordersQuery = ordersQuery.lte('created_at', periodEnd)
    }

    const { data: orders } = await ordersQuery

    if (orders) {
      // 사용자별 구매 금액/횟수 집계
      const userStats = new Map<string, { amount: number; count: number }>()
      
      orders.forEach((order: any) => {
        const stats = userStats.get(order.user_id) || { amount: 0, count: 0 }
        stats.amount += order.total_amount
        stats.count += 1
        userStats.set(order.user_id, stats)
      })

      // 조건에 맞는 사용자만 필터링
      filteredUsers = filteredUsers.filter(user => {
        const stats = userStats.get(user.id) || { amount: 0, count: 0 }
        
        if (conditions.min_purchase_amount && stats.amount < conditions.min_purchase_amount) {
          return false
        }
        if (conditions.min_purchase_count && stats.count < conditions.min_purchase_count) {
          return false
        }
        return true
      })
    } else {
      // 주문이 없으면 조건에 맞는 사용자 없음
      filteredUsers = []
    }
  }

  return filteredUsers
}

