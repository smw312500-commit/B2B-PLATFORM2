import { useEffect, useState } from 'react';
import { getReleases, createRelease, completeRelease } from '../../api';

const ITEM_OPTIONS = [
  { value: 'WOOD_BR', label: '원목단추 브라운' },
  { value: 'WOOD_BK', label: '원목단추 블랙' },
  { value: 'PLASTIC_BK', label: '플라스틱단추 블랙' },
  { value: 'PLASTIC_WH', label: '플라스틱단추 화이트' },
  { value: 'METAL_SV', label: '금속단추 실버' },
  { value: 'METAL_BK', label: '금속단추 블랙' },
  { value: 'ZIPPER_S', label: '지퍼 소형' },
  { value: 'ZIPPER_M', label: '지퍼 중형' },
  { value: 'ZIPPER_L', label: '지퍼 대형' },
];

const MATERIAL_MAP = {
  WOOD_BR: '원목', WOOD_BK: '원목',
  PLASTIC_BK: '플라스틱', PLASTIC_WH: '플라스틱',
  METAL_SV: '금속', METAL_BK: '금속',
  ZIPPER_S: '조립', ZIPPER_M: '조립', ZIPPER_L: '조립',
};

const STATUS_BADGE = {
  생산중: 'bg-blue-100 text-blue-700',
  출고완료: 'bg-green-100 text-green-700',
};

const emptyForm = {
  label_code: '',
  item_name: 'WOOD_BR',
  release_qty: '',
  due_date: '',
};

export default function ReleaseTab() {
  const [releases, setReleases] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [completing, setCompleting] = useState(null);

  async function load() {
    const res = await getReleases();
    setReleases(res.data);
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    await createRelease({
      ...form,
      material: MATERIAL_MAP[form.item_name],
      release_qty: parseInt(form.release_qty),
      label_code: form.label_code || null,
      due_date: form.due_date || null,
    });
    setForm(emptyForm);
    setShowForm(false);
    load();
  }

  async function handleComplete(id) {
    if (!window.confirm('출고 완료 처리하시겠습니까?\n재고 차감 및 플랫폼 전송이 자동으로 실행됩니다.')) return;
    setCompleting(id);
    try {
      await completeRelease(id);
      load();
    } finally {
      setCompleting(null);
    }
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-gray-700">출고 현황</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700"
        >
          {showForm ? '닫기' : '+ 출고 등록'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">품목</label>
              <select
                className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                value={form.item_name}
                onChange={(e) => setForm({ ...form, item_name: e.target.value })}
              >
                {ITEM_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">출고량 (개)</label>
              <input
                type="number" min={1} required
                className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                value={form.release_qty}
                onChange={(e) => setForm({ ...form, release_qty: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                라벨코드 <span className="text-gray-400">(9자리, 선택)</span>
              </label>
              <input
                type="text" maxLength={9}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1 font-mono uppercase"
                placeholder="W3MJW01NV"
                value={form.label_code}
                onChange={(e) => setForm({ ...form, label_code: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">납기일</label>
              <input
                type="date" min={today}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" className="text-xs bg-indigo-600 text-white px-4 py-1.5 rounded hover:bg-indigo-700">
              등록
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-xs bg-gray-200 px-4 py-1.5 rounded">
              취소
            </button>
          </div>
        </form>
      )}

      <div className="overflow-auto rounded border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="text-left px-4 py-2">품목</th>
              <th className="text-left px-4 py-2">라벨코드</th>
              <th className="text-right px-4 py-2">출고량</th>
              <th className="text-left px-4 py-2">납기일</th>
              <th className="text-left px-4 py-2">출고일</th>
              <th className="text-left px-4 py-2">상태</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {releases.length === 0 && (
              <tr><td colSpan={7} className="text-center text-gray-400 py-6 text-xs">출고 내역 없음</td></tr>
            )}
            {releases.map((r) => {
              const itemLabel = ITEM_OPTIONS.find(o => o.value === r.item_name)?.label || r.item_name;
              const daysLeft = r.due_date ? Math.ceil((new Date(r.due_date) - new Date()) / 86400000) : null;
              return (
                <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{itemLabel}</td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-500">
                    {r.label_code || '-'}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.release_qty.toLocaleString()}</td>
                  <td className="px-4 py-2 text-xs">
                    {r.due_date ? (
                      <span className={daysLeft != null && daysLeft < 2 && r.status === '생산중' ? 'text-red-600 font-semibold' : 'text-gray-500'}>
                        {r.due_date}
                        {daysLeft != null && r.status === '생산중' && (
                          <span className="ml-1 text-gray-400">(D-{daysLeft})</span>
                        )}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-2 text-gray-400 text-xs">{r.release_date || '-'}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[r.status]}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {r.status === '생산중' && (
                      <button
                        onClick={() => handleComplete(r.id)}
                        disabled={completing === r.id}
                        className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {completing === r.id ? '처리 중...' : '완료'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
