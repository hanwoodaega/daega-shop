import { OrderWithItems } from './order-types'

export async function fetchOrders(): Promise<OrderWithItems[]> {
  const res = await fetch('/api/orders')

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || '주문 조회에 실패했습니다.')
  }

  const data = await res.json()
  return data.orders || []
}

export async function cancelOrder(orderId: string) {
  const response = await fetch('/api/orders/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || '주문 취소에 실패했습니다.')
  }

  return data
}

export async function confirmOrder(orderId: string) {
  const response = await fetch('/api/orders/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || '구매확정에 실패했습니다.')
  }

  return data
}


