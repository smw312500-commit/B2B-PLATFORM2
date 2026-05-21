import { useEffect, useState } from 'react'
import { getOrders, cancelOrder } from '../../services/api'

export default function CancelTab() {
  const [orders, setOrders] = useState([])
  const [canceling, setCanceling] = useState(null)

  const fetchOrders = async () => {
    const res = await getOrders()
    setOrders(res.data.filter((o) => o.status === '대기중'))
  }

  useEffect(() => { fetchOrders() }, [])

  const handleCancel = async (id) => {
    if (!confirm('이 발주를 취소하시겠습니까?')) return
    setCanceling(id)
    try {
      await cancelOrder(id)
      fetchOrders()
    } catch (err) {
      alert(err.response?.data?.detail || '취소 실패')
    } finally {
      setCanceling(null)
    }
  }

  return (
    <div>
      <h3 className="text-base font-semibold mb-4">발주 취소</h3>
      <p className="text-sm text-gray-500 mb-4">취소 가능한 발주 목록 (대기중 상태만 표시)</p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-600 text-left">
              <th className="px-4 py-2 border">발주처</th>
              <th className="px-4 py-2 border">품목</th>
              <th className="px-4 py-2 border">발주량</th>
              <th className="px-4 py-2 border">발주일</th>
              <th className="px-4 py-2 border">납기요청일</th>
              <th className="px-4 py-2 border">비고</th>
              <th className="px-4 py-2 border">취소</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-4 text-center text-gray-400">취소 가능한 발주 없음</td></tr>
            )}
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 border">{o.supplier || '-'}</td>
                <td className="px-4 py-2 border">{o.material_name}</td>
                <td className="px-4 py-2 border">{Number(o.order_qty).toLocaleString()}</td>
                <td className="px-4 py-2 border">{o.order_date}</td>
                <td className="px-4 py-2 border">{o.due_date}</td>
                <td className="px-4 py-2 border text-gray-400 text-xs">{o.note || '-'}</td>
                <td className="px-4 py-2 border">
                  <button
                    onClick={() => handleCancel(o.id)}
                    disabled={canceling === o.id}
                    className="text-xs bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 disabled:opacity-50"
                  >
                    {canceling === o.id ? '처리중...' : '취소'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
