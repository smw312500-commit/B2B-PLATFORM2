import { useEffect, useState } from 'react'
import { getDashboardSummary, getCollectedReleases } from '../../api'

function StatCard({ label, value, color }) {
  const colors = {
    blue:   'from-blue-500 to-blue-700',
    green:  'from-green-500 to-green-700',
    orange: 'from-orange-500 to-orange-600',
    purple: 'from-purple-500 to-purple-700',
  }
  return (
    <div className={`bg-gradient-to-br ${colors[color]} text-white rounded-xl p-4 shadow`}>
      <p className="text-xs opacity-80 mb-1">{label}</p>
      <p className="text-3xl font-bold">{value ?? '—'}</p>
    </div>
  )
}

function statusBadge(status) {
  const cls = status === '출고완료'
    ? 'bg-green-100 text-green-700'
    : 'bg-yellow-100 text-yellow-700'
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{status}</span>
}

export default function DashboardTab() {
  const [summary, setSummary] = useState(null)
  const [releases, setReleases] = useState([])

  useEffect(() => {
    getDashboardSummary().then(r => setSummary(r.data)).catch(() => {})
    getCollectedReleases().then(r => setReleases(r.data.slice(0, 20))).catch(() => {})
  }, [])

  return (
    <div className="space-y-5">
      {/* 숫자 카드 */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="수집된 출고건수" value={summary?.total_releases}    color="blue" />
        <StatCard label="출고완료"         value={summary?.completed_releases} color="green" />
        <StatCard label="배차 대기"        value={summary?.pending_dispatches} color="orange" />
        <StatCard label="인사이트"         value={summary?.active_insights}    color="purple" />
      </div>

      {/* 최근 출고 수집 목록 */}
      <div className="bg-white rounded-xl shadow">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">최근 출고 수집</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-100">
                <th className="px-4 py-2.5 text-left">회사명</th>
                <th className="px-4 py-2.5 text-left">품목</th>
                <th className="px-4 py-2.5 text-right">수량</th>
                <th className="px-4 py-2.5 text-left">납기일</th>
                <th className="px-4 py-2.5 text-left">상태</th>
                <th className="px-4 py-2.5 text-left">수집시각</th>
              </tr>
            </thead>
            <tbody>
              {releases.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400 text-xs">데이터 없음</td></tr>
              )}
              {releases.map(r => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5 font-medium">{r.company_name ?? `#${r.company_id}`}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{r.item_name ?? '—'}</td>
                  <td className="px-4 py-2.5 text-right">{r.quantity != null ? `${r.quantity} ${r.unit ?? ''}` : '—'}</td>
                  <td className="px-4 py-2.5 text-gray-500">{r.due_date ?? '—'}</td>
                  <td className="px-4 py-2.5">{statusBadge(r.status)}</td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs">
                    {r.collected_at ? r.collected_at.slice(0, 16).replace('T', ' ') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
