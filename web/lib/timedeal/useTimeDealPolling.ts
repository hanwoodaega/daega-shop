'use client'

import { useEffect } from 'react'
import { useTimeDealStore } from './timedeal.store'
import { fetchTimeDeal } from './timedeal.service'

// 전역 폴링 상태 관리 (단일 인스턴스 보장)
let globalInterval: NodeJS.Timeout | null = null
let isPollingActive = false
let visibilityHandler: (() => void) | null = null

/**
 * 타임딜 폴링 훅
 * - 전역에서 단일 인스턴스만 실행 (전역 변수로 중복 방지)
 * - visibility 기반 제어
 * - 타임딜 종료 시 완전 중단
 * 
 * 사용법: 최상위 레이아웃이나 앱 컴포넌트에서 한 번만 호출
 * 여러 곳에서 호출해도 실제로는 하나의 폴링만 실행됨
 */
export function useTimeDealPolling() {
  const { timedealData, updateTimedealData, setLoading, setError } = useTimeDealStore()

  useEffect(() => {
    // 클라이언트 사이드에서만 실행
    if (typeof window === 'undefined') {
      return
    }

    // 이미 폴링 중이면 중단 (중복 방지)
    if (isPollingActive) {
      return
    }
    isPollingActive = true

    const checkTimedealStatus = async () => {
      try {
        setLoading(true)
        setError(null)

        const data = await fetchTimeDeal({ limit: 100 })
        
        if (data) {
          updateTimedealData(data)
        } else {
          // 타임딜 종료됨 - 완전 중단
          updateTimedealData(null)
          if (globalInterval) {
            clearInterval(globalInterval)
            globalInterval = null
          }
          isPollingActive = false
        }
      } catch (error) {
        console.error('타임딜 상태 확인 실패:', error)
        setError(error as Error)
        // 에러 발생 시에도 기존 데이터 유지
      } finally {
        setLoading(false)
      }
    }

    const startPolling = () => {
      // 이미 실행 중이면 중지
      if (globalInterval) {
        clearInterval(globalInterval)
      }
      
      // 즉시 한 번 체크 (페이지 활성화 시)
      checkTimedealStatus()
      
      // 그 다음부터 1분마다 체크
      globalInterval = setInterval(checkTimedealStatus, 60000)
    }

    const stopPolling = () => {
      if (globalInterval) {
        clearInterval(globalInterval)
        globalInterval = null
      }
    }

    // 탭 활성화 상태에 따라 제어
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // 탭이 활성화되면 다시 시작
        startPolling()
      } else {
        // 탭이 비활성화되면 중단
        stopPolling()
      }
    }

    visibilityHandler = handleVisibilityChange

    // 초기 폴링 시작
    startPolling()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      // 컴포넌트 언마운트 시 정리
      // 하지만 전역 폴링은 계속 유지 (다른 컴포넌트가 사용 중일 수 있음)
      // 실제로는 모든 인스턴스가 언마운트될 때까지 폴링 유지
      // 완전 정리는 앱 종료 시에만 필요
    }
  }, [updateTimedealData, setLoading, setError])
}

