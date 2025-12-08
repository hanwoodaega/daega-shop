import { toNumberOrNull } from './convert'
import { IssueConditions } from '../types'

export interface ValidatedConditions {
  phone?: string
  birthday_month?: number
  min_purchase_amount?: number
  purchase_period_start?: string
  purchase_period_end?: string
  min_purchase_count?: number
}

export interface ConditionValidationResult {
  isValid: boolean
  error?: string
  conditions?: ValidatedConditions
  hasCondition: boolean
}

/**
 * 조건별 쿠폰 지급 조건 검증 및 변환
 */
export function validateIssueConditions(
  issueConditions: IssueConditions
): ConditionValidationResult {
  const conditions: ValidatedConditions = {}
  let hasCondition = false

  // 전화번호 조건 (특정 개인 지급)
  if (issueConditions.phone) {
    // 숫자만 추출 (하이픈 제거)
    const phoneNumber = issueConditions.phone.replace(/[^0-9]/g, '')
    if (phoneNumber.length < 10 || phoneNumber.length > 11) {
      return { isValid: false, error: '올바른 전화번호를 입력해주세요.', hasCondition: false }
    }
    conditions.phone = phoneNumber
    hasCondition = true
  }

  // 생일 조건
  if (issueConditions.birthday_month) {
    const birthdayMonth = toNumberOrNull(issueConditions.birthday_month)
    if (birthdayMonth !== null && birthdayMonth >= 1 && birthdayMonth <= 12) {
      conditions.birthday_month = birthdayMonth
      hasCondition = true
    } else {
      return { isValid: false, error: '올바른 생일 월을 선택해주세요.', hasCondition: false }
    }
  }

  // 구매 금액/횟수 조건이 있으면 구매 기간이 필수
  const hasPurchaseAmount = !!issueConditions.min_purchase_amount
  const hasPurchaseCount = !!issueConditions.min_purchase_count
  const hasPurchasePeriod = !!(issueConditions.purchase_period_start && issueConditions.purchase_period_end)

  if (hasPurchaseAmount || hasPurchaseCount) {
    if (!hasPurchasePeriod) {
      return {
        isValid: false,
        error: '구매 금액/횟수 조건을 사용하려면 구매 기간(시작일, 종료일)을 모두 입력해주세요.',
        hasCondition: false,
      }
    }
  }

  // 구매 기간 검증
  if (issueConditions.purchase_period_start || issueConditions.purchase_period_end) {
    if (!issueConditions.purchase_period_start || !issueConditions.purchase_period_end) {
      return {
        isValid: false,
        error: '구매 기간의 시작일과 종료일을 모두 입력해주세요.',
        hasCondition: false,
      }
    }

    // 구매 기간 종료일이 시작일보다 이전이면 안 됨
    const startDate = new Date(issueConditions.purchase_period_start)
    const endDate = new Date(issueConditions.purchase_period_end)
    if (endDate < startDate) {
      return {
        isValid: false,
        error: '구매 기간 종료일은 시작일보다 이후여야 합니다.',
        hasCondition: false,
      }
    }

    conditions.purchase_period_start = startDate.toISOString()
    conditions.purchase_period_end = endDate.toISOString()
    hasCondition = true
  }

  // 구매 금액 조건
  if (hasPurchaseAmount) {
    const amount = toNumberOrNull(issueConditions.min_purchase_amount)
    if (amount !== null && amount > 0) {
      conditions.min_purchase_amount = amount
      hasCondition = true
    } else {
      return {
        isValid: false,
        error: '올바른 최소 구매 금액을 입력해주세요.',
        hasCondition: false,
      }
    }
  }

  // 구매 횟수 조건
  if (hasPurchaseCount) {
    const count = toNumberOrNull(issueConditions.min_purchase_count)
    if (count !== null && count > 0) {
      conditions.min_purchase_count = count
      hasCondition = true
    } else {
      return {
        isValid: false,
        error: '올바른 최소 구매 횟수를 입력해주세요.',
        hasCondition: false,
      }
    }
  }

  if (!hasCondition) {
    return { isValid: false, error: '최소 하나의 조건을 선택해주세요.', hasCondition: false }
  }

  return { isValid: true, conditions, hasCondition }
}

