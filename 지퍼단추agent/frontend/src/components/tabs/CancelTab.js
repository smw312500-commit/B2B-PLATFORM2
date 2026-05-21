import { useEffect, useState } from 'react';
import { getActiveOrders, cancelOrder } from '../../api';

export default function CancelTab() {
  const [orders, setOrders] = useState([]);

  async function load() {
    const res = await getActiveOrders();
    setOrders(res.data);
  }

  useEffect(() => { load(); }, []);

  async function handleCancel(id) {
    if (!window.confirm('이 발주를 취소하시겠습니까?')) return;
    await cancelOrder(id);
    load();
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">취소 가능한 발주</h3>

      <div className="overflow-auto rounded border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="text-left px-4 py-2">원자재</th>
              <th className="text-left px-4 py-2">발주처</th>
              <th className="text-right px-4 py-2">발주량</th>
              <th className="text-left px-4 py-2">발주일</th>
              <th className="text-left px-4 py-2">납기요청</th>
              <th className="text-left px-4 py-2">비고</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-gray-400 py-6 text-xs">
                  취소 가능한 발주 없음
                </td>
              </tr>
            )}
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-2 font-medium">{o.material_name}</td>
                <td className="px-4 py-2 text-gray-500">{o.supplier || '-'}</td>
                <td className="px-4 py-2 text-right tabular-nums">{parseFloat(o.order_qty).toLocaleString()} {o.unit}</td>
                <td className="px-4 py-2 text-gray-500">{o.order_date}</td>
                <td className="px-4 py-2 text-gray-500">{o.due_date || '-'}</td>
                <td className="px-4 py-2 text-gray-400 text-xs">{o.note || '-'}</td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => handleCancel(o.id)}
                    className="text-xs bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                  >
                    취소
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
