import { useRouter } from 'next/navigation'

export default function ProductHeader() {
  const router = useRouter()

  return (
    <header className="bg-white border-b border-neutral-200">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-neutral-500">관리자 대시보드</p>
          <h1 className="text-xl font-semibold text-neutral-900">상품 관리</h1>
        </div>
        <button
          onClick={() => router.push('/admin')}
          className="text-sm text-primary-800 hover:text-primary-900 font-medium"
        >
          ← 대시보드로 돌아가기
        </button>
      </div>
    </header>
  )
}

