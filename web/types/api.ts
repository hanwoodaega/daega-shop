// API 응답 타입 정의

export interface ApiResponse<T = any> {
  data?: T
  error?: string
  details?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  page: number
  limit: number
  total: number
}

export interface ProductResponse {
  ok: boolean
  error?: string
}



