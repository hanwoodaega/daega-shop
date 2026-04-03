import { supabase as browserSupabase, UserPoints, PointHistory } from '../supabase/supabase'
import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Point accrual rules
 */
export const pointRules = {
  purchase: (amount: number) => Math.floor(amount * 0.01), // 1% accrual
  review: 500,        // Upon review
}

/**
 * Get user points
 */
export async function getUserPoints(userId: string, client?: SupabaseClient): Promise<UserPoints | null> {
  const supabase = client || browserSupabase
  try {
    const { data, error } = await supabase
      .from('user_points')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Initialize if record doesn't exist
        return await initializeUserPoints(userId, client)
      }
      throw error
    }

    return data
  } catch (error) {
    console.error('Point lookup failed:', error)
    return null
  }
}

/**
 * Initialize user points
 */
export async function initializeUserPoints(userId: string, client?: SupabaseClient): Promise<UserPoints | null> {
  const supabase = client || browserSupabase
  try {
    const { data, error } = await supabase
      .from('user_points')
      .insert({
        user_id: userId,
        total_points: 0,
        purchase_count: 0,
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Point initialization failed:', error)
    return null
  }
}

/**
 * Add points
 */
export async function addPoints(
  userId: string,
  points: number,
  type: 'purchase' | 'review',
  description: string,
  orderId?: string,
  reviewId?: string,
  client?: SupabaseClient
): Promise<boolean> {
  const supabase = client || browserSupabase
  try {
    // Idempotency guard: prevent duplicate accrual for the same business event.
    if (type === 'review' && reviewId) {
      const { data: existingReviewPoint } = await supabase
        .from('point_history')
        .select('id')
        .eq('user_id', userId)
        .eq('type', 'review')
        .eq('review_id', reviewId)
        .maybeSingle()
      if (existingReviewPoint) {
        return true
      }
    }

    // Refund entries also use type='purchase', so only guard "purchase confirmation accrual" cases.
    if (type === 'purchase' && orderId && description.includes('구매확정 적립')) {
      const { data: existingPurchaseAccrual } = await supabase
        .from('point_history')
        .select('id')
        .eq('user_id', userId)
        .eq('type', 'purchase')
        .eq('order_id', orderId)
        .gte('points', 0)
        .like('description', '%구매확정 적립%')
        .maybeSingle()
      if (existingPurchaseAccrual) {
        return true
      }
    }

    let userPoints = await getUserPoints(userId, client)
    if (!userPoints) {
      userPoints = await initializeUserPoints(userId, client)
      if (!userPoints) return false
    }

    let didUpdateUserPoints = false
    // 포인트가 0보다 클 때만 user_points 업데이트
    // 하지만 point_history에는 항상 기록 (구매확정 기록을 위해)
    if (points > 0) {
      const { error: updateError } = await supabase
        .from('user_points')
        .update({
          total_points: userPoints.total_points + points,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)

      if (updateError) throw updateError
      didUpdateUserPoints = true
    }

    // point_history에는 항상 기록 (구매확정 기록을 위해 order_id 저장 필요)
    const historyPayload: any = {
      user_id: userId,
      points: points,
      type: type,
      description: description,
    }
    
    // order_id와 review_id는 명시적으로 설정
    // purchase 타입일 때는 order_id가 필수이므로 항상 설정
    if (orderId) {
      historyPayload.order_id = orderId
    } else if (type === 'purchase') {
      // purchase 타입인데 orderId가 없으면 에러
      console.error('Purchase type requires orderId:', {
        userId,
        points,
        type,
        description,
      })
      throw new Error('Purchase type requires orderId')
    }
    
    if (reviewId) {
      historyPayload.review_id = reviewId
    }

    const { error: historyError } = await supabase
      .from('point_history')
      .insert(historyPayload)
      .select('id, order_id, type')

    if (historyError) {
      // Best-effort compensation for race conditions where duplicate insert happened after point balance update.
      if ((historyError as any)?.code === '23505') {
        if (didUpdateUserPoints && points > 0) {
          await supabase
            .from('user_points')
            .update({
              total_points: Math.max(0, userPoints.total_points),
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId)
        }
        return true
      }
      console.error('Point history insert failed:', {
        error: historyError,
        payload: historyPayload,
      })
      throw historyError
    }


    if (type === 'purchase') {
      await supabase
        .from('user_points')
        .update({
          purchase_count: userPoints.purchase_count + 1,
        })
        .eq('user_id', userId)
    }

    return true
  } catch (error) {
    console.error('Point add failed:', error)
    return false
  }
}

/**
 * Use points
 */
export async function usePoints(
  userId: string,
  points: number,
  orderId: string,
  description: string,
  client?: SupabaseClient
): Promise<boolean> {
  const supabase = client || browserSupabase
  try {
    const userPoints = await getUserPoints(userId, client)
    if (!userPoints || userPoints.total_points < points) {
      return false
    }

    const { error: updateError } = await supabase
      .from('user_points')
      .update({
        total_points: userPoints.total_points - points,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    if (updateError) throw updateError

    const { error: historyError } = await supabase
      .from('point_history')
      .insert({
        user_id: userId,
        points: -points,
        type: 'usage',
        description: description,
        order_id: orderId,
      })

    if (historyError) throw historyError

    return true
  } catch (error) {
    console.error('Point usage failed:', error)
    return false
  }
}

/**
 * Deduct points
 */
export async function deductPoints(
  userId: string,
  points: number,
  orderId: string,
  description: string,
  client?: SupabaseClient
): Promise<boolean> {
  const supabase = client || browserSupabase
  try {
    const userPoints = await getUserPoints(userId, client)
    if (!userPoints) {
      return false
    }

    const { error: updateError } = await supabase
      .from('user_points')
      .update({
        total_points: Math.max(0, userPoints.total_points - points),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    if (updateError) throw updateError

    const { error: historyError } = await supabase
      .from('point_history')
      .insert({
        user_id: userId,
        points: -points,
        type: 'usage',
        description: description,
        order_id: orderId,
      })

    if (historyError) throw historyError

    return true
  } catch (error) {
    console.error('Point deduction failed:', error)
    return false
  }
}

/**
 * Refund points
 */
export async function refundPoints(
  userId: string,
  points: number,
  orderId: string,
  description: string,
  client?: SupabaseClient
): Promise<boolean> {
  try {
    return await addPoints(userId, points, 'purchase', description, orderId, undefined, client)
  } catch (error) {
    console.error('Point refund failed:', error)
    return false
  }
}

/**
 * Handle cancellation points
 */
function cancellationPointDescriptions(orderId: string, orderNumber?: string | null) {
  const ref = (orderNumber && String(orderNumber).trim()) || orderId.slice(0, 8)
  return {
    refund: `주문취소 #${ref} 포인트 환불`,
    deduction: `주문취소 #${ref} 적립 회수`,
    refundLegacy: `Order #${orderId} cancellation - point refund`,
    deductionLegacy: `Order #${orderId} cancellation - point deduction`,
  }
}

export async function handleOrderCancellationPoints(
  userId: string,
  orderId: string,
  finalAmount: number,
  usedPoints: number = 0,
  client?: SupabaseClient,
  orderNumber?: string | null
): Promise<{
  success: boolean
  status: 'success' | 'partial_failure' | 'failure'
  deducted: number
  refunded: number
  errors: Array<'POINT_DEDUCTION_FAILED' | 'POINT_REFUND_FAILED' | 'POINT_HISTORY_LOOKUP_FAILED'>
}> {
  try {
    const supabase = client || browserSupabase
    let deducted = 0
    let refunded = 0
    const errors: Array<'POINT_DEDUCTION_FAILED' | 'POINT_REFUND_FAILED' | 'POINT_HISTORY_LOOKUP_FAILED'> = []
    const desc = cancellationPointDescriptions(orderId, orderNumber)

    // 취소 시 차감은 "이 주문으로 실제 적립된 포인트"가 있을 때만 수행
    // (구매확정 전 취소에서는 적립 이력이 없으므로 차감하지 않음)
    const { data: earnedRows, error: earnedError } = await supabase
      .from('point_history')
      .select('points')
      .eq('user_id', userId)
      .eq('order_id', orderId)
      .eq('type', 'purchase')
      .gt('points', 0)

    if (earnedError) {
      errors.push('POINT_HISTORY_LOOKUP_FAILED')
      return {
        success: false,
        status: 'failure',
        deducted,
        refunded,
        errors,
      }
    }

    const actuallyEarned = (earnedRows || []).reduce((sum: number, row: any) => {
      const p = Number(row?.points || 0)
      return p > 0 ? sum + p : sum
    }, 0)

    if (actuallyEarned > 0) {
      // Idempotency: if cancellation deduction was already recorded, skip duplicate deduction.
      const { data: existingDeductionRows, error: existingDeductionError } = await supabase
        .from('point_history')
        .select('id')
        .eq('user_id', userId)
        .eq('order_id', orderId)
        .eq('type', 'usage')
        .lt('points', 0)
        .in('description', [desc.deduction, desc.deductionLegacy])
        .limit(1)

      if (existingDeductionError) {
        errors.push('POINT_HISTORY_LOOKUP_FAILED')
      } else if (existingDeductionRows && existingDeductionRows.length > 0) {
        deducted = actuallyEarned
      } else {
      const deductSuccess = await deductPoints(
        userId,
        actuallyEarned,
        orderId,
        desc.deduction,
        client
      )
      if (deductSuccess) {
        deducted = actuallyEarned
      } else {
        errors.push('POINT_DEDUCTION_FAILED')
      }
      }
    }

    if (usedPoints > 0) {
      // Idempotency: if cancellation refund was already recorded, skip duplicate refund.
      const { data: existingRefundRows, error: existingRefundError } = await supabase
        .from('point_history')
        .select('id')
        .eq('user_id', userId)
        .eq('order_id', orderId)
        .eq('type', 'purchase')
        .gt('points', 0)
        .in('description', [desc.refund, desc.refundLegacy])
        .limit(1)

      if (existingRefundError) {
        errors.push('POINT_HISTORY_LOOKUP_FAILED')
      } else if (existingRefundRows && existingRefundRows.length > 0) {
        refunded = usedPoints
      } else {
      const refundSuccess = await refundPoints(
        userId,
        usedPoints,
        orderId,
        desc.refund,
        client
      )
      if (refundSuccess) {
        refunded = usedPoints
      } else {
        errors.push('POINT_REFUND_FAILED')
      }
      }
    }

    const status = errors.length === 0
      ? 'success'
      : deducted > 0 || refunded > 0
        ? 'partial_failure'
        : 'failure'

    return {
      success: status === 'success',
      status,
      deducted,
      refunded,
      errors,
    }
  } catch (error) {
    console.error('Cancellation points handling failed:', error)
    return {
      success: false,
      status: 'failure',
      deducted: 0,
      refunded: 0,
      errors: ['POINT_HISTORY_LOOKUP_FAILED'],
    }
  }
}

/**
 * Get point history
 */
export async function getPointHistory(
  userId: string,
  limit: number = 20,
  client?: SupabaseClient
): Promise<PointHistory[]> {
  const supabase = client || browserSupabase
  try {
    const { data, error } = await supabase
      .from('point_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Point history lookup failed:', error)
    return []
  }
}

