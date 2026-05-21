const RULES = [
  { label: '인쇄기 대수', value: '3대' },
  { label: '일일 가동시간', value: '9시간 (09:00 ~ 18:00)' },
  { label: '인쇄 속도', value: '800장 / 시간 (인쇄기 1대 기준)' },
  { label: '최대 일일 생산량', value: '21,600장 / 일 (3대 × 9h × 800)' },
  { label: '라벨원단 변환비율', value: '1m → 라벨 25장' },
  { label: '잉크 변환비율', value: '1통 → 라벨 10,000장' },
  { label: '라벨원단 안전재고', value: '500m' },
  { label: '잉크 안전재고', value: '5통' },
]

const LABEL_CODE_RULES = [
  { pos: '1번째', code: '브랜드코드', values: 'W = W브랜드' },
  { pos: '2번째', code: '계절코드', values: '1=봄 / 2=여름 / 3=가을 / 4=겨울' },
  { pos: '3번째', code: '성별코드', values: 'W=여성 / M=남성' },
  { pos: '4번째', code: '품목코드', values: 'T=티셔츠 / P=바지 / J=재킷 / D=다운' },
  { pos: '5번째', code: '원단코드', values: 'C=면 / P=폴리 / L=린넨 / W=울 / M=혼방' },
  { pos: '6~7번째', code: '스타일번호', values: '01 ~ 99' },
  { pos: '8~9번째', code: '컬러코드', values: 'BK=블랙 / WH=화이트 / NV=네이비 / GY=그레이 / BE=베이지 / RD=레드' },
]

export default function OtherTab() {
  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-base font-semibold mb-4">생산 설정값</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-600 text-left">
                <th className="px-4 py-2 border w-1/3">항목</th>
                <th className="px-4 py-2 border">설정값</th>
              </tr>
            </thead>
            <tbody>
              {RULES.map((r) => (
                <tr key={r.label} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border font-medium text-gray-700">{r.label}</td>
                  <td className="px-4 py-2 border text-gray-800">{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="text-base font-semibold mb-4">라벨코드 9자리 규칙</h3>
        <div className="bg-gray-800 text-green-300 font-mono text-sm rounded p-4 mb-4">
          W  3  M  J  W  0  1  N  V<br />
          │  │  │  │  │  │  │  └──┘<br />
          │  │  │  │  │  └──┘  컬러(2자리)<br />
          │  │  │  │  │  스타일번호(2자리)<br />
          │  │  │  │  원단코드<br />
          │  │  │  품목코드<br />
          │  │  성별코드<br />
          │  계절코드<br />
          브랜드코드
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-600 text-left">
                <th className="px-4 py-2 border">자리</th>
                <th className="px-4 py-2 border">코드명</th>
                <th className="px-4 py-2 border">유효값</th>
              </tr>
            </thead>
            <tbody>
              {LABEL_CODE_RULES.map((r) => (
                <tr key={r.pos} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border font-mono text-gray-600">{r.pos}</td>
                  <td className="px-4 py-2 border font-medium">{r.code}</td>
                  <td className="px-4 py-2 border text-gray-700">{r.values}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
          예시: <span className="font-mono font-bold">W3MJW01NV</span> = W브랜드 / 가을 / 남성 / 재킷 / 울 / 01스타일 / 네이비
        </div>
      </section>
    </div>
  )
}
