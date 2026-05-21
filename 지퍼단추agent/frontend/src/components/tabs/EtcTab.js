const PRODUCTION_RULES = [
  { item: '원목단추',     rate: '20 개/시간/대', machines: 2, daily: '360 개/일', raw: '원목 1kg → 50개',      safe: '원목 50kg' },
  { item: '플라스틱단추', rate: '300 개/시간/대', machines: 2, daily: '5,400 개/일', raw: '플라스틱원료 1kg → 200개', safe: '플라스틱원료 100kg' },
  { item: '금속단추',     rate: '150 개/시간/대', machines: 2, daily: '2,700 개/일', raw: '금속원료 1kg → 150개', safe: '금속원료 80kg' },
  { item: '지퍼',         rate: '200 개/시간/대', machines: 2, daily: '3,600 개/일', raw: '지퍼테이프 1m → 1개',  safe: '지퍼테이프 200m' },
];

const ITEM_CODE_MAP = [
  { code: 'T', type: '티셔츠', parts: 'PLASTIC_** 단추' },
  { code: 'P', type: '바지',   parts: 'METAL_** 단추 또는 ZIPPER_S' },
  { code: 'J', type: '재킷',   parts: 'ZIPPER_M + METAL_** 단추' },
  { code: 'D', type: '다운',   parts: 'ZIPPER_L' },
];

export default function EtcTab() {
  return (
    <div className="space-y-6">
      {/* 생산속도 설정값 */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">생산속도 설정값</h3>
        <div className="overflow-auto rounded border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="text-left px-4 py-2">품목</th>
                <th className="text-left px-4 py-2">시간당 생산량</th>
                <th className="text-left px-4 py-2">기계 대수</th>
                <th className="text-left px-4 py-2">일 최대 생산량</th>
                <th className="text-left px-4 py-2">원자재 변환비율</th>
                <th className="text-left px-4 py-2">안전재고</th>
              </tr>
            </thead>
            <tbody>
              {PRODUCTION_RULES.map((r) => (
                <tr key={r.item} className="border-t border-gray-100">
                  <td className="px-4 py-2 font-medium">{r.item}</td>
                  <td className="px-4 py-2 tabular-nums text-gray-600">{r.rate}</td>
                  <td className="px-4 py-2 text-gray-600">{r.machines}대</td>
                  <td className="px-4 py-2 tabular-nums text-gray-600">{r.daily}</td>
                  <td className="px-4 py-2 text-gray-500 text-xs">{r.raw}</td>
                  <td className="px-4 py-2 text-gray-500 text-xs">{r.safe}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-1">* 일일 가동시간: 9시간 (09:00 ~ 18:00)</p>
      </section>

      {/* 라벨코드 매핑 */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">라벨코드 품목 매핑</h3>
        <div className="overflow-auto rounded border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="text-left px-4 py-2">품목코드 (4번째 자리)</th>
                <th className="text-left px-4 py-2">의류품목</th>
                <th className="text-left px-4 py-2">필요 부자재</th>
              </tr>
            </thead>
            <tbody>
              {ITEM_CODE_MAP.map((m) => (
                <tr key={m.code} className="border-t border-gray-100">
                  <td className="px-4 py-2 font-mono font-bold text-indigo-700">{m.code}</td>
                  <td className="px-4 py-2">{m.type}</td>
                  <td className="px-4 py-2 text-gray-600">{m.parts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 시스템 정보 */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">시스템 정보</h3>
        <div className="bg-gray-50 border border-gray-200 rounded p-4 text-xs text-gray-500 space-y-1">
          <p>Backend API: <span className="font-mono text-gray-700">http://localhost:8002</span></p>
          <p>DB 스키마: <span className="font-mono text-gray-700">company_zipper</span></p>
          <p>플랫폼 전송: 출고완료 시 자동 전송 (collected_release)</p>
          <p>트렌드 신호: 월 1회 집계 후 플랫폼 전송</p>
        </div>
      </section>
    </div>
  );
}
