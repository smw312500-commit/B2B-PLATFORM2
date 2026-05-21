import { useEffect, useState, useCallback } from 'react'
import { getAgentStatus } from '../services/api'

export default function AgentPanel() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await getAgentStatus()
      setStatus(res.data)
    } catch {
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    const timer = setInterval(fetchStatus, 30_000)
    return () => clearInterval(timer)
  }, [fetchStatus])

  return (
    <div className="p-4 h-full flex flex-col gap-4">
      <h2 className="text-sm font-bold text-gray-700 border-b pb-2">AI Agent</h2>

      {/* 재고 현황 */}
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-2">원자재 재고</p>
        {loading ? (
          <p className="text-xs text-gray-400">불러오는 중...</p>
        ) : status ? (
          <div className="space-y-2">
            <StockBadge label="라벨원단" value={status.fabric_stock} unit="m" warn={status.fabric_stock <= 500} />
            <StockBadge label="잉크" value={status.ink_stock} unit="통" warn={status.ink_stock <= 5} />
          </div>
        ) : (
          <p className="text-xs text-red-500">서버 연결 오류</p>
        )}
      </div>

      {/* 납기 현황 */}
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-2">납기 현황</p>
        {status?.active_orders?.length === 0 && (
          <p className="text-xs text-gray-400">진행 중인 주문 없음</p>
        )}
        {status?.active_orders?.map((order) => (
          <OrderBadge key={order.id} order={order} />
        ))}
      </div>

      {/* 경고 / 지시사항 */}
      {status?.stock_warnings?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">AI 지시사항</p>
          <div className="space-y-1">
            {status.stock_warnings.map((w, i) => (
              <p key={i} className="text-xs bg-yellow-50 border border-yellow-200 rounded px-2 py-1 text-yellow-800">
                {w}
              </p>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={fetchStatus}
        className="mt-auto text-xs text-blue-600 hover:underline text-right"
      >
        새로고침
      </button>
    </div>
  )
}

function StockBadge({ label, value, unit, warn }) {
  return (
    <div className={`flex justify-between items-center rounded px-3 py-2 text-xs ${warn ? 'bg-red-50 border border-red-200' : 'bg-gray-50 border border-gray-200'}`}>
      <span className={warn ? 'text-red-700 font-medium' : 'text-gray-600'}>{label}</span>
      <span className={warn ? 'text-red-700 font-bold' : 'text-gray-800 font-medium'}>
        {value?.toLocaleString()} {unit}
        {warn && ' ⚠'}
      </span>
    </div>
  )
}

function OrderBadge({ order }) {
  const d = order.days_remaining
  const urgent = d < 2
  const warn = d < 5

  return (
    <div className={`rounded px-3 py-2 text-xs mb-1 border ${urgent ? 'bg-red-50 border-red-200' : warn ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'}`}>
      <div className="flex justify-between">
        <span className="font-mono font-bold">{order.label_code}</span>
        <span className={`font-bold ${urgent ? 'text-red-600' : warn ? 'text-yellow-700' : 'text-blue-600'}`}>
          D-{d}
        </span>
      </div>
      <div className="text-gray-500 mt-0.5">{order.release_qty.toLocaleString()}장 · 납기 {order.due_date}</div>
    </div>
  )
}
