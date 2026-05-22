import { useEffect, useState } from 'react'
import { getStock, deleteStockBulk } from '../../services/api'

export default function StockTab({ searched }) {
  const [stocks, setStocks]     = useState([])
  const [checked, setChecked]   = useState(new Set())
  const [deleting, setDeleting] = useState(false)
  const [loading, setLoading]   = useState(true)

  const fetchStock = async () => {
    try {
      const res = await getStock()
      setStocks(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStock() }, [])

  const toggleOne = (id) => {
    setChecked((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (checked.size === stocks.length) setChecked(new Set())
    else setChecked(new Set(stocks.map((s) => s.id)))
  }

  const handleDelete = async () => {
    if (checked.size === 0) return
    if (!confirm(`선택한 ${checked.size}건을 삭제하시겠습니까?`)) return
    setDeleting(true)
    try {
      await deleteStockBulk([...checked])
      setChecked(new Set())
      fetchStock()
    } catch (err) {
      alert(err.response?.data?.detail || '삭제 실패')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold">재고 현황</h3>
        {checked.size > 0 && (
          <button onClick={handleDelete} disabled={deleting}
            className="text-sm bg-red-500 text-white px-4 py-1.5 rounded hover:bg-red-600 disabled:opacity-50">
            {deleting ? '삭제 중...' : `선택 삭제 (${checked.size}건)`}
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">불러오는 중...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-600 text-left">
                <th className="px-3 py-2 border w-10">
                  <input type="checkbox"
                    checked={stocks.length > 0 && checked.size === stocks.length}
                    onChange={toggleAll}
                    className="cursor-pointer" />
                </th>
                <th className="px-4 py-2 border">품목명</th>
                <th className="px-4 py-2 border">단위</th>
                <th className="px-4 py-2 border">현재 재고</th>
                <th className="px-4 py-2 border">최종 업데이트</th>
              </tr>
            </thead>
            <tbody>
              {stocks.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-4 text-center text-gray-400">재고 데이터 없음</td></tr>
              )}
              {stocks.map((s) => (
                <tr key={s.id}
                  onClick={() => toggleOne(s.id)}
                  className={`cursor-pointer hover:bg-gray-50 ${checked.has(s.id) ? 'bg-red-50' : ''}`}>
                  <td className="px-3 py-2 border text-center">
                    <input type="checkbox" checked={checked.has(s.id)} onChange={() => toggleOne(s.id)}
                      onClick={(e) => e.stopPropagation()} className="cursor-pointer" />
                  </td>
                  <td className="px-4 py-2 border font-medium">{s.material_name}</td>
                  <td className="px-4 py-2 border text-gray-500">{s.unit}</td>
                  <td className="px-4 py-2 border">
                    <span className={`font-semibold ${Number(s.stock_qty) <= (s.material_name === '라벨원단' ? 500 : 5) ? 'text-red-600' : 'text-gray-800'}`}>
                      {Number(s.stock_qty).toLocaleString()} {s.unit}
                    </span>
                  </td>
                  <td className="px-4 py-2 border text-gray-400 text-xs">
                    {s.updated_at ? new Date(s.updated_at).toLocaleString('ko-KR') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
        안전재고 기준: 라벨원단 500m / 잉크 5통 이하 시 AI Agent 발주 권고 표시
      </div>
    </div>
  )
}
