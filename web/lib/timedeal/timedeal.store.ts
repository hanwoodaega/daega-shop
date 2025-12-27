'use client'

import { create } from 'zustand'
import { TimeDealData } from './timedeal.types'

interface TimeDealStore {
  // 상태
  timedealData: TimeDealData | null
  isLoading: boolean
  error: Error | null
  
  // 액션
  setInitialData: (data: TimeDealData | null) => void
  updateTimedealData: (data: TimeDealData | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: Error | null) => void
}

/**
 * 타임딜 상태 관리 스토어 (Zustand)
 * - 단일 소스 원칙: 모든 타임딜 상태를 여기서 관리
 * - 폴링은 별도의 훅에서 처리 (useTimeDealPolling)
 */
export const useTimeDealStore = create<TimeDealStore>((set) => ({
  timedealData: null,
  isLoading: false,
  error: null,
  
  setInitialData: (data) => set({ timedealData: data, error: null }),
  updateTimedealData: (data) => set({ timedealData: data, error: null }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}))

