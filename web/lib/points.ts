import { supabase, UserPoints, PointHistory } from './supabase'

/**
 * 포인트 적립 규칙
 */
export const pointRules = {
  purchase: (amount: number) => Math.floor(amount * 0.01), // 1% 적립
  review: 500,        // 리뷰 작성 시
}

/**
 * 사용자 포인트 조회
 */
export async function getUserPoints(userId: string): Promise<UserPoints | null> {
  try {
    const { data, error } = await supabase
      .from('user_points')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // 레코드가 없으면 초기화
        return await initializeUserPoints(userId)
      }
      throw error
    }

    return data
  } catch (error) {
    console.error('포인트 조회 실패:', error)
    return null
  }
}

/**
 * 사용자 포인트 초기화
 */
export async function initializeUserPoints(userId: string): Promise<UserPoints | null> {
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
    console.error('포인트 초기화 실패:', error)
    return null
  }
}

/**
 * 포인트 적립
 */
export async function addPoints(
  userId: string,
  points: number,
  type: 'purchase' | 'review',
  description: string,
  orderId?: string,
  reviewId?: string
): Promise<boolean> {
  try {
    // 사용자 포인트 조회 또는 초기화
    let userPoints = await getUserPoints(userId)
    if (!userPoints) {
      userPoints = await initializeUserPoints(userId)
      if (!userPoints) return false
    }

    // 포인트 적립
    const { error: updateError } = await supabase
      .from('user_points')
      .update({
        total_points: userPoints.total_points + points,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    if (updateError) throw updateError

    // 포인트 내역 기록
    const { error: historyError } = await supabase
      .from('point_history')
      .insert({
        user_id: userId,
        points: points,
        type: type,
        description: description,
        order_id: orderId || null,
        review_id: reviewId || null,
      })

    if (historyError) throw historyError

    // 구매 횟수 업데이트 (구매 시)
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
    console.error('포인트 적립 실패:', error)
    return false
  }
}

/**
 * 포인트 사용
 */
export async function usePoints(
  userId: string,
  points: number,
  orderId: string,
  description: string
): Promise<boolean> {
  try {
    const userPoints = await getUserPoints(userId)
    if (!userPoints || userPoints.total_points < points) {
      return false
    }

    // 포인트 차감
    const { error: updateError } = await supabase
      .from('user_points')
      .update({
        total_points: userPoints.total_points - points,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    if (updateError) throw updateError

    // 포인트 내역 기록
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
    console.error('포인트 사용 실패:', error)
    return false
  }
}

/**
 * 포인트 내역 조회
 */
export async function getPointHistory(
  userId: string,
  limit: number = 20
): Promise<PointHistory[]> {
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
    console.error('포인트 내역 조회 실패:', error)
    return []
  }
}

