'use client'

import { useEffect } from 'react'
import { useTimeDealStore } from './timedeal.store'
import { fetchTimeDeal } from './timedeal.service'

// 전역 상태 관리 (단일 인스턴스 보장)
let globalTimeout: NodeJS.Timeout | null = null
let isWatcherActive = false
let visibilityHandler: (() => void) | null = null
let focusHandler: (() => void) | null = null
let currentLimit: number = 10 // 현재 사용 중인 limit
let pendingRecheck = false
let isRechecking = false

/**
 * 타임딜 상태 확인 훅
 * - 진입 시 1회 조회
 * - 종료 시각에 1회 재확인
 * - 탭 활성화/포커스 시 1회 재확인
 * - 전역 단일 인스턴스 보장
 * - 페이지별 limit 지원 (메인: 10, 전체 페이지: 30)
 * 
 * 사용법: 최상위 레이아웃이나 앱 컴포넌트에서 호출
 * pathname 기반으로 적절한 limit을 전달 (기본값: 10)
 */
export function useTimeDealPolling(limit: number = 10) {
  const { timedealData, updateTimedealData, setLoading, setError } = useTimeDealStore()

  useEffect(() => {
    // 클라이언트 사이드에서만 실행
    if (typeof window === 'undefined') {
      return
    }

    // limit이 변경되었으면 현재 limit 업데이트
    const limitChanged = currentLimit !== limit
    if (limitChanged) {
      currentLimit = limit
      if (globalTimeout) {
        clearTimeout(globalTimeout)
        globalTimeout = null
      }
      isWatcherActive = false
    }

    // 이미 활성화 중이면 중단 (중복 방지)
    if (isWatcherActive && !limitChanged) {
      return
    }
    isWatcherActive = true

    const scheduleEndRecheck = (endAt?: string | null) => {
      if (globalTimeout) {
        clearTimeout(globalTimeout)
        globalTimeout = null
      }

      if (!endAt) return

      const msUntilEnd = new Date(endAt).getTime() - Date.now()
      if (msUntilEnd <= 0) {
        pendingRecheck = true
        return
      }

      globalTimeout = setTimeout(() => {
        if (document.visibilityState === 'visible') {
          pendingRecheck = false
          recheckTimedeal('end')
        } else {
          pendingRecheck = true
        }
      }, msUntilEnd + 200)
    }

    const recheckTimedeal = async (reason: 'initial' | 'end' | 'visibility' | 'focus') => {
      if (isRechecking) return
      isRechecking = true
      try {
        setLoading(true)
        setError(null)

        const data = await fetchTimeDeal({ limit: currentLimit })
        
        if (data) {
          updateTimedealData(data)
          pendingRecheck = false
          scheduleEndRecheck(data.timedeal?.end_at || null)
        } else {
          updateTimedealData(null)
          scheduleEndRecheck(null)
        }
      } catch (error) {
        console.error('타임딜 상태 확인 실패:', error)
        setError(error as Error)
        // 에러 발생 시에도 기존 데이터 유지
      } finally {
        setLoading(false)
        isRechecking = false
      }
    }

    // 탭 활성화 상태에 따라 제어
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (pendingRecheck) {
          pendingRecheck = false
          recheckTimedeal('end')
          return
        }
        recheckTimedeal('visibility')
      }
    }

    visibilityHandler = handleVisibilityChange
    focusHandler = () => {
      recheckTimedeal('focus')
    }

    // 초기 1회 조회
    recheckTimedeal('initial')
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', focusHandler)

    return () => {
      // 컴포넌트 언마운트 시 정리
      // 하지만 전역 폴링은 계속 유지 (다른 컴포넌트가 사용 중일 수 있음)
      // 실제로는 모든 인스턴스가 언마운트될 때까지 폴링 유지
      // 완전 정리는 앱 종료 시에만 필요
    }
  }, [limit, updateTimedealData, setLoading, setError])
}

