/**
 * draft(approved_not_persisted) 1건을 주문으로 확정하는 worker 엔드포인트.
 * - confirm에서 fire-and-forget으로 호출.
 * - production: CRON_SECRET + Bearer 필수 (`requireCronSecret`).
 */

import { NextRequest, NextResponse } from 'next/server'
import { persistDraftToOrder } from '@/lib/payments/toss-persist-order'
import { requireCronSecret } from '@/lib/auth/internal-job-auth'
import { API_ERROR_TEXT, apiJsonError, unknownErrorResponse } from '@/lib/api/api-errors'
import { parseJsonBody } from '@/lib/api/parse-json'
import { processDraftBodySchema } from '@/lib/validation/schemas/order-payment'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const denied = requireCronSecret(request)
    if (denied) return denied

    const parsed = await parseJsonBody(request, processDraftBodySchema)
    if (!parsed.ok) return parsed.response
    const orderId = parsed.data.orderId?.trim() || parsed.data.draftId?.trim()
    if (!orderId) {
      return apiJsonError(400, {
        error: API_ERROR_TEXT.validation,
        code: 'MISSING_ORDER_ID',
        detail: 'orderId 또는 draftId가 필요합니다.',
      })
    }

    const result = await persistDraftToOrder(orderId)
    if (result.ok) {
      return NextResponse.json({ success: true, orderId, order: result.order })
    }
    const isConflict = result.error === 'already_processing' || (result.error?.startsWith?.('invalid_status:') ?? false)
    if (!isConflict) {
      console.error('[process-draft] persist failed', result.error)
    }
    return NextResponse.json(
      {
        success: false,
        orderId,
        error: isConflict ? result.error : API_ERROR_TEXT.server,
      },
      { status: isConflict ? 409 : 500 }
    )
  } catch (e) {
    return unknownErrorResponse('payments/toss/process-draft', e)
  }
}
