/**
 * 이미지 업로드 전 검증 유틸리티
 */

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_ASPECT_RATIO_TOLERANCE = 0.1 // 10% 허용 오차
const TARGET_ASPECT_RATIO = 1 // 1:1 비율

export interface ImageValidationResult {
  valid: boolean
  error?: string
}

/**
 * 파일 크기 검증
 */
export function validateFileSize(file: File): ImageValidationResult {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `파일 크기는 ${MAX_FILE_SIZE / 1024 / 1024}MB 이하여야 합니다.`,
    }
  }
  return { valid: true }
}

/**
 * 이미지 비율 검증
 */
export function validateImageAspectRatio(file: File): Promise<ImageValidationResult> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      const aspectRatio = img.naturalWidth / img.naturalHeight
      const ratioDiff = Math.abs(aspectRatio - TARGET_ASPECT_RATIO)

      if (ratioDiff > ALLOWED_ASPECT_RATIO_TOLERANCE) {
        resolve({
          valid: false,
          error: `이미지는 1:1 비율이어야 합니다. (현재: ${img.naturalWidth}x${img.naturalHeight})`,
        })
      } else {
        resolve({ valid: true })
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve({
        valid: false,
        error: '이미지를 불러올 수 없습니다.',
      })
    }

    img.src = url
  })
}

/**
 * 파일 타입 검증
 */
export function validateFileType(file: File): ImageValidationResult {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'JPEG, PNG, WebP 형식만 업로드 가능합니다.',
    }
  }
  return { valid: true }
}

/**
 * 종합 이미지 검증
 * 주의: 비율 검증은 제외 (서버에서 1:1로 자동 압축됨)
 */
export async function validateImage(file: File): Promise<ImageValidationResult> {
  // 1. 파일 타입 검증
  const typeResult = validateFileType(file)
  if (!typeResult.valid) {
    return typeResult
  }

  // 2. 파일 크기 검증
  const sizeResult = validateFileSize(file)
  if (!sizeResult.valid) {
    return sizeResult
  }

  // 3. 이미지 비율 검증은 제외
  // 서버에서 자동으로 1:1 비율로 압축되므로 클라이언트에서 검증하지 않음

  return { valid: true }
}

