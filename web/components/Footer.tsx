export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* 회사 정보 */}
          <div>
            <h3 className="text-xl font-bold mb-4">대가 정육백화점</h3>
            <p className="text-gray-400 text-sm">
              신선하고 고품질의 정육을<br />
              합리적인 가격으로 제공합니다.
            </p>
          </div>

          {/* 고객센터 */}
          <div>
            <h4 className="font-semibold mb-4">고객센터</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>전화: 1588-0000</li>
              <li>운영시간: 09:00 - 18:00</li>
              <li>점심시간: 12:00 - 13:00</li>
              <li>주말/공휴일 휴무</li>
            </ul>
          </div>

          {/* 쇼핑 안내 */}
          <div>
            <h4 className="font-semibold mb-4">쇼핑 안내</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>배송 안내</li>
              <li>반품/교환 안내</li>
              <li>FAQ</li>
              <li>공지사항</li>
            </ul>
          </div>

          {/* 회사 정보 */}
          <div>
            <h4 className="font-semibold mb-4">회사 정보</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>회사명: (주)대가</li>
              <li>대표: 홍길동</li>
              <li>사업자등록번호: 000-00-00000</li>
              <li>통신판매업신고: 제0000-서울-0000호</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
          <p>&copy; 2024 대가 정육백화점. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

