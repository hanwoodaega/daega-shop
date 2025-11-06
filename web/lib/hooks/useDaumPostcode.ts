'use client'

import { useEffect } from 'react'

// Daum 우편번호 서비스 타입 정의
declare global {
  interface Window {
    daum: any
  }
}

const DAUM_POSTCODE_URL = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'

/**
 * Daum 우편번호 서비스 스크립트를 로드하는 훅
 */
export function useDaumPostcodeScript() {
  useEffect(() => {
    // 이미 로드되어 있는지 확인
    if (window.daum) {
      return
    }

    const script = document.createElement('script')
    script.src = DAUM_POSTCODE_URL
    script.async = true
    document.body.appendChild(script)

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])
}

/**
 * 주소 검색 완료 핸들러 타입
 */
export interface AddressSearchResult {
  zonecode: string
  address: string
  addressType: string
  bname?: string
  buildingName?: string
}

export type AddressSearchCallback = (data: AddressSearchResult) => void

/**
 * Daum 주소 검색을 실행하는 함수
 */
export function openDaumPostcode(onComplete: AddressSearchCallback) {
  if (!window.daum) {
    alert('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.')
    return
  }

  new window.daum.Postcode({
    oncomplete: function(data: AddressSearchResult) {
      // 사용자가 선택한 주소 정보
      let fullAddress = data.address // 기본 주소
      let extraAddress = '' // 참고 항목

      // 참고항목이 있는 경우 추가
      if (data.addressType === 'R') {
        if (data.bname) {
          extraAddress += data.bname
        }
        if (data.buildingName) {
          extraAddress += (extraAddress !== '' ? ', ' + data.buildingName : data.buildingName)
        }
        fullAddress += (extraAddress !== '' ? ' (' + extraAddress + ')' : '')
      }

      onComplete({
        ...data,
        address: fullAddress
      })
    }
  }).open()
}

