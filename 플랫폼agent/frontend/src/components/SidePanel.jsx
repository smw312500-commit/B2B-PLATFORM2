import { useEffect, useState } from 'react'
import { getInsights, getDispatches } from '../api'

export default function SidePanel() {
  const [insights, setInsights] = useState([])
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const load = async () => {
      try {
        const [iRes, dRes] = await Promise.all([getInsights(), getDispatches()])
        setInsights(iRes.data.slice(0, 3))
        setPendingCount(dRes.data.filter(d => d.status === '대기').length)
      } catch {}
    }
    load()
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [])

  const TYPE_CLS = {
    납기위험: 'bg-red-50 border-red-200 text-red-700',
    트렌드:   'bg-purple-50 border-purple-200 text-purple-700',
    물류최적화: 'bg-blue-50 border-blue-200 text-blue-700',
  }

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      {/* 배차 대기 현황 */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
        <p className="text-xs font-semibold text-orange-600 mb-1">배차 대기</p>
        <p className="text-2xl font-bold text-orange-700">{pendingCount}<span className="text-sm font-normal ml-1">건</span></p>
      </div>

      {/* 최근 인사이트 */}
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">최근 인사이트</p>
        {insights.length === 0 && (
          <p className="text-xs text-gray-400 italic">인사이트 없음</p>
        )}
        {insights.map(ins => (
          <div key={ins.id} className={`border rounded-lg p-2.5 mb-2 text-xs ${TYPE_CLS[ins.insight_type] || 'bg-gray-50 border-gray-200 text-gray-600'}`}>
            <div className="flex items-center gap-1 mb-1">
              <span className="font-semibold">{ins.insight_type}</span>
              {ins.related_code && (
                <span className="font-mono text-xs bg-white/60 px-1 rounded">{ins.related_code}</span>
              )}
            </div>
            <p className="leading-relaxed line-clamp-3">{ins.content}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
