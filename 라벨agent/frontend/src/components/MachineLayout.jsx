// MachineLayout - props 기반 (state는 ProductionTab에서 관리)
const STATUS = {
  가동중: { bg: 'bg-green-100', border: 'border-green-400', dot: 'bg-green-500', text: 'text-green-700', badge: 'bg-green-500' },
  대기중: { bg: 'bg-gray-100',  border: 'border-gray-300',  dot: 'bg-gray-400',  text: 'text-gray-500',  badge: 'bg-gray-400'  },
  점검중: { bg: 'bg-red-100',   border: 'border-red-400',   dot: 'bg-red-500',   text: 'text-red-700',   badge: 'bg-red-500'   },
  완료:   { bg: 'bg-blue-100',  border: 'border-blue-400',  dot: 'bg-blue-500',  text: 'text-blue-700',  badge: 'bg-blue-500'  },
}

function fmtDateTime(d) {
  if (!d) return '-'
  return new Date(d).toLocaleString('ko-KR', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
}

export default function MachineLayout({
  machines, releases = [],
  selected, onSelectToggle,
  onStart, onStop, onReset, onAssign, onStatusChange,
}) {
  const activeCount  = machines.filter((m) => m.status === '가동중').length
  const standbyCount = machines.filter((m) => m.status === '대기중').length
  const repairCount  = machines.filter((m) => m.status === '점검중').length
  const doneCount    = machines.filter((m) => m.status === '완료').length

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-semibold text-gray-700">기계 현황</span>
        {activeCount  > 0 && <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">가동 {activeCount}대</span>}
        {standbyCount > 0 && <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-medium">대기 {standbyCount}대</span>}
        {repairCount  > 0 && <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-medium">점검 {repairCount}대</span>}
        {doneCount    > 0 && <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">완료 {doneCount}대</span>}
        <span className="text-xs text-gray-400 ml-auto">기계 클릭 → 작업 설정</span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {machines.map((m) => {
          const s      = STATUS[m.status] ?? STATUS['대기중']
          const isOpen = selected === m.id
          const pct    = m.total > 0 ? Math.min((m.produced / m.total) * 100, 100) : 0
          const running = m.status === '가동중'
          const done    = m.status === '완료'

          return (
            <div key={m.id} className="relative">
              <div className={`rounded-2xl border-2 ${s.border} ${s.bg} p-5 transition-all ${running ? 'shadow-lg' : ''}`}>

                <div className="flex items-center justify-between mb-3">
                  <span className="text-base font-bold text-gray-800">{m.name}</span>
                  <span className={`w-3 h-3 rounded-full ${s.dot} ${running ? 'animate-pulse' : ''}`} />
                </div>

                <div
                  className="flex items-center justify-center h-24 rounded-xl border-2 border-inherit bg-white/70 mb-3 cursor-pointer hover:bg-white/90"
                  onClick={() => onSelectToggle(m.id)}
                >
                  <svg
                    className={`w-14 h-14 transition-all ${running ? 'text-green-500' : done ? 'text-blue-400' : m.status === '점검중' ? 'text-red-400' : 'text-gray-300'} ${running ? 'animate-spin' : ''}`}
                    style={running ? { animationDuration: '3s' } : {}}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="12" r="3" strokeWidth="2"/>
                    <path strokeWidth="2" strokeLinecap="round"
                      d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
                  </svg>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full text-white ${s.badge}`}>{m.status}</span>
                  {m.label_code && <span className="text-xs font-mono text-blue-600 truncate">{m.label_code}</span>}
                </div>

                {m.total > 0 ? (
                  <div className="mb-3 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className={`font-semibold ${done ? 'text-blue-600' : 'text-gray-700'}`}>
                        {Math.floor(m.produced).toLocaleString()} / {m.total.toLocaleString()}장
                      </span>
                      <span className="text-gray-400">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-white/70 rounded-full h-2 border border-gray-200">
                      <div className={`h-2 rounded-full transition-all ${done ? 'bg-blue-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                    {running && <p className="text-xs text-gray-400">약 {((m.total - m.produced) / 800).toFixed(1)}h 남음</p>}
                    <div className="space-y-0.5 pt-1">
                      {m.started_at  && <p className="text-xs text-gray-500">🕐 시작 {fmtDateTime(m.started_at)}</p>}
                      {m.finished_at && <p className="text-xs text-blue-600 font-medium">✅ 완료 {fmtDateTime(m.finished_at)}</p>}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 mb-3">작업 없음</p>
                )}

                <div className="flex gap-1.5">
                  {!done && m.total > 0 && !running && (
                    <button onClick={() => onStart(m.id)} className="flex-1 text-xs bg-green-600 text-white py-1.5 rounded-lg hover:bg-green-700 font-medium">▶ 시작</button>
                  )}
                  {running && (
                    <button onClick={() => onStop(m.id)} className="flex-1 text-xs bg-yellow-500 text-white py-1.5 rounded-lg hover:bg-yellow-600 font-medium">■ 정지</button>
                  )}
                  {(done || m.produced > 0) && (
                    <button onClick={() => onReset(m.id)} className="flex-1 text-xs bg-gray-200 text-gray-600 py-1.5 rounded-lg hover:bg-gray-300 font-medium">↺ 초기화</button>
                  )}
                  {m.total === 0 && !done && (
                    <button onClick={() => onSelectToggle(m.id)} className="flex-1 text-xs bg-blue-50 text-blue-600 py-1.5 rounded-lg hover:bg-blue-100 border border-blue-200 font-medium">+ 작업 할당</button>
                  )}
                </div>
              </div>

              {isOpen && (
                <div className="absolute left-0 top-full mt-2 z-20 bg-white border border-gray-200 rounded-xl shadow-2xl p-4 w-full space-y-3">
                  <p className="text-xs font-semibold text-gray-500">상태 변경</p>
                  <div className="flex gap-1.5">
                    {['대기중', '점검중'].map((st) => (
                      <button key={st} onClick={() => onStatusChange(m.id, st)}
                        className={`flex-1 text-xs py-1.5 rounded-lg border font-medium ${m.status === st ? `${STATUS[st].bg} ${STATUS[st].border} ${STATUS[st].text}` : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
                        {st}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs font-semibold text-gray-500">작업 할당</p>
                  <select value={m.label_code || ''} onChange={(e) => onAssign(m.id, e.target.value)}
                    className="w-full border rounded-lg px-2.5 py-1.5 text-sm">
                    <option value="">— 작업 없음 —</option>
                    {releases.map((r) => (
                      <option key={r.id} value={r.label_code}>
                        {r.label_code} ({r.release_qty.toLocaleString()}장)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
