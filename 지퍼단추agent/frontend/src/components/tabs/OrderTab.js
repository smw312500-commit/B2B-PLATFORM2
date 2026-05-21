import { useEffect, useState } from 'react';
import { getOrders, createOrder, receiveOrder } from '../../api';

const STATUS_BADGE = {
  대기중: 'bg-blue-100 text-blue-700',
  입고완료: 'bg-green-100 text-green-700',
  취소: 'bg-gray-100 text-gray-500',
};

const MATERIALS = ['원목', '플라스틱원료', '금속원료', '지퍼테이프'];

const emptyForm = {
  material_name: '원목',
  unit: 'kg',
  order_qty: '',
  supplier: '',
  order_date: new Date().toISOString().split('T')[0],
  due_date: '',
  note: '',
};

const UNIT_MAP = { 원목: 'kg', 플라스틱원료: 'kg', 금속원료: 'kg', 지퍼테이프: 'm' };

export default function OrderTab() {
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const res = await getOrders();
    setOrders(res.data);
  }

  useEffect(() => { load(); }, []);

  function handleMaterialChange(val) {
    setForm({ ...form, material_name: val, unit: UNIT_MAP[val] || 'kg' });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await createOrder({ ...form, order_qty: parseFloat(form.order_qty) });
    setForm(emptyForm);
    setShowForm(false);
    load();
  }

  async function handleReceive(id) {
    if (!window.confirm('입고 완료 처리하시겠습니까?')) return;
    await receiveOrder(id);
    load();
  }

  return (
    <div className="space-y-4">
      {/* 신규 발주 버튼 */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-gray-700">발주 현황</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700"
        >
          {showForm ? '닫기' : '+ 신규 발주'}
        </button>
      </div>

      {/* 발주 등록 폼 */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">원자재</label>
              <select
                className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                value={form.material_name}
                onChange={(e) => handleMaterialChange(e.target.value)}
              >
                {MATERIALS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">발주량 ({form.unit})</label>
              <input
                type="number" min={0} step="0.1" required
                className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                value={form.order_qty}
                onChange={(e) => setForm({ ...form, order_qty: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">발주처</label>
              <input
                type="text"
                className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                value={form.supplier}
                onChange={(e) => setForm({ ...form, supplier: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">발주일</label>
              <input
                type="date" required
                className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                value={form.order_date}
                onChange={(e) => setForm({ ...form, order_date: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">납기요청일</label>
              <input
                type="date"
                className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">비고</label>
              <input
                type="text"
                className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" className="text-xs bg-indigo-600 text-white px-4 py-1.5 rounded hover:bg-indigo-700">
              발주 등록
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-xs bg-gray-200 px-4 py-1.5 rounded">
              취소
            </button>
          </div>
        </form>
      )}

      {/* 발주 목록 */}
      <div className="overflow-auto rounded border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="text-left px-4 py-2">원자재</th>
              <th className="text-left px-4 py-2">발주처</th>
              <th className="text-right px-4 py-2">발주량</th>
              <th className="text-left px-4 py-2">발주일</th>
              <th className="text-left px-4 py-2">납기요청</th>
              <th className="text-left px-4 py-2">상태</th>
              <th className="text-left px-4 py-2">비고</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr><td colSpan={8} className="text-center text-gray-400 py-6 text-xs">발주 내역 없음</td></tr>
            )}
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-2 font-medium">{o.material_name}</td>
                <td className="px-4 py-2 text-gray-500">{o.supplier || '-'}</td>
                <td className="px-4 py-2 text-right tabular-nums">{parseFloat(o.order_qty).toLocaleString()} {o.unit}</td>
                <td className="px-4 py-2 text-gray-500">{o.order_date}</td>
                <td className="px-4 py-2 text-gray-500">{o.due_date || '-'}</td>
                <td className="px-4 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[o.status]}`}>{o.status}</span>
                </td>
                <td className="px-4 py-2 text-gray-400 text-xs">{o.note || '-'}</td>
                <td className="px-4 py-2 text-right">
                  {o.status === '대기중' && (
                    <button
                      onClick={() => handleReceive(o.id)}
                      className="text-xs bg-green-600 text-white px-2 py-0.5 rounded hover:bg-green-700"
                    >입고완료</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
