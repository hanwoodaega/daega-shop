import { supabase as browserSupabase, UserPoints, PointHistory } from './supabase'
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
    let userPoints = await getUserPoints(userId, client)
    if (!userPoints) {
      userPoints = await initializeUserPoints(userId, client)
      if (!userPoints) return false
    }

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

    const { error: historyError, data: insertedData } = await supabase
      .from('point_history')
      .insert(historyPayload)
      .select('id, order_id, type')

    if (historyError) {
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
export async function handleOrderCancellationPoints(
  userId: string,
  orderId: string,
  finalAmount: number,
  usedPoints: number = 0,
  client?: SupabaseClient
): Promise<{ success: boolean; deducted: number; refunded: number }> {
  try {
    let deducted = 0
    let refunded = 0

    const pointsEarned = Math.floor(finalAmount * 0.01)
    if (pointsEarned > 0) {
      const deductSuccess = await deductPoints(
        userId,
        pointsEarned,
        orderId,
        `Order #${orderId} cancellation - point deduction`,
        client
      )
      if (deductSuccess) {
        deducted = pointsEarned
      }
    }

    if (usedPoints > 0) {
      const refundSuccess = await refundPoints(
        userId,
        usedPoints,
        orderId,
        `Order #${orderId} cancellation - point refund`,
        client
      )
      if (refundSuccess) {
        refunded = usedPoints
      }
    }

    return {
      success: true,
      deducted,
      refunded,
    }
  } catch (error) {
    console.error('Cancellation points handling failed:', error)
    return {
      success: false,
      deducted: 0,
      refunded: 0,
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
