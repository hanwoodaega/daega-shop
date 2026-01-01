import { TimeDealData } from './timedeal.types'

export interface FetchTimeDealParams {
  limit?: number
  signal?: AbortSignal
}

export async function fetchTimeDeal({
  limit = 30,
  signal,
}: FetchTimeDealParams = {}): Promise<TimeDealData | null> {
  const res = await fetch(`/api/timedeals?limit=${limit}`, {
    cache: 'no-store',
    signal,
  })

  if (!res.ok) {
    return null
  }

  const data = await res.json()
  if (data.timedeal && data.products && data.products.length > 0) {
    return data as TimeDealData
  }

  return null
}


