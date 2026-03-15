import { IssueConditions } from '../_types'

export interface ValidatedConditions {
  phone?: string
}

export interface ConditionValidationResult {
  isValid: boolean
  error?: string
  conditions?: ValidatedConditions
  hasCondition: boolean
}

/** 전화번호로 특정 개인 지급 시 조건 검증 */
export function validateIssueConditions(
  issueConditions: IssueConditions
): ConditionValidationResult {
  const phoneNumber = (issueConditions.phone || '').replace(/[^0-9]/g, '')
  if (phoneNumber.length < 10 || phoneNumber.length > 11) {
    return { isValid: false, error: '올바른 전화번호를 입력해주세요. (10~11자리)', hasCondition: false }
  }
  return {
    isValid: true,
    conditions: { phone: phoneNumber },
    hasCondition: true,
  }
}
