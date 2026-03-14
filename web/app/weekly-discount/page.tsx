import { redirect } from 'next/navigation'

/** 기존 /weekly-discount 링크 호환용 → /collections/weekly_discount 로 리다이렉트 */
export default function WeeklyDiscountPage() {
  redirect('/collections/weekly_discount')
}
