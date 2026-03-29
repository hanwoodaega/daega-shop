export interface User {
  id: string
  email: string
  name: string
  phone: string
}

export interface UserPoints {
  user_id: string
  total_points: number
  purchase_count: number
}

export type PointType = 'purchase' | 'review'

export interface PointFormData {
  points: string
  pointType: PointType
  notificationTitle: string
  notificationContent: string
}

export interface SelectedUserSummary {
  id: string
  name: string
  totalPoints: number
}

