'use client'

import { useSearchParams } from 'next/navigation'

export default function TossSandboxFailPage() {
  const searchParams = useSearchParams()
  const errorCode = searchParams.get('code')
  const errorMessage = searchParams.get('message')

  return (
    <div className="min-h-screen bg-white">
      <main className="w-full flex flex-col items-center px-6 py-6">
        <div className="w-full max-w-[540px] flex flex-col items-center">
          <img
            src="https://static.toss.im/lotties/error-spot-apng.png"
            width={120}
            height={120}
            alt="결제 실패"
          />
          <h2 className="mt-8 text-[24px] font-bold text-[#191f28]">결제를 실패했어요</h2>
          <div className="mt-[60px] flex w-full flex-col gap-4 text-[20px]">
            <div className="flex justify-between">
              <span className="text-[17px] font-semibold text-[#333d48]">code</span>
              <span className="text-[17px] text-[#4e5968]">{errorCode || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[17px] font-semibold text-[#333d48]">message</span>
              <span className="text-[17px] text-[#4e5968] text-right break-all">
                {errorMessage || '알 수 없는 오류'}
              </span>
            </div>
          </div>
          <div className="mt-8 flex w-full flex-col gap-4">
            <a
              className="w-full rounded-lg bg-[#f2f4f6] px-6 py-3 text-center text-[17px] font-semibold text-[#4e5968]"
              href="/sandbox/toss"
            >
              다시 테스트하기
            </a>
            <div className="flex w-full gap-4">
              <a
                className="w-full rounded-lg bg-[#f2f4f6] px-6 py-3 text-center text-[17px] font-semibold text-[#4e5968]"
                href="https://docs.tosspayments.com/reference/error-codes"
                target="_blank"
                rel="noreferrer noopener"
              >
                에러코드 문서보기
              </a>
              <a
                className="w-full rounded-lg bg-[#f2f4f6] px-6 py-3 text-center text-[17px] font-semibold text-[#4e5968]"
                href="https://techchat.tosspayments.com"
                target="_blank"
                rel="noreferrer noopener"
              >
                실시간 문의하기
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
