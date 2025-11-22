'use client'

export default function GiftReceiveSuccessPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F7F3ED' }}>
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <div className="bg-white border-2 p-8" style={{ borderColor: '#D4C6A8' }}>
          <div>
            <div className="text-6xl mb-4">🎁</div>
            <h1 className="text-lg font-bold text-gray-800 mb-4">
              배송 정보가 정상적으로 접수되었습니다.
            </h1>
            <p className="text-sm text-gray-700 leading-relaxed">
              정성껏 준비해 안전하게 보내드리겠습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

