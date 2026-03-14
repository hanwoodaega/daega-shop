/**
 * 리뷰 사진 업로드 전 클라이언트에서 리사이즈·압축합니다.
 * 긴 변 1200px, JPEG 품질 0.82로 줄여 업로드 시간을 단축합니다.
 */

const MAX_LONG_SIDE = 1200
const JPEG_QUALITY = 0.82

export function compressReviewImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      resolve(file)
      return
    }
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const { width, height } = img
      let w = width
      let h = height
      if (width > MAX_LONG_SIDE || height > MAX_LONG_SIDE) {
        if (width >= height) {
          w = MAX_LONG_SIDE
          h = Math.round((height * MAX_LONG_SIDE) / width)
        } else {
          h = MAX_LONG_SIDE
          w = Math.round((width * MAX_LONG_SIDE) / height)
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(file)
        return
      }
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file)
            return
          }
          const name = file.name.replace(/\.[^.]+$/, '') || 'image'
          const out = new File([blob], `${name}.jpg`, { type: 'image/jpeg' })
          resolve(out)
        },
        'image/jpeg',
        JPEG_QUALITY
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }
    img.src = url
  })
}
