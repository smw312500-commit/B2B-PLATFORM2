import { useEffect, useState } from 'react'
import { getStock, updateStock } from '../../services/api'

export default function StockTab() {
  const [stocks, setStocks] = useState([])
  const [editing, setEditing] = useState({})
  const [loading, setLoading] = useState(true)

  const fetchStock = async () => {
    try {
      const res = await getStock()
      setStocks(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStock() }, [])

  const handleEdit = (id, val) => setEditing((p) => ({ ...p, [id]: val }))

  const handleSave = async (id) => {
    await updateStock(id, editing[id])
    setEditing((p) => { const n = { ...p }; delete n[id]; return n })
    fetchStock()
  }

  const updatedAt = (s) =>
    s.updated_at ? new Date(s.updated_at).toLocaleString('ko-KR') : '-'

  return (
    <div>
      <h3 className="text-base font-semibold mb-4">재고 현황</h3>

      {loading ? (
        <p className="text-sm text-gray-400">불러오는 중...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-600 text-left">
                <th className="px-4 py-2 border">품목명</th>
                <th className="px-4 py-2 border">단위</th>
                <th className="px-4 py-2 border">현재 재고</th>
                <th className="px-4 py-2 border">최종 업데이트</th>
                <th className="px-4 py-2 border">수정</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border font-medium">{s.material_name}</td>
                  <td className="px-4 py-2 border text-gray-500">{s.unit}</td>
                  <td className="px-4 py-2 border">
                    {editing[s.id] !== undefined ? (
                      <input
                        type="number"
                        value={editing[s.id]}
                        onChange={(e) => handleEdit(s.id, e.target.value)}
                        className="border rounded px-2 py-1 w-28 text-sm"
                      />
                    ) : (
                      <span className={`font-semibold ${s.stock_qty <= (s.material_name === '라벨원단' ? 500 : 5) ? 'text-red-600' : 'text-gray-800'}`}>
                        {Number(s.stock_qty).toLocaleString()} {s.unit}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 border text-gray-400 text-xs">{updatedAt(s)}</td>
                  <td className="px-4 py-2 border">
                    {editing[s.id] !== undefined ? (
                      <div className="flex gap-2">
                        <button onClick={() => handleSave(s.id)} className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">저장</button>
                        <button onClick={() => setEditing((p) => { const n = { ...p }; delete n[s.id]; return n })} className="text-xs text-gray-500 hover:underline">취소</button>
                      </div>
                    ) : (
                      <button onClick={() => handleEdit(s.id, s.stock_qty)} className="text-xs text-blue-600 hover:underline">수정</button>
                    )}
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
