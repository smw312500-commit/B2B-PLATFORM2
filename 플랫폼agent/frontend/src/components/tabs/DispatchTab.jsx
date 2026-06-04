import { useEffect, useState } from 'react'
import { getDispatches } from '../../api'

const STATUS_CLS = {
  대기:     'bg-gray-100 text-gray-600',
  배차완료: 'bg-blue-100 text-blue-700',
  운행중:   'bg-orange-100 text-orange-700',
  완료:     'bg-green-100 text-green-700',
}

export default function DispatchTab() {
  const [dispatches, setDispatches] = useState([])

  useEffect(() => {
    getDispatches().then(r => setDispatches(r.data)).catch(() => {})
  }, [])

  return (
    <div className="bg-white rounded-xl shadow">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">배차 현황</h2>
        <span className="text-xs text-gray-400">{dispatches.length}건</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 border-b border-gray-100">
              <th className="px-4 py-2.5 text-left">라벨코드</th>
              <th className="px-4 py-2.5 text-left">출발회사</th>
              <th className="px-4 py-2.5 text-left">도착지</th>
              <th className="px-4 py-2.5 text-left">픽업예정일</th>
              <th className="px-4 py-2.5 text-left">납기일</th>
              <th className="px-4 py-2.5 text-left">상태</th>
            </tr>
          </thead>
          <tbody>
            {dispatches.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400 text-xs">배차 데이터 없음</td></tr>
            )}
            {dispatches.map(d => (
              <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-2.5 font-mono text-xs">{d.label_code ?? '—'}</td>
                <td className="px-4 py-2.5">{d.company_name ?? `#${d.company_id}`}</td>
                <td className="px-4 py-2.5 text-gray-600">{d.destination ?? '—'}</td>
                <td className="px-4 py-2.5 text-gray-600">{d.pickup_date ?? '—'}</td>
                <td className="px-4 py-2.5 text-gray-600">{d.due_date ?? '—'}</td>
                <td className="px-4 py-2.5">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_CLS[d.status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {d.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
